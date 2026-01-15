import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useContainerStore, ContainerInstance } from '../../store/containerStore'
import { useAuthStore } from '../../store/authStore'
import { getApiUrl } from '../../config/api'
import { authFetch } from '@/utils/authFetch'
import Icon from '../common/Icon'
import { logger } from '@/utils/logger'

interface ExternalSite {
  id: string
  name: string
  base_url: string
  login_url?: string
  requires_auth: boolean
  open_in_new_tab?: boolean
}

interface CustomTool {
  id: string
  name: string
  type: string
  url?: string
  config?: {
    icon?: string
  }
}

// Well-known site logos
const SITE_LOGOS: Record<string, string> = {
  dnd5etools: 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/master/favicon.svg',
  dndbeyond: 'https://www.google.com/s2/favicons?domain=dndbeyond.com&sz=64',
  roll20: 'https://app.roll20.net/v2/images/roll20-logo.png',
  foundryvtt: 'https://foundryvtt.com/static/assets/icons/fvtt.png',
  koboldplus: 'https://www.google.com/s2/favicons?domain=koboldplus.club&sz=64',
  tabletopaudio: 'https://www.google.com/s2/favicons?domain=tabletopaudio.com&sz=64',
  fantasynamegen: 'https://www.google.com/s2/favicons?domain=fantasynamegenerators.com&sz=64',
  dungeonscrawl: 'https://www.google.com/s2/favicons?domain=dungeonscrawl.com&sz=64',
  thievesguild: 'https://www.google.com/s2/favicons?domain=thievesguild.cc&sz=64',
}

// Helper to get favicon URL from domain
const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return ''
  }
}

/**
 * ToolsPage - Full-screen embedded tools experience with tab management.
 *
 * Features:
 * - Tab bar at top showing open tools
 * - Sidebar with available tools
 * - Iframe container for embedded content
 * - Tools loaded through proxy for proper embedding
 */
