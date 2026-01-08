import { useState, useEffect } from 'react'
import { useContainerStore } from '../../../store/containerStore'
import { useAuthStore } from '../../../store/authStore'
import { getApiUrl } from '../../../config/api'
import Icon from '../../common/Icon'
import { logger } from '@/utils/logger'
import { authFetch } from '@/utils/authFetch'

interface ExternalSite {
  id: string
  name: string
  base_url: string
  login_url?: string
  requires_auth: boolean
}

interface CustomTool {
  id: string
  user_id: string
  name: string
  type: string
  url?: string
  config?: {
    icon?: string
  }
  position: number
  is_pinned: boolean
  created_at: string
}

// Favicon/logo URLs for well-known sites
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

// Helper function to get favicon URL from domain
const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch (e) {
    return ''
  }
}

export default function QuickActions() {
  const [externalSites, setExternalSites] = useState<ExternalSite[]>([])
  const [customTools, setCustomTools] = useState<CustomTool[]>([])
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customUrl, setCustomUrl] = useState('')
  const [customName, setCustomName] = useState('')
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null)
  const [hoveredToolId, setHoveredToolId] = useState<string | null>(null)
  const { openContainer } = useContainerStore()

  useEffect(() => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated

    // Fetch hardcoded external sites (public endpoint)
    fetch('/api/v1/external-sites')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data) => {
        logger.debug('[QuickActions] External sites from API:', data.sites)
        setExternalSites(data.sites || [])
      })
      .catch((err) => logger.error('Failed to fetch external sites:', err))

    // Load custom tools from API
    if (isAuthenticated) {
      authFetch(getApiUrl('/tools'))
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }
          return res.json()
        })
        .then((tools) => {
          logger.debug('[QuickActions] Custom tools from API:', tools)
          // Filter for external tools only
          const externalTools = Array.isArray(tools)
            ? tools.filter((t: CustomTool) => t.type === 'external')
            : []
          setCustomTools(externalTools)
        })
        .catch((err) => logger.error('Failed to fetch custom tools:', err))
    }
  }, [])

  const handleOpenExternalSite = (site: ExternalSite) => {
    openContainer({
      type: 'external',
      tool: site.id,
      title: site.name,
      url: site.base_url,
    })
  }

  const handleOpenCustomTool = (tool: CustomTool) => {
    openContainer({
      type: 'external',
      tool: tool.id,
      title: tool.name,
      url: tool.url || '',
    })
  }

  const handleAddOrUpdateCustomTool = async () => {
    if (!customUrl || !customName) return

    const isAuthenticated = useAuthStore.getState().isAuthenticated
    if (!isAuthenticated) return

    const icon = getFaviconUrl(customUrl)
    const toolData = {
      name: customName,
      type: 'external',
      url: customUrl,
      icon: icon,
      position: editingTool?.position || customTools.length,
      is_pinned: editingTool?.is_pinned || false,
    }

    try {
      let response
      if (editingTool) {
        // Update existing tool
        response = await authFetch(getApiUrl(`/tools/${editingTool.id}`), {
          method: 'PUT',
          body: JSON.stringify(toolData),
        })
      } else {
        // Create new tool
        response = await authFetch(getApiUrl('/tools'), {
          method: 'POST',
          body: JSON.stringify(toolData),
        })
      }

      if (response.ok) {
        const savedTool = await response.json()

        if (editingTool) {
          // Update in list
          setCustomTools(customTools.map((t) => (t.id === editingTool.id ? savedTool : t)))
        } else {
          // Add to list
          setCustomTools([...customTools, savedTool])
        }

        setCustomUrl('')
        setCustomName('')
        setEditingTool(null)
        setShowCustomModal(false)
      } else {
        logger.error('Failed to save custom tool:', await response.text())
      }
    } catch (error) {
      logger.error('Error saving custom tool:', error)
    }
  }

  const handleEditCustomTool = (tool: CustomTool) => {
    setEditingTool(tool)
    setCustomName(tool.name)
    setCustomUrl(tool.url || '')
    setShowCustomModal(true)
  }

  const handleDeleteCustomTool = async (toolId: string) => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    if (!isAuthenticated) return

    try {
      const response = await authFetch(getApiUrl(`/tools/${toolId}`), {
        method: 'DELETE',
      })

      if (response.ok) {
        setCustomTools(customTools.filter((t) => t.id !== toolId))
      } else {
        logger.error('Failed to delete custom tool:', await response.text())
      }
    } catch (error) {
      logger.error('Error deleting custom tool:', error)
    }
  }

  const handleCloseModal = () => {
    setShowCustomModal(false)
    setCustomUrl('')
    setCustomName('')
    setEditingTool(null)
  }

  // Hardcoded tool IDs that should not appear as custom tools (to prevent duplicates)
  const hardcodedToolIds = ['dnd5etools', 'dndbeyond', 'roll20', 'foundryvtt', 'koboldplus']
  const hardcodedToolNames = [
    '5etools',
    'd&d 5e tools',
    'dnd 5e tools',
    'd&d beyond',
    'dndbeyond',
    'roll20',
    'foundry vtt',
    'foundryvtt',
    'kobold plus club',
    'koboldplus',
  ]

  // Filter custom tools to exclude duplicates of hardcoded tools
  const filteredCustomTools = customTools.filter((tool) => {
    const toolIdLower = tool.id.toLowerCase()
    const toolNameLower = tool.name.toLowerCase()
    const toolUrlLower = (tool.url || '').toLowerCase()

    // Check if this custom tool matches a hardcoded tool by ID, name, or URL
    if (hardcodedToolIds.includes(toolIdLower)) {
      return false
    }
    if (hardcodedToolNames.includes(toolNameLower)) {
      return false
    }
    // Also check URL patterns for known sites
    if (
      toolUrlLower.includes('5e.tools') ||
      toolUrlLower.includes('dndbeyond.com') ||
      toolUrlLower.includes('roll20.net') ||
      toolUrlLower.includes('foundryvtt.com') ||
      toolUrlLower.includes('koboldplus.club')
    ) {
      return false
    }
    return true
  })

  return (
    <>
      {/* External Tools */}
      <div className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon name="ExternalLink" className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-text">External Tools</h2>
        </div>

        {externalSites.length === 0 && filteredCustomTools.length === 0 ? (
          <p className="text-text-muted text-sm mb-4">
            No external tools configured. Add custom URLs below.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {/* External Sites - filtered by backend based on admin settings */}
            {externalSites.map((site) => {
              const logoUrl = SITE_LOGOS[site.id]
              return (
                <button
                  key={site.id}
                  onClick={() => handleOpenExternalSite(site)}
                  className="w-full px-3 py-2 bg-background hover:bg-background-panel border border-border hover:border-primary/40 rounded-lg text-text transition-colors flex items-center gap-2 text-sm group"
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${site.name} logo`}
                      className="w-4 h-4 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <Icon
                    name="ExternalLink"
                    className={`w-4 h-4 text-text-muted group-hover:text-primary ${logoUrl ? 'hidden' : ''}`}
                  />
                  <span className="flex-1 text-left">{site.name}</span>
                </button>
              )
            })}

            {/* Custom Tools - filtered to exclude duplicates of hardcoded tools */}
            {filteredCustomTools.map((tool) => {
              const iconUrl = tool.config?.icon
              return (
                <div
                  key={tool.id}
                  className="w-full px-3 py-2 bg-background hover:bg-background-panel border border-border hover:border-primary/40 rounded-lg text-text transition-colors flex items-center gap-2 text-sm group relative"
                  onMouseEnter={() => setHoveredToolId(tool.id)}
                  onMouseLeave={() => setHoveredToolId(null)}
                >
                  <button
                    onClick={() => handleOpenCustomTool(tool)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={`${tool.name} logo`}
                        className="w-4 h-4 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <Icon
                      name="ExternalLink"
                      className={`w-4 h-4 text-text-muted group-hover:text-primary ${iconUrl ? 'hidden' : ''}`}
                    />
                    <span className="flex-1">{tool.name}</span>
                  </button>

                  {/* Edit/Delete buttons - show on hover */}
                  {hoveredToolId === tool.id && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditCustomTool(tool)
                        }}
                        className="p-1 hover:bg-background-panel rounded transition-colors"
                        title="Edit"
                      >
                        <Icon
                          name="Edit"
                          className="w-3.5 h-3.5 text-text-muted hover:text-primary"
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCustomTool(tool.id)
                        }}
                        className="p-1 hover:bg-background-panel rounded transition-colors"
                        title="Delete"
                      >
                        <Icon
                          name="Trash2"
                          className="w-3.5 h-3.5 text-text-muted hover:text-red-500"
                        />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={() => setShowCustomModal(true)}
          className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-background font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="Plus" className="w-4 h-4" />
          <span>Add Custom URL</span>
        </button>
      </div>

      {/* Custom URL Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-background-panel border border-primary/40 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-text">
                  {editingTool ? 'Edit Custom URL' : 'Add Custom URL'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-background rounded-lg transition-colors"
                >
                  <Icon name="X" className="w-5 h-5 text-text-muted hover:text-text" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">Tool Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., 5e Tools, Kobold Plus Club"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">URL</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://5e.tools"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:border-primary focus:outline-none"
                />
              </div>

              <div className="bg-background border border-border/50 rounded-lg p-3">
                <p className="text-xs text-text-muted">
                  The tool will attempt to fetch the site's favicon automatically. You can add
                  popular D&D tools like 5e.tools, koboldplus.club, donjon.bin.sh, or any other
                  useful website.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddOrUpdateCustomTool}
                  disabled={!customUrl || !customName}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-background font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingTool ? 'Save Changes' : 'Add Tool'}
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-background hover:bg-background-panel border border-border rounded-lg text-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
