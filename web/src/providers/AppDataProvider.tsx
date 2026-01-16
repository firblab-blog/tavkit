import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useCampaignStore } from "../store/campaignStore";
import { useContextStore } from "../store/contextStore";
import { useCharacterStore } from "../store/characterStore";
import { logger } from "../utils/logger";

/**
 * AppDataProvider - Centralized data loading for the authenticated app.
 *
 * This provider solves the problem of 13+ components independently calling
 * fetchCampaigns() by loading core data ONCE at the app root level.
 *
 * Responsibilities:
 * 1. Load campaigns on mount (single source of truth)
 * 2. Load user context on mount (last campaign, last character, etc.)
 * 3. Provide global loading state for initial data
 * 4. Coordinate data refresh when needed (e.g., after campaign create/delete)
 *
 * Child components should:
 * - Use `useAppData()` to check if initial data is ready
 * - Use `useCampaignStore()` to access campaigns (already loaded)
 * - NOT call fetchCampaigns() in useEffect - it's already done here
 *
 * Exception: Components that CREATE or DELETE campaigns should call
 * refreshCampaigns() after their mutation to ensure fresh data.
 */

interface AppDataContextValue {
  /** True while initial data is loading (campaigns + context) */
  isLoading: boolean;
  /** True after initial data has loaded successfully at least once */
  isReady: boolean;
  /** Error message if initial load failed */
  error: string | null;
  /** Force refresh campaigns (use after create/delete operations) */
  refreshCampaigns: () => Promise<void>;
  /** Force refresh characters for current campaign */
  refreshCharacters: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
}

/**
 * Hook for components that need to ensure data is ready before rendering.
 * Returns true when both campaigns and context are loaded.
 */
export function useDataReady(): boolean {
  const { isReady } = useAppData();
  return isReady;
}

interface AppDataProviderProps {
  children: ReactNode;
}

export function AppDataProvider({ children }: AppDataProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get store functions
  const fetchCampaigns = useCampaignStore((state) => state.fetchCampaigns);
  const campaignLoading = useCampaignStore((state) => state.loading);
  const campaignError = useCampaignStore((state) => state.error);

  const fetchContext = useContextStore((state) => state.fetchContext);
  const contextLoading = useContextStore((state) => state.loading);

  const fetchCharacters = useCharacterStore((state) => state.fetchCharacters);
  const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);

  // Initial data load - runs ONCE on mount
  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      logger.debug("[AppDataProvider] Starting initial data load");
      setIsLoading(true);
      setError(null);

      try {
        // Load campaigns and context in parallel
        await Promise.all([
          fetchCampaigns(true), // force refresh on initial load
          fetchContext(),
        ]);

        if (mounted) {
          logger.debug("[AppDataProvider] Initial data load complete");
          setIsReady(true);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const message =
            err instanceof Error ? err.message : "Failed to load app data";
          logger.error("[AppDataProvider] Initial data load failed:", err);
          setError(message);
          setIsLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
    // Only run on mount - empty deps intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh campaigns (for use after create/delete operations)
  const refreshCampaigns = useCallback(async () => {
    logger.debug("[AppDataProvider] Refreshing campaigns");
    await fetchCampaigns(true);
  }, [fetchCampaigns]);

  // Refresh characters for the current campaign context
  const refreshCharacters = useCallback(async () => {
    logger.debug("[AppDataProvider] Refreshing characters");
    await fetchCharacters(true, activeCampaignId ?? undefined);
  }, [fetchCharacters, activeCampaignId]);

  // Combine loading states
  const combinedLoading = isLoading || campaignLoading || contextLoading;
  const combinedError = error || campaignError;

  const value: AppDataContextValue = {
    isLoading: combinedLoading,
    isReady,
    error: combinedError,
    refreshCampaigns,
    refreshCharacters,
  };

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export default AppDataProvider;
