import { useContextStore } from "../../store/contextStore";
import FeatureShowcase from "./FeatureShowcase";
import ContextResume from "./ContextResume";

/**
 * WelcomeLanding - The main landing page that conditionally renders based on user state.
 *
 * - First-time users (has_completed_onboarding = false): Show FeatureShowcase
 * - Returning users (has_completed_onboarding = true): Show ContextResume
 *
 * Note: Context is loaded by AppDataProvider at the app root level, so userContext
 * is always available when this component renders.
 */
export default function WelcomeLanding() {
  const { userContext } = useContextStore();

  // Determine which landing to show based on onboarding status
  const hasCompletedOnboarding = userContext?.has_completed_onboarding ?? false;

  if (hasCompletedOnboarding) {
    return <ContextResume />;
  }

  return <FeatureShowcase />;
}
