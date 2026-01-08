import { useContainerStore } from '../../store/containerStore'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import CampaignSwitcher from './CampaignSwitcher'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../contexts/ThemeContext'
import { getThemeList, getSemanticColors } from '../../config/themes'
import Icon from './Icon'
import { ToolbarPosition, useUISettingsStore } from '../../store/uiSettingsStore'

interface TopBarProps {
  position?: ToolbarPosition
}

export default function TopBar({ position = 'top' }: TopBarProps) {
  const {
    containers,
    activeId,
    setActive,
    closeContainer,
    closeAllContainers,
    moveContainer,
    openContainer,
  } = useContainerStore()
  const { user, logout } = useAuthStore()
  const { themeId, setTheme, mode, setMode } = useTheme()
  const { density } = useUISettingsStore()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showOverflowMenu, setShowOverflowMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    containerId: string
  } | null>(null)
  const [visibleTabCount, setVisibleTabCount] = useState(containers.length)
  const tabContainerRef = useRef<HTMLDivElement>(null)
  const overflowButtonRef = useRef<HTMLButtonElement>(null)
  const themes = getThemeList()

  // Layout variables - needed early for useEffect dependencies
  const isVertical = position === 'left' || position === 'right'
  const isCompact = density === 'compact'

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  // Calculate visible tabs based on available width (only for horizontal layout)
  useEffect(() => {
    if (isVertical) {
      setVisibleTabCount(containers.length)
      return
    }

    const calculateVisibleTabs = () => {
      if (!tabContainerRef.current) return

      const containerWidth = tabContainerRef.current.offsetWidth

      // Use measurement divs to get accurate widths of ALL tabs
      const measureElements = tabContainerRef.current.querySelectorAll('[data-tab-measure]')

      if (measureElements.length === 0 || containers.length === 0) {
        setVisibleTabCount(containers.length)
        return
      }

      // Calculate total width of all tabs
      let totalTabWidth = 0
      const tabWidths: number[] = []

      for (const measureEl of Array.from(measureElements)) {
        const width = (measureEl as HTMLElement).offsetWidth + 8 // Add gap spacing
        tabWidths.push(width)
        totalTabWidth += width
      }

      // If all tabs fit without overflow button, show them all
      if (totalTabWidth <= containerWidth) {
        setVisibleTabCount(containers.length)
        return
      }

      // Otherwise, calculate how many tabs fit with the overflow button
      const overflowButtonWidth = isCompact ? 80 : 100
      const availableWidth = containerWidth - overflowButtonWidth

      let usedWidth = 0
      let count = 0

      for (const width of tabWidths) {
        if (usedWidth + width <= availableWidth) {
          usedWidth += width
          count++
        } else {
          break
        }
      }

      // Ensure at least one tab is visible
      setVisibleTabCount(Math.max(1, count))
    }

    // Use a small delay to ensure tabs are rendered before measuring
    const timeoutId = setTimeout(calculateVisibleTabs, 0)

    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleTabs()
    })

    if (tabContainerRef.current) {
      resizeObserver.observe(tabContainerRef.current)
    }

    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [containers.length, isCompact, isVertical, containers])

  const openSettings = () => {
    openContainer({
      type: 'settings',
      tool: 'settings',
      title: 'Settings',
    })
    setShowUserMenu(false)
  }

  const openUserManagement = () => {
    openContainer({
      type: 'settings',
      tool: 'user-management',
      title: 'Manage Users',
    })
    setShowUserMenu(false)
  }

  // Layout classes based on toolbar position
  const baseClasses = 'bg-background-panel text-tavern-cream border-border shadow-lg'

  const layoutClasses = isVertical
    ? `h-full flex flex-col ${isCompact ? 'py-2 px-1' : 'py-4 px-2'} gap-${isCompact ? '2' : '3'} border-r`
    : `${isCompact ? 'h-12' : 'h-14'} flex items-center px-4 gap-3 border-b`

  const containerClasses = isVertical
    ? 'flex-1 flex flex-col gap-2 overflow-y-auto'
    : 'flex-1 flex gap-2 overflow-hidden py-2'

  const handleContextMenu = (e: React.MouseEvent, containerId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, containerId })
  }

  const containerIndex = (id: string) => containers.findIndex((c) => c.id === id)

  const handleHomeClick = () => {
    // Navigate to dashboard home and clear active selection
    navigate('/dashboard')
    setActive(null)
  }

  return (
    <div className={`${baseClasses} ${layoutClasses}`}>
      {/* Mobile Layout (< 768px) */}
      <div className="md:hidden flex items-center justify-between w-full px-4 h-14">
        {/* Logo - Left */}
        <button
          onClick={handleHomeClick}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="Home Dashboard"
        >
          <img src="/tavkit-logo-small.svg" alt="TavKit" className="w-6 h-6" />
          <span className="font-bold text-base">Tavkit</span>
        </button>

        {/* Campaign Name - Center */}
        <div className="flex-1 flex justify-center px-4">
          <CampaignSwitcher />
        </div>

        {/* Hamburger Menu - Right */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="flex items-center justify-center w-10 h-10 hover:bg-tavern-dark rounded-lg transition-colors"
          title="Menu"
        >
          {showMobileMenu ? (
            <Icon name="X" className="w-6 h-6" />
          ) : (
            <Icon name="DotsThree" className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Desktop Layout (>= 768px) */}
      <button
        onClick={handleHomeClick}
        className={`hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity ${isVertical ? 'flex-col text-center mb-2' : 'mr-4'}`}
        title="Home Dashboard"
      >
        <img src="/tavkit-logo-small.svg" alt="TavKit" className="w-6 h-6" />
        <span className={`font-bold ${isVertical ? 'text-sm' : 'text-lg'}`}>Tavkit</span>
      </button>

      {/* Kits - our workspace containers with different tools (Desktop only) */}
      <div className={`hidden md:flex ${containerClasses}`} ref={tabContainerRef}>
        {/* Hidden container with all tabs for measurement */}
        <div className="absolute invisible pointer-events-none flex gap-2" aria-hidden="true">
          {containers.map((c) => (
            <div
              key={`measure-${c.id}`}
              data-tab-measure
              className={`${isCompact ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg text-sm flex items-center gap-2 whitespace-nowrap`}
            >
              <span>{c.title}</span>
              <div className="w-4 h-4" />
            </div>
          ))}
        </div>

        {/* Visible tabs */}
        {containers.slice(0, visibleTabCount).map((c) => (
          <button
            key={c.id}
            data-tab
            onClick={() => setActive(c.id)}
            onContextMenu={(e) => handleContextMenu(e, c.id)}
            className={`${isCompact ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
              isVertical ? 'w-full justify-between' : ''
            } ${
              c.id === activeId
                ? 'bg-primary text-tavern-darkest shadow-lg'
                : 'bg-tavern-dark hover:bg-tavern-purple text-tavern-cream'
            }`}
          >
            <span className={isVertical ? 'truncate' : ''}>{c.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeContainer(c.id)
              }}
              className="opacity-60 hover:opacity-100 hover:text-red-400 transition-all flex-shrink-0"
              title="Close tab"
            >
              <Icon name="X" className="w-4 h-4" />
            </button>
          </button>
        ))}
      </div>

      {/* Overflow Menu Button - positioned next to CampaignSwitcher (Desktop only) */}
      {!isVertical && visibleTabCount < containers.length && (
        <div className="hidden md:block relative">
          <button
            ref={overflowButtonRef}
            onClick={(e) => {
              e.stopPropagation()
              setShowOverflowMenu(!showOverflowMenu)
            }}
            className={`${isCompact ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg text-sm flex items-center gap-2 whitespace-nowrap transition-all bg-tavern-dark hover:bg-tavern-purple text-tavern-cream`}
            title={`${containers.length - visibleTabCount} more tabs`}
          >
            <Icon name="DotsThree" className="w-4 h-4" />
            <span className="text-xs bg-primary text-tavern-darkest rounded-full px-2 py-0.5 font-semibold">
              {containers.length - visibleTabCount}
            </span>
          </button>

          {/* Overflow Dropdown Menu - positioned directly below button */}
          {showOverflowMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowOverflowMenu(false)} />
              <div
                className="absolute top-full mt-2 right-0 bg-background-panel border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto w-64"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2">
                  {containers.slice(visibleTabCount).map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded hover:bg-tavern-dark transition-colors ${
                        c.id === activeId ? 'bg-tavern-purple' : ''
                      }`}
                    >
                      <button
                        onClick={() => {
                          setActive(c.id)
                          setShowOverflowMenu(false)
                        }}
                        className="flex-1 text-left text-sm text-tavern-cream hover:text-primary transition-colors truncate"
                      >
                        {c.title}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          closeContainer(c.id)
                        }}
                        className="opacity-60 hover:opacity-100 hover:text-red-400 transition-all flex-shrink-0"
                        title="Close tab"
                      >
                        <Icon name="X" className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Desktop Campaign Switcher and User Menu */}
      <div className="hidden md:block">
        <CampaignSwitcher />
      </div>

      {/* User Menu (Desktop only) */}
      <div className="hidden md:block relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 px-3 py-2 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors"
        >
          <Icon name="Dice5" className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">{user?.username}</span>
          <svg
            className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setShowUserMenu(false)
                setShowThemeMenu(false)
              }}
            />
            <div
              className={`absolute w-56 bg-background-panel border border-border rounded-lg shadow-xl z-50 ${
                position === 'bottom'
                  ? 'bottom-full mb-2 right-0'
                  : position === 'left'
                    ? 'left-full ml-2 bottom-0'
                    : position === 'right'
                      ? 'right-full mr-2 bottom-0'
                      : 'right-0 mt-2'
              }`}
            >
              <div className="p-2">
                <div className="px-3 py-2 text-xs text-tavern-mauve">{user?.email}</div>

                {/* Light/Dark Mode Toggle */}
                <div className="px-3 py-2 mt-2 border-t border-border">
                  <div className="text-xs text-tavern-mauve mb-2">Appearance</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode('dark')}
                      className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 transition-colors ${
                        mode === 'dark'
                          ? 'bg-primary text-tavern-darkest'
                          : 'bg-tavern-dark hover:bg-tavern-purple text-tavern-cream'
                      }`}
                    >
                      <Icon name="Moon" className="w-4 h-4" />
                      <span className="text-sm">Dark</span>
                    </button>
                    <button
                      onClick={() => setMode('light')}
                      className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 transition-colors ${
                        mode === 'light'
                          ? 'bg-primary text-tavern-darkest'
                          : 'bg-tavern-dark hover:bg-tavern-purple text-tavern-cream'
                      }`}
                    >
                      <Icon name="Sun" className="w-4 h-4" />
                      <span className="text-sm">Light</span>
                    </button>
                  </div>
                </div>

                {/* Theme Selector Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-tavern-dark rounded flex items-center gap-2 transition-colors"
                  >
                    <Icon name="Palette" className="w-5 h-5" />
                    <span className="flex-1">Color Theme</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${showThemeMenu ? '-rotate-90' : ''}`}
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

                  {/* Theme Flyout Menu */}
                  {showThemeMenu && (
                    <div
                      className={`absolute w-64 bg-background-panel border border-border rounded-lg shadow-xl max-h-96 overflow-y-auto ${
                        position === 'left'
                          ? 'left-full ml-1 bottom-0'
                          : position === 'right'
                            ? 'right-full mr-1 bottom-0'
                            : position === 'bottom'
                              ? 'right-full mr-1 bottom-0'
                              : 'right-full mr-1 top-0'
                      }`}
                      onMouseEnter={() => setShowThemeMenu(true)}
                      onMouseLeave={() => setShowThemeMenu(false)}
                    >
                      <div className="p-2">
                        <div className="px-3 py-2 text-xs text-tavern-mauve border-b border-border mb-2">
                          Select a color palette
                        </div>
                        {themes.map((theme) => {
                          const colors = getSemanticColors(theme.palette, mode)
                          return (
                            <button
                              key={theme.id}
                              onClick={() => {
                                setTheme(theme.id)
                                setShowThemeMenu(false)
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-tavern-dark rounded flex items-center gap-2 transition-colors ${
                                themeId === theme.id ? 'bg-tavern-purple' : ''
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
                                <Icon name="Check" className="w-4 h-4 text-primary" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

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

                <div className="border-t border-border mt-2 pt-2">
                  <button
                    onClick={() => {
                      logout()
                      setShowUserMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-tavern-dark rounded flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Context Menu for Kits */}
      {contextMenu && (
        <div
          className="fixed bg-background-panel border border-border rounded-lg shadow-xl py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              moveContainer(contextMenu.containerId, 'left')
              setContextMenu(null)
            }}
            disabled={containerIndex(contextMenu.containerId) === 0}
            className="w-full px-4 py-2 text-left text-sm hover:bg-tavern-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icon name="ArrowLeft" className="w-4 h-4" />
            <span>Move Left</span>
          </button>
          <button
            onClick={() => {
              moveContainer(contextMenu.containerId, 'right')
              setContextMenu(null)
            }}
            disabled={containerIndex(contextMenu.containerId) === containers.length - 1}
            className="w-full px-4 py-2 text-left text-sm hover:bg-tavern-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icon name="ArrowRight" className="w-4 h-4" />
            <span>Move Right</span>
          </button>
          <div className="border-t border-border my-1" />
          <button
            onClick={() => {
              closeAllContainers()
              setContextMenu(null)
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-tavern-dark text-red-400 flex items-center gap-2"
          >
            <Icon name="X" className="w-4 h-4" />
            <span>Close All</span>
          </button>
        </div>
      )}

      {/* Mobile Menu Drawer */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMobileMenu(false)}
          />
          {/* Drawer */}
          <div className="md:hidden fixed top-14 right-0 bottom-0 w-80 max-w-[85vw] bg-background-panel border-l border-border shadow-xl z-50 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* User Info Section */}
              <div className="pb-4 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Icon name="Dice5" className="w-8 h-8 text-primary" />
                  <div>
                    <div className="text-sm font-medium">{user?.username}</div>
                    <div className="text-xs text-tavern-mauve">{user?.email}</div>
                  </div>
                </div>
              </div>

              {/* Light/Dark Mode Toggle */}
              <div>
                <div className="text-xs text-tavern-mauve mb-2">Appearance</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('dark')}
                    className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 transition-colors ${
                      mode === 'dark'
                        ? 'bg-primary text-tavern-darkest'
                        : 'bg-tavern-dark hover:bg-tavern-purple text-tavern-cream'
                    }`}
                  >
                    <Icon name="Moon" className="w-4 h-4" />
                    <span className="text-sm">Dark</span>
                  </button>
                  <button
                    onClick={() => setMode('light')}
                    className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 transition-colors ${
                      mode === 'light'
                        ? 'bg-primary text-tavern-darkest'
                        : 'bg-tavern-dark hover:bg-tavern-purple text-tavern-cream'
                    }`}
                  >
                    <Icon name="Sun" className="w-4 h-4" />
                    <span className="text-sm">Light</span>
                  </button>
                </div>
              </div>

              {/* Theme Selector */}
              <div>
                <div className="text-xs text-tavern-mauve mb-2">Color Theme</div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {themes.map((theme) => {
                    const colors = getSemanticColors(theme.palette, mode)
                    return (
                      <button
                        key={theme.id}
                        onClick={() => setTheme(theme.id)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-tavern-dark rounded flex items-center gap-2 transition-colors ${
                          themeId === theme.id ? 'bg-tavern-purple' : ''
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
                          <Icon name="Check" className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Admin Options */}
              {user?.is_admin && (
                <div className="pt-4 border-t border-border space-y-1">
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
                </div>
              )}

              {/* Logout */}
              <div className="pt-4 border-t border-border">
                <button
                  onClick={() => {
                    logout()
                    setShowMobileMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-tavern-dark rounded flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  )
}
