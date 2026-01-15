import { useState, useRef, useEffect, useCallback } from "react";
import { useCampaignStore } from "@/store/campaignStore";
import { emitContentSaved } from "@/lib/contentEvents";
import { getErrorMessage } from "@/api/generators";

// Re-export types for convenience
export type EntryMode = "ai" | "manual";

export interface AIGenerationSettings {
  detailLevel: "low" | "medium" | "high" | "very-high";
  timeout: number;
}

export function getMaxTokensFromSettings(
  settings: AIGenerationSettings,
): number {
  switch (settings.detailLevel) {
    case "low":
      return 1024;
    case "medium":
      return 2048;
    case "high":
      return 4096;
    case "very-high":
      return 8192;
    default:
      return 2048;
  }
}

/**
 * Configuration for a generator type
 */
export interface GeneratorConfig<TGenerated, TManual, TParams> {
  /** Function to generate content via API - returns wrapper like { npc: {...} } */
  generateApi: (
    params: TParams,
    timeout: number,
  ) => Promise<Record<string, unknown>>;
  /** Function to save content via API */
  saveApi: (data: unknown) => Promise<unknown>;
  /** Function to normalize the raw entity (after extraction via entityKey) into TGenerated */
  normalizeResponse: (raw: Record<string, unknown>) => TGenerated;
  /** Function to validate the generated content has essential data */
  hasValidContent: (data: TGenerated) => boolean;
  /** Function to build save payload from generated content */
  buildSavePayload: (
    data: TGenerated,
    campaignId: string | null,
  ) => Record<string, unknown>;
  /** Function to build save payload from manual entry data */
  buildManualSavePayload: (
    data: TManual,
    campaignId: string | null,
  ) => Record<string, unknown>;
  /** Default values for manual entry */
  defaultManualData: TManual;
  /** Field name for the entity in the API response (e.g., 'npc', 'monster') */
  entityKey: string;
}

/**
 * State returned by useGenerator hook
 */
export interface GeneratorState<TGenerated, TManual> {
  // Loading and error state
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;

  // Generated content
  generatedData: TGenerated | null;
  setGeneratedData: (data: TGenerated | null) => void;

  // UI state
  showSaveModal: boolean;
  setShowSaveModal: (show: boolean) => void;
  showRawResponse: boolean;
  setShowRawResponse: (show: boolean) => void;
  isSaved: boolean;
  setIsSaved: (saved: boolean) => void;

  // Campaign selection
  campaignId: string | null;
  setCampaignId: (id: string | null) => void;
  handleCampaignSelect: (id: string | null) => void;
  hasUserSelectedCampaign: React.MutableRefObject<boolean>;

  // Entry mode
  entryMode: EntryMode;
  setEntryMode: (mode: EntryMode) => void;

  // Manual entry
  manualData: TManual;
  setManualData: (data: TManual | ((prev: TManual) => TManual)) => void;
  manualSaving: boolean;
  manualSaved: boolean;
  setManualSaved: (saved: boolean) => void;

  // AI settings
  aiSettings: AIGenerationSettings;
  setAiSettings: (settings: AIGenerationSettings) => void;

  // Actions
  generate: (params: Record<string, unknown>) => Promise<void>;
  saveGenerated: () => Promise<void>;
  saveManual: () => Promise<void>;
  resetManualForm: () => void;
}

/**
 * Custom hook for generator components
 * Encapsulates common state management and actions
 */
export function useGenerator<TGenerated, TManual, TParams>(
  config: GeneratorConfig<TGenerated, TManual, TParams>,
): GeneratorState<TGenerated, TManual> {
  // Core state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<TGenerated | null>(null);

  // UI state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Campaign selection
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const hasUserSelectedCampaign = useRef(false);
  const { activeCampaignId } = useCampaignStore();

  // Entry mode
  const [entryMode, setEntryMode] = useState<EntryMode>("ai");

  // Manual entry state
  const [manualData, setManualData] = useState<TManual>(
    config.defaultManualData,
  );
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);

  // AI settings
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: "high",
    timeout: 120,
  });

  // Auto-select active campaign on initial mount
  useEffect(() => {
    if (activeCampaignId && !hasUserSelectedCampaign.current) {
      setCampaignId(activeCampaignId);
    }
  }, [activeCampaignId]);

  // Handle campaign selection
  const handleCampaignSelect = useCallback((id: string | null) => {
    hasUserSelectedCampaign.current = true;
    setCampaignId(id);
  }, []);

  // Generate content
  const generate = useCallback(
    async (params: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      setGeneratedData(null);
      setShowRawResponse(false);
      setIsSaved(false);

      try {
        const fullParams = {
          ...params,
          campaign_id: campaignId || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        } as TParams;

        const data = await config.generateApi(fullParams, aiSettings.timeout);

        // Get the entity from response (e.g., data.npc or data.monster)
        const rawEntity = (data as Record<string, unknown>)[config.entityKey];

        if (rawEntity) {
          const normalized = config.normalizeResponse(
            rawEntity as Record<string, unknown>,
          );

          if (!config.hasValidContent(normalized)) {
            // Add parse error to the result
            (normalized as Record<string, unknown>)._parseError =
              "AI response missing essential content. Showing raw response.";
            setShowRawResponse(true);
          }

          setGeneratedData(normalized);
        } else {
          // No entity wrapper - try to normalize the raw response
          const normalized = config.normalizeResponse(
            data as unknown as Record<string, unknown>,
          );
          (normalized as Record<string, unknown>)._parseError =
            "Unexpected response format. Attempting to display.";
          setShowRawResponse(true);
          setGeneratedData(normalized);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [campaignId, aiSettings, config],
  );

  // Save generated content
  const saveGenerated = useCallback(async () => {
    if (!generatedData) return;

    try {
      const payload = config.buildSavePayload(generatedData, campaignId);
      await config.saveApi(payload);
      setShowSaveModal(false);
      setIsSaved(true);
      emitContentSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [generatedData, campaignId, config]);

  // Save manual entry
  const saveManual = useCallback(async () => {
    setManualSaving(true);
    setError(null);

    try {
      const payload = config.buildManualSavePayload(manualData, campaignId);
      await config.saveApi(payload);
      setManualSaved(true);
      emitContentSaved();
      // Reset form after successful save
      setManualData(config.defaultManualData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setManualSaving(false);
    }
  }, [manualData, campaignId, config]);

  // Reset manual form
  const resetManualForm = useCallback(() => {
    setManualData(config.defaultManualData);
    setManualSaved(false);
  }, [config.defaultManualData]);

  return {
    // Loading and error
    loading,
    error,
    setError,

    // Generated content
    generatedData,
    setGeneratedData,

    // UI state
    showSaveModal,
    setShowSaveModal,
    showRawResponse,
    setShowRawResponse,
    isSaved,
    setIsSaved,

    // Campaign
    campaignId,
    setCampaignId,
    handleCampaignSelect,
    hasUserSelectedCampaign,

    // Entry mode
    entryMode,
    setEntryMode,

    // Manual entry
    manualData,
    setManualData,
    manualSaving,
    manualSaved,
    setManualSaved,

    // AI settings
    aiSettings,
    setAiSettings,

    // Actions
    generate,
    saveGenerated,
    saveManual,
    resetManualForm,
  };
}
