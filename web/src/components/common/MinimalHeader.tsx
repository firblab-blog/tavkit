import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CampaignSwitcher from "./CampaignSwitcher";
import { useAuthStore } from "../../store/authStore";
import { useContextStore } from "../../store/contextStore";
import { useTheme } from "../../contexts/ThemeContext";
import { getThemeList, getSemanticColors } from "../../config/themes";
import Icon from "./Icon";
import { useQuickPanelStore } from "../../store/quickPanelStore";
import { useScrollHide } from "../../hooks/useScrollHide";

/**
 * MinimalHeader - Clean, simple header for the new portal-based navigation.
 *
 * Contains:
 * - Logo (click to go to current context home)
 * - Campaign switcher
 * - Quick search button (Cmd+K)
 * - User menu (theme, settings, logout)
 *
 * No tabs, no containers, no clutter.
 */
export default function MinimalHeader() {
  const { user, logout } = useAuthStore();
  const { userContext } = useContextStore();
  const { themeId, setTheme, mode, setMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themes = getThemeList();
  const { isVisible } = useScrollHide({ threshold: 10 });

  // Determine home based on URL path first (most reliable), then context store as fallback
  // This ensures clicking home from /dashboard/gm/characters goes to /dashboard/gm
  const getContextHome = () => {
    const path = location.pathname;

    // Determine context from current URL path (primary)
    if (path.startsWith("/dashboard/gm")) return "/dashboard/gm";
    if (path.startsWith("/dashboard/player")) return "/dashboard/player";
    if (path.startsWith("/dashboard/sandbox")) return "/dashboard/sandbox";

    // Fallback to stored context if URL doesn't indicate mode
    const contextType = userContext?.last_context_type;
    if (contextType === "gm_campaign") return "/dashboard/gm";
    if (contextType === "player_campaign") return "/dashboard/player";
    if (contextType === "library") return "/dashboard/sandbox";
    return "/dashboard"; // Fallback to landing
  };

  const handleHomeClick = () => {
    navigate(getContextHome());
  };

  const openSettings = () => {
    navigate("/dashboard/settings");
    setShowUserMenu(false);
  };

  const openUserManagement = () => {
    navigate("/dashboard/settings/users");
    setShowUserMenu(false);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 h-14 bg-background-panel border-b border-border flex items-center px-4 gap-4 z-40"
      style={{
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}
    >
      {/* Logo - Click to go home */}
      <button
        onClick={handleHomeClick}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        title="Home"
      >
        <img src="/tavkit-logo-small.svg" alt="TavKit" className="w-6 h-6" />
        <span className="font-bold text-lg hidden sm:inline">TavKit</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Quick Search Button - Hidden on mobile */}
      <button
        onClick={() => useQuickPanelStore.getState().open()}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-text-muted hover:text-text"
        title="Quick Search (Cmd+K)"
      >
        <Icon name="Search" className="w-4 h-4" />
        <span className="text-sm">Search</span>
        <kbd className="px-1.5 py-0.5 bg-background rounded text-xs">⌘K</kbd>
      </button>

      {/* Campaign Switcher */}
      <CampaignSwitcher />

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 px-3 py-2 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors"
        >
          <Icon name="Dice5" className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium hidden sm:inline">
            {user?.username}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setShowUserMenu(false);
                setShowThemeMenu(false);
              }}
            />
            <div className="absolute right-0 mt-2 w-56 bg-background-panel border border-border rounded-lg shadow-xl z-50">
              <div className="p-2">
                <div className="px-3 py-2 text-xs text-tavern-mauve">
                  {user?.email}
                </div>

                {/* Light/Dark Mode Toggle */}
                <div className="px-3 py-2 mt-2 border-t border-border">
                  <div className="text-xs text-tavern-mauve mb-2">
                    Appearance
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode("dark")}
                      className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 transition-colors ${
                        mode === "dark"
                          ? "bg-primary text-tavern-darkest"
                          : "bg-tavern-dark hover:bg-tavern-purple text-tavern-cream"
                      }`}
                    >
                      <Icon name="Moon" className="w-4 h-4" />
                      <span className="text-sm">Dark</span>
                    </button>
                    <button
                      onClick={() => setMode("light")}
                      className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 transition-colors ${
                        mode === "light"
                          ? "bg-primary text-tavern-darkest"
                          : "bg-tavern-dark hover:bg-tavern-purple text-tavern-cream"
                      }`}
                    >
                      <Icon name="Sun" className="w-4 h-4" />
                      <span className="text-sm">Light</span>
                    </button>
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-tavern-dark rounded flex items-center gap-2 transition-colors"
                  >
                    <Icon name="Palette" className="w-5 h-5" />
                    <span className="flex-1">Color Theme</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${showThemeMenu ? "-rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>

                  {/* Theme Flyout */}
                  {showThemeMenu && (
                    <div
                      className="absolute right-full mr-1 top-0 w-64 bg-background-panel border border-border rounded-lg shadow-xl max-h-96 overflow-y-auto"
                      onMouseEnter={() => setShowThemeMenu(true)}
                      onMouseLeave={() => setShowThemeMenu(false)}
                    >
                      <div className="p-2">
                        <div className="px-3 py-2 text-xs text-tavern-mauve border-b border-border mb-2">
                          Select a color palette
                        </div>
                        {themes.map((theme) => {
                          const colors = getSemanticColors(theme.palette, mode);
                          return (
                            <button
                              key={theme.id}
                              onClick={() => {
                                setTheme(theme.id);
                                setShowThemeMenu(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-tavern-dark rounded flex items-center gap-2 transition-colors ${
                                themeId === theme.id ? "bg-tavern-purple" : ""
                              }`}
                            >
                              <div className="flex gap-1">
                                <div
                                  className="w-4 h-4 rounded border border-border"
                                  style={{ backgroundColor: colors.darkest }}
                                />
                                <div
                                  className="w-4 h-4 rounded border border-border"
                                  style={{ backgroundColor: colors.primary }}
                                />
                                <div
                                  className="w-4 h-4 rounded border border-border"
                                  style={{ backgroundColor: colors.text }}
                                />
                              </div>
                              <span className="flex-1">{theme.name}</span>
                              {themeId === theme.id && (
                                <Icon
                                  name="Check"
                                  className="w-4 h-4 text-primary"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Settings (for admins) */}
                {user?.is_admin && (
                  <>
                    <button
                      onClick={openSettings}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-tavern-dark rounded flex items-center gap-2 transition-colors"
                    >
                      <Icon name="Settings" className="w-5 h-5" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={openUserManagement}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-tavern-dark rounded flex items-center gap-2 transition-colors"
                    >
                      <Icon name="Users" className="w-5 h-5" />
                      <span>Manage Users</span>
                    </button>
                  </>
                )}

                {/* Logout */}
                <div className="border-t border-border mt-2 pt-2">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-tavern-dark rounded flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
