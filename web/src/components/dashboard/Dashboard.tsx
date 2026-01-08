import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useContainerStore } from '../../store/containerStore'
import { useAuthStore } from '../../store/authStore'
import { useUISettingsStore } from '../../store/uiSettingsStore'
import TopBar from '../common/TopBar'
import MobileTabStrip from '../common/MobileTabStrip'
import ContainerRenderer from '../workspace/ContainerRenderer'
import { useContainerRouting } from '../../hooks/useContainerRouting'
import { logger } from '@/utils/logger'

export default function Dashboard() {
  const { loadContainers, isInitialized, containers } = useContainerStore()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // Sync URL with container state for deep linking
  useContainerRouting()
  const toolbarPosition = useUISettingsStore((state) => state.toolbarPosition)
  const mobileTabBarBehavior = useUISettingsStore((state) => state.mobileTabBarBehavior)
  const loadFromBackend = useUISettingsStore((state) => state.loadFromBackend)

  useEffect(() => {
    // Load UI settings from backend on mount
    loadFromBackend()
  }, [loadFromBackend])

  useEffect(() => {
    // Wait for auth to be ready (authenticated via HttpOnly cookie)
    // Then load containers if not already initialized
    if (isAuthenticated && !isInitialized) {
      logger.debug('[Dashboard] Auth ready, loading containers...')
      loadContainers()
    }
  }, [isAuthenticated, loadContainers, isInitialized])

  // Layout classes based on toolbar position
  const getLayoutClasses = () => {
    // Determine if mobile tab bar needs padding
    const hasMobileTabBar = containers.length > 0 && mobileTabBarBehavior !== 'hidden'
    const mobileBottomPadding = hasMobileTabBar ? 'pb-16 md:pb-0' : 'pb-0'

    switch (toolbarPosition) {
      case 'left':
        return {
          container: 'h-screen flex flex-row bg-background',
          toolbar: 'w-64 flex-shrink-0',
          content: `flex-1 overflow-hidden ${mobileBottomPadding}`,
        }
      case 'right':
        return {
          container: 'h-screen flex flex-row bg-background',
          toolbar: 'w-64 flex-shrink-0 order-2',
          content: `flex-1 overflow-hidden order-1 ${mobileBottomPadding}`,
        }
      case 'bottom':
        return {
          container: 'h-screen flex flex-col bg-background',
          toolbar: 'h-14 flex-shrink-0 order-2',
          content: `flex-1 overflow-hidden order-1 ${mobileBottomPadding}`,
        }
      default: // top
        return {
          container: 'h-screen flex flex-col bg-background',
          toolbar: 'h-14 flex-shrink-0',
          content: `flex-1 overflow-hidden ${mobileBottomPadding}`,
        }
    }
  }

  const layout = getLayoutClasses()

  return (
    <div className={layout.container}>
      <div className={layout.toolbar}>
        <TopBar position={toolbarPosition} />
      </div>
      {/* Mobile Tab Strip - only visible on mobile when containers are open */}
      <MobileTabStrip />
      <div className={layout.content}>
        <Routes>
          <Route path="/*" element={<ContainerRenderer />} />
        </Routes>
      </div>
    </div>
  )
}
