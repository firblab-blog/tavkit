import { useContainerStore } from '../../store/containerStore'
import { useUISettingsStore } from '../../store/uiSettingsStore'
import { useRef, useEffect, useState } from 'react'
import Icon from './Icon'

export default function MobileTabStrip() {
  const { containers, activeId, setActive, closeContainer, closeAllContainers } =
    useContainerStore()
  const mobileTabBarBehavior = useUISettingsStore((state) => state.mobileTabBarBehavior)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const timeoutRef = useRef<number>()

  // Auto-scroll to active tab when it changes
  useEffect(() => {
    if (activeId && scrollContainerRef.current) {
      const activeTab = scrollContainerRef.current.querySelector(`[data-tab-id="${activeId}"]`)
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [activeId])

  // Handle auto-hide scroll behavior
  useEffect(() => {
    if (mobileTabBarBehavior !== 'auto-hide') {
      setIsVisible(true)
      return
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Scrolling down - hide
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false)
      }
      // Scrolling up - show
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)

      // Show after 2 seconds of no scrolling
      timeoutRef.current = window.setTimeout(() => {
        setIsVisible(true)
      }, 2000)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [mobileTabBarBehavior, lastScrollY])

  // Don't render if setting is 'hidden'
  if (mobileTabBarBehavior === 'hidden') {
    return null
  }

  // Don't show if no containers are open
  if (containers.length === 0) {
    return null
  }

  // Determine visibility class based on setting
  const getVisibilityClass = () => {
    if (mobileTabBarBehavior === 'always-show') {
      return 'translate-y-0'
    }
    // auto-hide mode
    return isVisible ? 'translate-y-0' : 'translate-y-full'
  }

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background-panel/95 backdrop-blur-sm border-t border-border shadow-lg transform transition-transform duration-300 ease-in-out ${getVisibilityClass()}`}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        {/* Scrollable Tabs */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {containers.map((c) => (
            <button
              key={c.id}
              data-tab-id={c.id}
              onClick={() => setActive(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
                c.id === activeId
                  ? 'bg-primary text-tavern-darkest shadow-lg'
                  : 'bg-tavern-dark hover:bg-tavern-purple text-tavern-cream'
              }`}
            >
              <span>{c.title}</span>
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

        {/* Close All Button */}
        {containers.length > 1 && (
          <button
            onClick={closeAllContainers}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm bg-tavern-dark hover:bg-red-900/50 text-red-400 transition-all"
            title="Close all tabs"
          >
            <Icon name="X" className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
