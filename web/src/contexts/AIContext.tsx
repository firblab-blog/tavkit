import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuthStore } from "../store/authStore";
import { logger } from "@/utils/logger";
import { authFetch } from "@/utils/authFetch";

interface AIProvider {
  type: string;
  name: string;
  available: boolean;
  error?: string;
}

interface AIContextType {
  enabled: boolean;
  currentProvider: string | null;
  availableProviders: AIProvider[];
  models: string[];
  loading: boolean;
  error: string | null;
  switchProvider: (provider: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

interface AIProviderProps {
  children: ReactNode;
}

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [enabled, setEnabled] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>(
    [],
  );
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = async () => {
    try {
      setError(null);
      // AI status is a public endpoint, no auth needed
      const response = await fetch("/api/v1/ai/status");

      if (!response.ok) {
        throw new Error("Failed to fetch AI status");
      }

      const data = await response.json();

      setEnabled(data.enabled);
      setCurrentProvider(data.current_provider || null);
      setAvailableProviders(data.available_providers || []);

      // Fetch models if AI is enabled and has a provider
      if (data.enabled && data.current_provider) {
        try {
          // Models endpoint may require auth
          const modelsResponse = await authFetch("/api/v1/ai/models");
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            setModels(modelsData.models || []);
          }
        } catch (err) {
          logger.error("Failed to fetch models:", err);
          // Don't set error state, just log it
        }
      }
    } catch (err) {
      logger.error("Failed to fetch AI status:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const switchProvider = async (provider: string): Promise<void> => {
    try {
      setError(null);

      if (!isAuthenticated) {
        throw new Error("Not authenticated");
      }

      const response = await authFetch("/api/v1/settings/ai/provider", {
        method: "POST",
        body: JSON.stringify({
          provider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to switch provider");
      }

      // Refresh status after successful switch
      await refreshStatus();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to switch provider";
      setError(message);
      throw err;
    }
  };

  useEffect(() => {
    refreshStatus();

    // Refresh status every 5 minutes to check provider availability
    const interval = setInterval(refreshStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const value: AIContextType = {
    enabled,
    currentProvider,
    availableProviders,
    models,
    loading,
    error,
    switchProvider,
    refreshStatus,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export const useAI = (): AIContextType => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
};
