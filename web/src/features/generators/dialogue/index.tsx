// Dialogue Generator
// Rebuilt using the generator framework pattern

import { useState, useCallback } from "react";
import { useGenerator, type GeneratorConfig } from "../hooks/useGenerator";
import {
  GeneratorLayout,
  EntryModeToggle,
  ManualEntryPreview,
  SaveModal,
} from "../components";
import {
  DialogueRenderer,
  formatDialogueForClipboard,
} from "../renderers/DialogueRenderer";
import {
  normalizeDialogueResponse,
  hasValidDialogueContent,
  hasValidDialogueTree,
  type GeneratedDialogueData,
} from "../normalizers/dialogue";
import {
  defaultDialogueData,
  defaultDialogueTree,
  type ManualDialogueData,
} from "../schemas/dialogue";
import { DialogueAIForm, type DialogueFormData } from "./DialogueAIForm";
import { DialogueManualForm } from "./DialogueManualForm";
import {
  generateDialogue,
  saveDialogue,
  type DialogueGenerationRequest,
} from "@/api/generators";

// ============================================================================
// Configuration
// ============================================================================

type DialogueParams = DialogueGenerationRequest;

const dialogueConfig: GeneratorConfig<
  GeneratedDialogueData,
  ManualDialogueData,
  DialogueParams
> = {
  generateApi: generateDialogue as unknown as (
    params: DialogueParams,
    timeout: number,
  ) => Promise<Record<string, unknown>>,
  saveApi: (data) => saveDialogue(data as Record<string, unknown>),
  normalizeResponse: (raw) => {
    // API returns { dialogue: {...} }
    if (raw.dialogue && typeof raw.dialogue === "object") {
      const normalized = normalizeDialogueResponse(
        raw.dialogue as Record<string, unknown>,
      );
      // Check if we got a valid dialogue tree
      if (!hasValidDialogueTree(normalized.dialogue_tree)) {
        normalized._parseError =
          "AI response missing dialogue tree structure. Showing raw response.";
      }
      return normalized;
    }
    // No dialogue wrapper - try to normalize the raw response
    const normalized = normalizeDialogueResponse(raw);
    normalized._parseError =
      "Unexpected response format. Attempting to display.";
    return normalized;
  },
  hasValidContent: hasValidDialogueContent,
  entityKey: "dialogue",
  defaultManualData: defaultDialogueData,

  buildSavePayload: (dialogue, campaignId) => ({
    character_name: dialogue.character_name || "Unnamed Character",
    scene_setting: dialogue.scene_setting || "",
    mood: dialogue.mood || "",
    dialogue_tree: dialogue.dialogue_tree || defaultDialogueTree,
    skill_checks: dialogue.skill_checks || [],
    information: dialogue.information_revealed || [],
    potential_quests: dialogue.potential_quests || [],
    campaign_id: campaignId || undefined,
    ai_generated: true,
  }),

  buildManualSavePayload: (data, campaignId) => {
    // Convert skill_checks to proper format (filter out empty ones and fix dc)
    const skillChecks = data.skill_checks
      .filter((sc) => sc.skill.trim())
      .map((sc) => ({
        skill: sc.skill,
        dc: sc.dc ?? 10,
        success: sc.success,
        failure: sc.failure,
      }));

    return {
      character_name: data.character_name.trim(),
      scene_setting: data.scene_setting.trim() || undefined,
      mood: data.mood || undefined,
      dialogue_tree: data.dialogue_tree,
      skill_checks: skillChecks.length > 0 ? skillChecks : undefined,
      information: data.information_revealed.filter((i) => i.trim()),
      potential_quests: data.potential_quests.filter((q) => q.trim()),
      campaign_id: campaignId || undefined,
      ai_generated: false,
    };
  },
};

// ============================================================================
// Component
// ============================================================================

export function DialogueGenerator() {
  const state = useGenerator(dialogueConfig);

  // AI form state
  const [formData, setFormData] = useState<DialogueFormData>({
    character_name: "",
    dialogue_type: "random",
    personality: "random",
    tone: "random",
    complexity: "moderate",
    special_requests: "",
  });

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate({
      campaign_id: state.campaignId || undefined,
      character_name: formData.character_name.trim() || undefined,
      dialogue_type:
        formData.dialogue_type !== "random"
          ? formData.dialogue_type
          : "quest_giver",
      npc_personality:
        formData.personality !== "random" ? formData.personality : "friendly",
      mood: formData.tone !== "random" ? formData.tone : "casual",
      complexity: formData.complexity || "moderate",
      scene_setting: undefined,
      special_requests: formData.special_requests.trim() || undefined,
    });
  }, [state, formData]);

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(
        formatDialogueForClipboard(state.generatedData),
      );
    }
  }, [state.generatedData]);

  // Build form content based on entry mode
  const formContent =
    state.entryMode === "ai" ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <DialogueAIForm
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
        <DialogueManualForm
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
    <DialogueRenderer
      dialogue={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : state.entryMode === "manual" ? (
    <ManualEntryPreview entityType="Dialogue" />
  ) : null;

  return (
    <>
      <GeneratorLayout
        title="Dialogue Builder"
        description="Create branching NPC dialogues with skill checks and outcomes"
        icon="MessageCircle"
        formTitle={
          state.entryMode === "ai" ? "Dialogue Parameters" : "Manual Entry"
        }
        formIcon={state.entryMode === "ai" ? "Settings" : "Edit"}
        resultsTitle={
          state.entryMode === "ai" ? "Generated Dialogue" : "Preview"
        }
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Dialogue"
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
          entityName={state.generatedData.character_name}
          campaignId={state.campaignId}
        />
      )}
    </>
  );
}

export default DialogueGenerator;
