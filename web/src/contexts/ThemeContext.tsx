import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Theme,
  getTheme,
  getSemanticColors,
  defaultTheme,
  defaultMode,
} from "../config/themes";
import { useAuthStore } from "../store/authStore";
import { logger } from "../utils/logger";
import { authFetch } from "../utils/authFetch";

interface ThemeContextType {
  currentTheme: Theme;
  themeId: string;
  mode: "light" | "dark";
  setTheme: (themeId: string) => Promise<void>;
  setMode: (mode: "light" | "dark") => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "tavkit-theme";
const MODE_STORAGE_KEY = "tavkit-mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [themeId, setThemeId] = useState<string>(() => {
    // Load theme from localStorage on init
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        logger.debug("[ThemeProvider] Loaded theme from localStorage:", stored);
        // Verify the theme exists
        const theme = getTheme(stored);
        return theme.id;
      }
    } catch (error) {
      logger.error(
        "[ThemeProvider] Error loading theme from localStorage:",
        error,
      );
    }
    logger.debug("[ThemeProvider] Using default theme:", defaultTheme);
    return defaultTheme;
  });

  const [mode, setModeState] = useState<"light" | "dark">(() => {
    // Load mode from localStorage on init
    try {
      const stored = localStorage.getItem(MODE_STORAGE_KEY);
      if (stored && (stored === "light" || stored === "dark")) {
        logger.debug("[ThemeProvider] Loaded mode from localStorage:", stored);
        return stored as "light" | "dark";
      }
    } catch (error) {
      logger.error(
        "[ThemeProvider] Error loading mode from localStorage:",
        error,
      );
    }
    logger.debug("[ThemeProvider] Using default mode:", defaultMode);
    return defaultMode;
  });

  // Load theme preferences from backend when authenticated
  useEffect(() => {
    const loadThemeFromBackend = async () => {
      if (!isAuthenticated) {
        logger.debug(
          "[ThemeProvider] Not authenticated, skipping backend load",
        );
        return;
      }

      logger.debug(
        "[ThemeProvider] Authenticated, loading theme from backend...",
      );

      try {
        // Settings is a public endpoint, but we use authFetch for consistency
        const response = await authFetch("/api/v1/settings");

        logger.debug(
          "[ThemeProvider] Backend response status:",
          response.status,
        );

        if (response.ok) {
          const data = await response.json();
          logger.debug("[ThemeProvider] Backend settings data:", data);

          if (data.ui_settings) {
            const uiSettings =
              typeof data.ui_settings === "string"
                ? JSON.parse(data.ui_settings)
                : data.ui_settings;

            logger.debug("[ThemeProvider] Parsed ui_settings:", uiSettings);

            if (uiSettings.theme) {
              logger.debug(
                "[ThemeProvider] Loaded theme from backend:",
                uiSettings.theme,
              );
              setThemeId(uiSettings.theme);
              localStorage.setItem(THEME_STORAGE_KEY, uiSettings.theme);
            } else {
              logger.debug("[ThemeProvider] No theme field in ui_settings");
            }

            if (uiSettings.mode) {
              logger.debug(
                "[ThemeProvider] Loaded mode from backend:",
                uiSettings.mode,
              );
              setModeState(uiSettings.mode);
              localStorage.setItem(MODE_STORAGE_KEY, uiSettings.mode);
            } else {
              logger.debug("[ThemeProvider] No mode field in ui_settings");
            }
          } else {
            logger.debug("[ThemeProvider] No ui_settings in backend response");
          }
        } else {
          logger.error(
            "[ThemeProvider] Backend returned error:",
            response.status,
            await response.text(),
          );
        }
      } catch (error) {
        logger.error(
          "[ThemeProvider] Error loading theme from backend:",
          error,
        );
      }
    };

    loadThemeFromBackend();
  }, [isAuthenticated]);

  const currentTheme = getTheme(themeId);

  useEffect(() => {
    // Apply theme colors as CSS variables
    const root = document.documentElement;
    const semanticColors = getSemanticColors(currentTheme.palette, mode);

    root.style.setProperty("--color-darkest", semanticColors.darkest);
    root.style.setProperty("--color-dark", semanticColors.dark);
    root.style.setProperty("--color-panel", semanticColors.panel);
    root.style.setProperty("--color-primary", semanticColors.primary);
    root.style.setProperty("--color-primary-dark", semanticColors.primaryDark);
    root.style.setProperty(
      "--color-primary-light",
      semanticColors.primaryLight,
    );
    root.style.setProperty("--color-text", semanticColors.text);
    root.style.setProperty("--color-text-muted", semanticColors.textMuted);
    root.style.setProperty("--color-border", semanticColors.border);
    root.style.setProperty("--color-accent", semanticColors.accent);

    // Also update root background immediately
    root.style.backgroundColor = semanticColors.darkest;
    document.body.style.backgroundColor = semanticColors.darkest;
  }, [currentTheme, mode]);

  const setTheme = async (newThemeId: string) => {
    logger.debug("[ThemeProvider] Setting theme:", newThemeId);
    setThemeId(newThemeId);

    // Save to localStorage for immediate feedback
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newThemeId);
      logger.debug("[ThemeProvider] Theme saved to localStorage:", newThemeId);
    } catch (error) {
      logger.error(
        "[ThemeProvider] Error saving theme to localStorage:",
        error,
      );
    }

    // Save to backend if authenticated
    if (isAuthenticated) {
      try {
        // First get current settings
        const getResponse = await authFetch("/api/v1/settings");

        if (getResponse.ok) {
          const data = await getResponse.json();
          let uiSettings = data.ui_settings
            ? typeof data.ui_settings === "string"
              ? JSON.parse(data.ui_settings)
              : data.ui_settings
            : {};

          logger.debug(
            "[ThemeProvider] Current ui_settings before update:",
            JSON.stringify(uiSettings),
          );

          // Update theme in ui_settings
          uiSettings.theme = newThemeId;

          logger.debug(
            "[ThemeProvider] Updated ui_settings:",
            JSON.stringify(uiSettings),
          );

          // Prepare complete settings payload - backend expects ALL fields
          const payload = {
            registration_enabled: data.registration_enabled,
            ai_timeout_seconds: data.ai_timeout_seconds,
            ui_settings: uiSettings, // Send as object, not stringified
          };

          logger.debug(
            "[ThemeProvider] Sending PUT request with payload:",
            JSON.stringify(payload),
          );

          // Save back to backend
          const saveResponse = await authFetch("/api/v1/admin/settings", {
            method: "PUT",
            body: JSON.stringify(payload),
          });

          logger.debug(
            "[ThemeProvider] Save response status:",
            saveResponse.status,
          );

          if (saveResponse.ok) {
            const responseData = await saveResponse.json();
            logger.debug(
              "[ThemeProvider] Theme saved to backend successfully:",
              responseData,
            );
          } else {
            const errorText = await saveResponse.text();
            logger.error(
              "[ThemeProvider] Failed to save theme to backend:",
              saveResponse.status,
              errorText,
            );
          }
        }
      } catch (error) {
        logger.error("[ThemeProvider] Error saving theme to backend:", error);
      }
    }
  };

  const setMode = async (newMode: "light" | "dark") => {
    logger.debug("[ThemeProvider] Setting mode:", newMode);
    setModeState(newMode);

    // Save to localStorage
    try {
      localStorage.setItem(MODE_STORAGE_KEY, newMode);
      logger.debug("[ThemeProvider] Mode saved to localStorage:", newMode);
    } catch (error) {
      logger.error("[ThemeProvider] Error saving mode to localStorage:", error);
    }

    // Save to backend if authenticated
    if (isAuthenticated) {
      try {
        // First get current settings
        const getResponse = await authFetch("/api/v1/settings");

        if (getResponse.ok) {
          const data = await getResponse.json();
          let uiSettings = data.ui_settings
            ? typeof data.ui_settings === "string"
              ? JSON.parse(data.ui_settings)
              : data.ui_settings
            : {};

          // Update mode in ui_settings
          uiSettings.mode = newMode;

          // Prepare complete settings payload - backend expects ALL fields
          const payload = {
            registration_enabled: data.registration_enabled,
            ai_timeout_seconds: data.ai_timeout_seconds,
            ui_settings: uiSettings, // Send as object, not stringified
          };

          // Save back to backend
          const saveResponse = await authFetch("/api/v1/admin/settings", {
            method: "PUT",
            body: JSON.stringify(payload),
          });

          if (saveResponse.ok) {
            logger.debug("[ThemeProvider] Mode saved to backend:", newMode);
          } else {
            logger.error(
              "[ThemeProvider] Failed to save mode to backend:",
              await saveResponse.text(),
            );
          }
        }
      } catch (error) {
        logger.error("[ThemeProvider] Error saving mode to backend:", error);
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{ currentTheme, themeId, mode, setTheme, setMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