export default function ToolsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { containers, activeId, openContainer, closeContainer, setActive } = useContainerStore()
  const [externalSites, setExternalSites] = useState<ExternalSite[]>([])
  const [customTools, setCustomTools] = useState<CustomTool[]>([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [iframeError, setIframeError] = useState<string | null>(null)

  // Get the active container
  const activeContainer = containers.find((c) => c.id === activeId)

  // Determine context (gm or player) from URL
  const isGMContext = location.pathname.includes('/gm/')
  const basePath = isGMContext ? '/dashboard/gm' : '/dashboard/player'

  // Load available tools
  useEffect(() => {
    // Fetch external sites
    fetch('/api/v1/external-sites')
      .then((res) => (res.ok ? res.json() : { sites: [] }))
      .then((data) => {
        logger.debug('[ToolsPage] External sites loaded:', data.sites)
        setExternalSites(data.sites || [])
      })
      .catch((err) => logger.error('Failed to fetch external sites:', err))

    // Load custom tools
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    if (isAuthenticated) {
      authFetch(getApiUrl('/tools'))
        .then((res) => (res.ok ? res.json() : []))
        .then((tools) => {
          const externalTools = Array.isArray(tools)
            ? tools.filter((t: CustomTool) => t.type === 'external')
            : []
          setCustomTools(externalTools)
        })
        .catch((err) => logger.error('Failed to fetch custom tools:', err))
    }
  }, [])

  // Build proxy URL for embedding
  const getProxyUrl = (url: string) => {
    return `/api/v1/proxy?url=${encodeURIComponent(url)}`
  }

  // Open a tool in a new tab
  const handleOpenTool = (site: ExternalSite | CustomTool, url: string) => {
    const icon =
      'config' in site
        ? site.config?.icon || getFaviconUrl(url)
        : SITE_LOGOS[site.id] || getFaviconUrl(url)

    openContainer({
      type: 'external',
      tool: site.id,
      title: site.name,
      url: url,
      icon,
    })
    setIframeError(null)
  }

  // Handle iframe load error
  const handleIframeError = () => {
    setIframeError(
      'This site cannot be embedded. Some sites block iframe embedding for security reasons.'
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Tab Bar */}
      <div className="flex-shrink-0 bg-background-panel border-b border-border">
        <div className="flex items-center h-12 px-2 gap-2">
          {/* Back Button */}
          <button
            onClick={() => navigate(basePath)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-text-muted hover:text-text hover:bg-background transition-colors"
            title="Back to Dashboard"
          >
            <Icon name="ArrowLeft" className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
          </button>

          <div className="w-px h-6 bg-border" />

          {/* Tab Bar */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {containers.map((container) => (
              <TabButton
                key={container.id}
                container={container}
                isActive={container.id === activeId}
                onSelect={() => setActive(container.id)}
                onClose={() => closeContainer(container.id)}
              />
            ))}

            {containers.length === 0 && (
              <span className="text-text-muted text-sm px-2">
                Select a tool from the sidebar to get started
              </span>
            )}
          </div>

          {/* Toggle Sidebar */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-2 rounded-lg transition-colors ${
              showSidebar
                ? 'bg-primary/20 text-primary'
                : 'text-text-muted hover:text-text hover:bg-background'
            }`}
            title={showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            <Icon name={showSidebar ? 'ChevronLeft' : 'ChevronRight'} className="w-4 h-4" />
          </button>

          {/* Add Kit Button (future) */}
          <button
            onClick={() => {
              /* TODO: Add kit functionality */
            }}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-background transition-colors"
            title="Add Kit"
          >
            <Icon name="Plus" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-64 flex-shrink-0 bg-background-panel border-r border-border overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* External Sites */}
              {externalSites.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    External Tools
                  </h3>
                  <div className="space-y-1">
                    {externalSites.map((site) => (
                      <ToolButton
                        key={site.id}
                        name={site.name}
                        icon={SITE_LOGOS[site.id]}
                        onClick={() => handleOpenTool(site, site.base_url)}
                        isActive={containers.some((c) => c.url === site.base_url)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Tools */}
              {customTools.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Custom Tools
                  </h3>
                  <div className="space-y-1">
                    {customTools.map((tool) => (
                      <ToolButton
                        key={tool.id}
                        name={tool.name}
                        icon={tool.config?.icon}
                        onClick={() => tool.url && handleOpenTool(tool, tool.url)}
                        isActive={containers.some((c) => c.url === tool.url)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No tools message */}
              {externalSites.length === 0 && customTools.length === 0 && (
                <div className="text-center py-8">
                  <Icon name="ExternalLink" className="w-8 h-8 text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted text-sm">No tools available</p>
                  <p className="text-text-muted text-xs mt-1">
                    Enable tools in Settings or add custom URLs
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Iframe Container */}
        <div className="flex-1 bg-white relative">
          {activeContainer ? (
            <>
              {iframeError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background">
                  <div className="text-center p-8 max-w-md">
                    <Icon name="AlertCircle" className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-text mb-2">Cannot Embed This Site</h3>
                    <p className="text-text-muted mb-4">{iframeError}</p>
                    <a
                      href={activeContainer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors"
                    >
                      <Icon name="ExternalLink" className="w-4 h-4" />
                      Open in New Tab
                    </a>
                  </div>
                </div>
              ) : (
                <iframe
                  key={activeContainer.id}
                  src={getProxyUrl(activeContainer.url)}
                  className="w-full h-full border-0"
                  title={activeContainer.title}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  onError={handleIframeError}
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center p-8">
                <img
                  src="/tavkit-logo-master.svg"
                  alt="TavKit"
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                />
                <h3 className="text-lg font-semibold text-text mb-2">No Tool Selected</h3>
                <p className="text-text-muted">
                  {showSidebar
                    ? 'Select a tool from the sidebar to embed it here'
                    : 'Click the sidebar button to see available tools'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Tab Button Component
interface TabButtonProps {
  container: ContainerInstance
  isActive: boolean
  onSelect: () => void
  onClose: () => void
}

function TabButton({ container, isActive, onSelect, onClose }: TabButtonProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer group transition-all ${
        isActive
          ? 'bg-primary text-background'
          : 'text-text-muted hover:text-text hover:bg-background'
      }`}
      onClick={onSelect}
    >
      {container.icon && (
        <img
          src={container.icon}
          alt=""
          className="w-4 h-4 object-contain"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
      <span className="truncate max-w-[120px]">{container.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className={`p-0.5 rounded transition-colors ${
          isActive
            ? 'hover:bg-background/20 text-background/80 hover:text-background'
            : 'opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400'
        }`}
        title="Close tab"
      >
        <Icon name="X" className="w-3 h-3" />
      </button>
    </div>
  )
}

// Tool Button Component for Sidebar
interface ToolButtonProps {
  name: string
  icon?: string
  onClick: () => void
  isActive: boolean
}

function ToolButton({ name, icon, onClick, isActive }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
        isActive
          ? 'bg-primary/20 text-primary border border-primary/30'
          : 'text-text hover:bg-background hover:text-text'
      }`}
    >
      {icon ? (
        <img
          src={icon}
          alt=""
          className="w-4 h-4 object-contain flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling?.classList.remove('hidden')
          }}
        />
      ) : null}
      <Icon name="ExternalLink" className={`w-4 h-4 flex-shrink-0 ${icon ? 'hidden' : ''}`} />
      <span className="truncate">{name}</span>
      {isActive && <Icon name="Check" className="w-3 h-3 ml-auto text-primary" />}
    </button>
  )
}
