import { useEffect, useState } from 'react'
import { useContextStore } from '../../store/contextStore'
import FeatureShowcase from './FeatureShowcase'
import ContextResume from './ContextResume'
import Icon from '../common/Icon'

/**
 * WelcomeLanding - The main landing page that conditionally renders based on user state.
 *
 * - First-time users (has_completed_onboarding = false): Show FeatureShowcase
 * - Returning users (has_completed_onboarding = true): Show ContextResume
 */
export default function WelcomeLanding() {
  const { userContext, loading, fetchContext } = useContextStore()
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const loadContext = async () => {
      // If we don't have context yet, fetch it
      if (!userContext) {
        await fetchContext()
      }
      setInitialLoading(false)
    }
    loadContext()
  }, [userContext, fetchContext])

  // Show loading state while fetching initial context
  if (initialLoading || loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background">
        <Icon name="Loader2" className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-text-muted">Loading...</p>
      </div>
    )
  }

  // Determine which landing to show based on onboarding status
  const hasCompletedOnboarding = userContext?.has_completed_onboarding ?? false

  if (hasCompletedOnboarding) {
    return <ContextResume />
  }

  return <FeatureShowcase />
}
