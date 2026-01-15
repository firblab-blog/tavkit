// Chase Generator
// Rebuilt using the generator framework pattern

import { useState, useCallback, useRef, useMemo } from "react";
import { useGenerator, type GeneratorConfig } from "../hooks/useGenerator";
import {
  GeneratorLayout,
  EntryModeToggle,
  ManualEntryPreview,
  SaveModal,
} from "../components";
import {
  ChaseRenderer,
  formatChaseForClipboard,
} from "../renderers/ChaseRenderer";
import {
  normalizeChaseResponse,
  hasValidChaseContent,
  type GeneratedChaseData,
} from "../normalizers/chase";
import { defaultChaseData, type ManualChaseData } from "../schemas/chase";
import { ChaseAIForm, type ChaseFormData } from "./ChaseAIForm";
import { ChaseManualForm } from "./ChaseManualForm";
import {
  generateChaseScenario,
  saveChase,
  type ChaseGenerationRequest,
} from "@/api/generators";

// ============================================================================
// Component
// ============================================================================

export function ChaseGenerator() {
  // AI form state
  const [formData, setFormData] = useState<ChaseFormData>({
    chase_type: "foot_chase",
    terrain: "urban",
    difficulty: "medium",
    party_level: 5,
    special_requests: "",
  });

  // Ref to track current form data for use in config closures
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Create config with refs to access current form state
  const chaseConfig = useMemo(
    (): GeneratorConfig<
      GeneratedChaseData,
      ManualChaseData,
      ChaseGenerationRequest
    > => ({
      generateApi: generateChaseScenario as unknown as (
        params: ChaseGenerationRequest,
        timeout: number,
      ) => Promise<Record<string, unknown>>,
      saveApi: (data: unknown) => saveChase(data as Record<string, unknown>),
      normalizeResponse: (raw: Record<string, unknown>) => {
        // API returns { chase: {...} }
        if (raw.chase && typeof raw.chase === "object") {
          const normalized = normalizeChaseResponse(
            raw.chase as Record<string, unknown>,
          );
          if (!hasValidChaseContent(normalized)) {
            normalized._parseError =
              "AI response missing essential chase content. Showing raw response.";
          }
          return normalized;
        }
        // No chase wrapper - try to normalize the raw response
        const normalized = normalizeChaseResponse(raw);
        normalized._parseError =
          "Unexpected response format. Attempting to display.";
        return normalized;
      },
      hasValidContent: hasValidChaseContent,
      entityKey: "chase",
      defaultManualData: defaultChaseData,

      buildSavePayload: (
        chase: GeneratedChaseData,
        campaignId: string | null,
      ) => {
        const currentForm = formDataRef.current;
        return {
          campaign_id: campaignId || undefined,
          name: chase.name || "Unnamed Chase",
          chase_type: chase.chase_type || currentForm.chase_type,
          terrain: chase.terrain || currentForm.terrain,
          difficulty: chase.difficulty || currentForm.difficulty,
          description: chase.description || "",
          setting: chase.setting || "",
          participants: chase.participants || {},
          starting_conditions: chase.starting_conditions || "",
          obstacles: chase.obstacles || [],
          complications: chase.complications || [],
          shortcuts: chase.shortcuts || [],
          chase_phases: chase.chase_phases || [],
          ending_conditions: chase.ending_conditions || {},
          rewards: chase.rewards || {},
          special_rules: chase.special_rules || "",
          environmental_factors: chase.environmental_factors || [],
          ai_generated: true,
          starting_distance: 3,
          catch_threshold: 0,
          escape_threshold: 7,
        };
      },

      buildManualSavePayload: (
        data: ManualChaseData,
        campaignId: string | null,
      ) => ({
        campaign_id: campaignId || undefined,
        name: data.name.trim(),
        chase_type: data.chase_type,
        terrain: data.terrain,
        difficulty: data.difficulty,
        description: data.description.trim() || "",
        setting: data.setting.trim() || "",
        participants: { quarry: data.quarry, pursuers: data.pursuers },
        starting_conditions: data.starting_conditions.trim() || "",
        obstacles: data.obstacles.filter((o) => o.name.trim()),
        complications: data.complications.filter((c: string) => c.trim()),
        shortcuts: data.shortcuts.filter((s) => s.name.trim()),
        ending_conditions: {
          success: data.success_condition,
          failure: data.failure_condition,
          alternative: "",
        },
        rewards: {
          success: data.success_reward,
          partial: "",
          failure: data.failure_consequence,
        },
        environmental_factors: data.environmental_factors.filter((e: string) =>
          e.trim(),
        ),
        ai_generated: false,
        starting_distance: 3,
        catch_threshold: 0,
        escape_threshold: 7,
      }),
    }),
    [],
  );

  const state = useGenerator(chaseConfig);

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate({
      campaign_id: state.campaignId || undefined,
      chase_type: formData.chase_type,
      terrain: formData.terrain,
      difficulty: formData.difficulty,
      party_level: String(
        typeof formData.party_level === "number" ? formData.party_level : 5,
      ),
      special_requests: formData.special_requests || undefined,
    });
  }, [state, formData]);

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(
        formatChaseForClipboard(state.generatedData),
      );
    }
  }, [state.generatedData]);

  // Build form content based on entry mode
  const formContent =
    state.entryMode === "ai" ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <ChaseAIForm
          campaignId={state.campaignId}
          onCampaignSelect={state.handleCampaignSelect}
          formData={formData}
          setFormData={setFormData}
          aiSettings={state.aiSettings}
          setAiSettings={state.setAiSettings}
        />
      </>
    ) : (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <ChaseManualForm
          campaignId={state.campaignId}
          onCampaignSelect={state.handleCampaignSelect}
          manualData={state.manualData}
          setManualData={state.setManualData}
          onSave={state.saveManual}
          saving={state.manualSaving}
          saved={state.manualSaved}
          error={state.error}
        />
      </>
    );

  // Build result content
  const resultContent = state.generatedData ? (
    <ChaseRenderer
      chase={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : state.entryMode === "manual" ? (
    <ManualEntryPreview entityType="Chase" />
  ) : null;

  return (
    <>
      <GeneratorLayout
        title="Chase & Pursuit Generator"
        description="Generate exciting chase sequences and pursuit scenes"
        icon="Zap"
        formTitle={state.entryMode === "ai" ? "Chase Details" : "Manual Entry"}
        formIcon={state.entryMode === "ai" ? "Settings" : "Edit"}
        resultsTitle={state.entryMode === "ai" ? "Generated Chase" : "Preview"}
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Chase"
        generateButtonIcon="Sparkles"
        error={
          state.entryMode === "ai" ? (state.error ?? undefined) : undefined
        }
        hideGenerateButton={state.entryMode === "manual"}
      />

      {/* Save Modal */}
      {state.generatedData && (
        <SaveModal
          isOpen={state.showSaveModal}
          onClose={() => state.setShowSaveModal(false)}
          onSave={state.saveGenerated}
          entityName={state.generatedData.name}
          campaignId={state.campaignId}
        />
      )}
    </>
  );
}

export default ChaseGenerator;
