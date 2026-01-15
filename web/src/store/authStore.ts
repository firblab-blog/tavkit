import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "../api/client";
import { logger } from "../utils/logger";
import { getRandomHonorific } from "../utils/honorifics";

interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string | null;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  csrfToken: string | null;
  honorific: string | null;
  isAuthenticated: boolean;
  isValidating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  refreshCSRF: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      csrfToken: null,
      honorific: null,
      isAuthenticated: false,
      isValidating: false,

      login: async (email: string, password: string) => {
        try {
          const response = await apiClient.post("/auth/login", {
            email,
            password,
          });
          const { user, csrf_token } = response.data;
          // JWT is now stored in HttpOnly cookie automatically
          // We only store user info, CSRF token, and a fun honorific in state
          const honorific = getRandomHonorific();
          set({
            user,
            csrfToken: csrf_token,
            honorific,
            isAuthenticated: true,
          });
          logger.debug(
            "[authStore] Login successful, CSRF token received, honorific:",
            honorific,
          );
        } catch (error) {
          logger.error("[authStore] Login failed:", error);
          throw new Error("Login failed");
        }
      },

      register: async (username: string, email: string, password: string) => {
        try {
          const response = await apiClient.post("/auth/register", {
            username,
            email,
            password,
          });
          const { user, csrf_token } = response.data;
          // JWT is now stored in HttpOnly cookie automatically
          const honorific = getRandomHonorific();
          set({
            user,
            csrfToken: csrf_token,
            honorific,
            isAuthenticated: true,
          });
          logger.debug(
            "[authStore] Registration successful, CSRF token received, honorific:",
            honorific,
          );
        } catch (error) {
          logger.error("[authStore] Registration failed:", error);
          throw new Error("Registration failed");
        }
      },

      logout: async () => {
        try {
          // Call logout endpoint to clear cookies server-side
          await apiClient.post("/auth/logout");
        } catch (error) {
          logger.warn("[authStore] Logout API call failed:", error);
          // Continue with local cleanup even if API fails
        }
        // Clear local state
        set({
          user: null,
          csrfToken: null,
          honorific: null,
          isAuthenticated: false,
        });
        logger.debug("[authStore] Logged out");
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      refreshCSRF: async () => {
        try {
          const response = await apiClient.post("/auth/csrf/refresh");
          const { csrf_token } = response.data;
          set({ csrfToken: csrf_token });
          logger.debug("[authStore] CSRF token refreshed");
        } catch (error) {
          logger.error("[authStore] Failed to refresh CSRF token:", error);
          // If refresh fails, user may need to re-login
          if (get().isAuthenticated) {
            set({ user: null, csrfToken: null, isAuthenticated: false });
          }
        }
      },

      validateSession: async () => {
        // Don't validate if not marked as authenticated
        if (!get().isAuthenticated) {
          return false;
        }

        // Prevent multiple simultaneous validations
        if (get().isValidating) {
          return get().isAuthenticated;
        }

        set({ isValidating: true });
        logger.debug("[authStore] Validating session...");

        try {
          // Try to fetch current user - this validates the auth cookie
          const response = await apiClient.get("/users/me");
          if (response.status === 200 && response.data) {
            // Session is valid, update user data
            set({
              user: response.data,
              isAuthenticated: true,
              isValidating: false,
            });
            logger.debug("[authStore] Session validated successfully");
            return true;
          }
        } catch (error) {
          logger.warn("[authStore] Session validation failed:", error);
        }

        // Session is invalid, clear auth state
        set({
          user: null,
          csrfToken: null,
          honorific: null,
          isAuthenticated: false,
          isValidating: false,
        });
        logger.debug("[authStore] Session invalid, cleared auth state");
        return false;
      },
    }),
    {
      name: "auth-storage",
      // Persist user info and honorific, not CSRF token (comes from cookie)
      partialize: (state) => ({
        user: state.user,
        honorific: state.honorific,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Auto-validate session on page load if localStorage says we're authenticated
// This runs after store is rehydrated from localStorage
if (typeof window !== "undefined") {
  // Small delay to ensure store is fully initialized
  setTimeout(() => {
    const state = useAuthStore.getState();
    if (state.isAuthenticated) {
      logger.debug(
        "[authStore] Page load with isAuthenticated=true, validating session...",
      );
      state.validateSession();
    }
  }, 100);
}
