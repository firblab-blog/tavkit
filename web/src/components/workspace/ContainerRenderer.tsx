import { useContainerStore } from '../../store/containerStore'
import { useState, useEffect, useMemo } from 'react'
import { useSwipe } from '../../hooks/useSwipe'
import AdminSettings from '../admin/AdminSettings'
import NPCGenerator from '../generators/NPCGenerator'
import MonsterGenerator from '../generators/MonsterGenerator'
import EncounterBuilder from '../generators/EncounterBuilder'
import DialogueBuilder from '../generators/DialogueBuilder'
import LocationGenerator from '../generators/LocationGenerator'
import QuestGenerator from '../generators/QuestGenerator'
import ItemGenerator from '../generators/ItemGenerator'
import RumorGenerator from '../generators/RumorGenerator'
import TavernGenerator from '../generators/TavernGenerator'
import MerchantGenerator from '../generators/MerchantGenerator'
import TrapGenerator from '../generators/TrapGenerator'
import CritterGenerator from '../generators/CritterGenerator'
import ChaseGenerator from '../generators/ChaseGenerator'
import ChaseManager from '../chase/ChaseManager'
import AdventurersRoster from '../character/AdventurersRoster'
import SavedContent from '../SavedContent'
import CampaignToolkit from '../campaign/CampaignToolkit'
import SessionChat from '../chat/SessionChat'
import HomePage from '../home/HomePage'
import AdminUserManagement from '../admin/AdminUserManagement'
import { logger } from '@/utils/logger'

interface ExternalSite {
  id: string
  name: string
  base_url: string
  requires_auth: boolean
  open_in_new_tab: boolean
}

export default function ContainerRenderer() {
  const { containers, activeId, setActive, isInitialized } = useContainerStore()
  const [iframeErrors, setIframeErrors] = useState<Record<string, boolean>>({})
  const [externalSites, setExternalSites] = useState<ExternalSite[]>([])

  // Swipe navigation between tabs
  const activeIndex = useMemo(() => {
    return containers.findIndex((c) => c.id === activeId)
  }, [containers, activeId])

  const swipeRef = useSwipe({
    onSwipeLeft: () => {
      // Swipe left = next tab
      if (activeIndex >= 0 && activeIndex < containers.length - 1) {
        setActive(containers[activeIndex + 1].id)
      }
    },
    onSwipeRight: () => {
      // Swipe right = previous tab
      if (activeIndex > 0) {
        setActive(containers[activeIndex - 1].id)
      }
    },
  })

  // Fetch external sites configuration on mount
  useEffect(() => {
    fetch('/api/v1/external-sites')
      .then((res) => res.json())
      .then((data) => setExternalSites(data.sites || []))
      .catch((err) => logger.error('Failed to fetch external sites:', err))
  }, [])

  // Helper to check if URL should be proxied
  const shouldProxyURL = (url: string) => {
    // Check if it's a registered site that requires auth/proxying
    const site = externalSites.find((s) => s.base_url && url.startsWith(s.base_url))
    return site?.requires_auth || false
  }

  // Helper to check if site should always open in new tab (can't be embedded)
  const shouldOpenInNewTab = (url: string) => {
    const site = externalSites.find((s) => s.base_url && url.startsWith(s.base_url))
    return site?.open_in_new_tab || false
  }

  const handleIframeError = (containerId: string) => {
    setIframeErrors((prev) => ({ ...prev, [containerId]: true }))
  }

  // Don't render until we know the container state from the backend
  // This prevents a flash of HomePage/NoCampaignState during initial load
  if (!isInitialized) {
    return null
  }

  const showHome = containers.length === 0 || !activeId

  // Render all containers and Home, showing only the active one
  return (
    <div ref={swipeRef as React.RefObject<HTMLDivElement>} className="relative w-full h-full">
      {/* Home view - shown when no active container */}
      <div
        className="absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden"
        style={{ display: showHome ? 'block' : 'none' }}
      >
        <HomePage />
      </div>

      {/* All containers - kept mounted to preserve state */}
      {containers.map((container) => {
        const isActive = container.id === activeId
        const hasError = iframeErrors[container.id]
        // Check if this site must always open in new tab (can't be embedded)
        const mustOpenInNewTab = container.url ? shouldOpenInNewTab(container.url) : false

        return (
          <div
            key={container.id}
            className="absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden"
            style={{ display: isActive ? 'block' : 'none' }}
          >
            {container.type === 'external' && container.url && (
              <div className="relative w-full h-full">
                {(hasError || mustOpenInNewTab) && (
                  <div className="absolute inset-0 bg-gray-900 z-20 flex items-center justify-center">
                    <div className="text-center max-w-md p-8">
                      <div className="text-6xl mb-4">{mustOpenInNewTab ? '🔗' : '🔒'}</div>
                      <h2 className="text-2xl font-bold text-white mb-3">
                        {mustOpenInNewTab
                          ? `Open ${container.title} in a New Tab`
                          : `Can't embed ${container.title}`}
                      </h2>
                      <p className="text-gray-400 mb-6">
                        {mustOpenInNewTab
                          ? `${container.title} works best when opened in its own browser tab. Click below to access all features.`
                          : 'This site blocks iframe embedding for security. You can still open it in a new tab to use all its features.'}
                      </p>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          window.open(container.url, '_blank', 'noopener,noreferrer')
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        <span>Open {container.title} in New Tab</span>
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
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {!mustOpenInNewTab && (
                  <>
                    <div className="absolute top-4 right-4 z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          window.open(container.url, '_blank', 'noopener,noreferrer')
                        }}
                        className="px-4 py-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg shadow-lg flex items-center gap-2 transition-colors backdrop-blur-sm cursor-pointer"
                      >
                        <span className="text-sm">Open in New Tab</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </button>
                    </div>
                    <iframe
                      src={
                        shouldProxyURL(container.url)
                          ? `/api/v1/proxy?url=${encodeURIComponent(container.url)}`
                          : container.url
                      }
                      className="w-full h-full border-0"
                      title={container.title}
                      onError={() => handleIframeError(container.id)}
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                      allow="fullscreen; encrypted-media"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </>
                )}
              </div>
            )}

            {/* Internal tools */}
            {container.tool === 'npc' && <NPCGenerator />}

            {container.tool === 'monster' && <MonsterGenerator />}

            {container.tool === 'encounter' && <EncounterBuilder />}

            {container.tool === 'dialogue' && <DialogueBuilder />}

            {container.tool === 'location' && <LocationGenerator />}

            {container.tool === 'quest' && <QuestGenerator />}

            {container.tool === 'item' && <ItemGenerator />}

            {container.tool === 'tavern' && <TavernGenerator />}

            {container.tool === 'merchant' && <MerchantGenerator />}

            {container.tool === 'trap' && <TrapGenerator />}

            {container.tool === 'critter' && <CritterGenerator />}

            {container.tool === 'chase' && <ChaseGenerator />}

            {container.tool === 'chase-manager' && <ChaseManager />}

            {container.tool === 'characters' && <AdventurersRoster />}

            {container.tool === 'rumor' && <RumorGenerator />}

            {container.tool === 'saved' && <SavedContent />}

            {container.tool === 'campaign' && <CampaignToolkit />}

            {container.tool === 'session-chat' && <SessionChat />}

            {/* Admin tools */}
            {container.tool === 'settings' && (
              <div className="p-8 bg-background h-full overflow-auto">
                <AdminSettings />
              </div>
            )}

            {container.tool === 'user-management' && (
              <div className="h-full overflow-auto bg-background">
                <AdminUserManagement />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
