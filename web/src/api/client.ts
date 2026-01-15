import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

// Helper to get CSRF token from cookie
function getCSRFToken(): string | null {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Enable sending cookies with cross-origin requests
  withCredentials: true,
});

// Add CSRF token to state-changing requests
apiClient.interceptors.request.use((config) => {
  // Add CSRF token for non-GET requests
  if (
    config.method &&
    !["get", "head", "options"].includes(config.method.toLowerCase())
  ) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return config;
});

// Handle 401 and 403 CSRF errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath === "/login" || currentPath === "/register";

    if (error.response?.status === 401) {
      // Don't redirect if we're already on login/register pages
      // or if this is a session validation request (let the caller handle it)
      const isValidationRequest = error.config?.url?.includes("/users/me");

      if (!isAuthPage && !isValidationRequest) {
        // Redirect to login for other 401 errors
        window.location.href = "/login";
      }
    }

    // Handle invalid CSRF token - user's session is stale, force re-login
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.error || "";
      if (errorMessage.toLowerCase().includes("csrf")) {
        // Clear auth state from localStorage
        localStorage.removeItem("auth-storage");

        if (!isAuthPage) {
          // Redirect to login
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
