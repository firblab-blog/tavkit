// NPC Generator
// Rebuilt using the generator framework pattern

import { useState, useCallback } from "react";
import { useGenerator, type GeneratorConfig } from "../hooks/useGenerator";
import {
  GeneratorLayout,
  EntryModeToggle,
  ManualEntryPreview,
  SaveModal,
} from "../components";
import { NPCRenderer, formatNPCForClipboard } from "../renderers/NPCRenderer";
import {
  normalizeNPCResponse,
  hasValidNPCContent,
  type GeneratedNPCData,
} from "../normalizers/npc";
import { defaultNPCData, type ManualNPCData } from "../schemas/npc";
import { NPCAIForm } from "./NPCAIForm";
import { NPCManualForm } from "./NPCManualForm";
import {
  generateNPC,
  saveNPC,
  type NPCGenerationRequest,
} from "@/api/generators";

// ============================================================================
// Configuration
// ============================================================================

type NPCParams = NPCGenerationRequest;

const npcConfig: GeneratorConfig<GeneratedNPCData, ManualNPCData, NPCParams> = {
  generateApi: generateNPC as unknown as (
    params: NPCParams,
    timeout: number,
  ) => Promise<Record<string, unknown>>,
  saveApi: (data) => saveNPC(data as Parameters<typeof saveNPC>[0]),
  normalizeResponse: normalizeNPCResponse,
  hasValidContent: hasValidNPCContent,
  entityKey: "npc",
  defaultManualData: defaultNPCData,

  buildSavePayload: (npc, campaignId) => ({
    name: npc.name,
    race: npc.race,
    class: npc.class,
    personality: npc.personality.traits.join(", "),
    backstory: npc.background,
    stats: {
      level: npc.level,
      alignment: npc.alignment,
      abilities: npc.abilities,
      combat: npc.combat,
      skills: npc.skills,
      equipment: npc.equipment,
      plot_hooks: npc.plot_hooks,
      appearance: npc.appearance,
      motivation: npc.motivation,
      role: npc.role,
      personality: npc.personality,
    },
    campaign_id: campaignId || undefined,
    ai_generated: true,
  }),

  buildManualSavePayload: (data, campaignId) => ({
    name: data.name,
    race: data.race,
    class: data.class || "commoner",
    personality: data.personality || data.traits.join(", "),
    backstory: data.backstory,
    stats: {
      level: data.level,
      abilities: {
        STR: data.stats.str,
        DEX: data.stats.dex,
        CON: data.stats.con,
        INT: data.stats.int,
        WIS: data.stats.wis,
        CHA: data.stats.cha,
      },
      combat: {
        ac: data.stats.ac,
        hp: data.stats.hp,
        speed: data.stats.speed,
      },
      skills: data.skills,
      equipment: data.equipment,
      plot_hooks: data.plot_hooks,
      appearance: data.appearance,
      motivation: data.motivation,
      occupation: data.occupation,
      voice_notes: data.voice_notes,
      personality: {
        traits: data.traits,
        ideals: data.ideals,
        bonds: data.bonds,
        flaws: data.flaws,
      },
    },
    campaign_id: campaignId || undefined,
    ai_generated: false,
  }),
};

// ============================================================================
// Component
// ============================================================================

export function NPCGenerator() {
  const state = useGenerator(npcConfig);

  // AI form state
  const [formData, setFormData] = useState({
    race: "human",
    class: "",
    level: 5,
    role: "ally",
    personality: "",
    special_requests: "",
  });

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate(formData);
  }, [state, formData]);

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(formatNPCForClipboard(state.generatedData));
    }
  }, [state.generatedData]);

  // Build form content based on entry mode
  const formContent =
    state.entryMode === "ai" ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <NPCAIForm
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
        <NPCManualForm
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
    <NPCRenderer
      npc={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : state.entryMode === "manual" ? (
    <ManualEntryPreview entityType="NPC" />
  ) : null;

  return (
    <>
      <GeneratorLayout
        title="NPC Generator"
        description="Create detailed NPCs for your campaign with AI assistance or manual entry"
        icon="Users"
        formTitle={
          state.entryMode === "ai" ? "Generation Parameters" : "Manual Entry"
        }
        formIcon={state.entryMode === "ai" ? "Sparkles" : "Edit"}
        resultsTitle={state.entryMode === "ai" ? "Generated NPC" : "Preview"}
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate NPC"
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

export default NPCGenerator;
