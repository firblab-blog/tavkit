// Critter Generator
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
  CritterRenderer,
  formatCritterForClipboard,
} from "../renderers/CritterRenderer";
import {
  normalizeCritterResponse,
  hasValidCritterContent,
  type GeneratedCritterData,
} from "../normalizers/critter";
import { defaultCritterData, type ManualCritterData } from "../schemas/critter";
import { CritterAIForm, type CritterFormData } from "./CritterAIForm";
import { CritterManualForm } from "./CritterManualForm";
import {
  generateCritter,
  saveCritter,
  type CritterGenerationRequest,
} from "@/api/generators";

// ============================================================================
// Configuration
// ============================================================================

type CritterParams = CritterGenerationRequest;

const critterConfig: GeneratorConfig<
  GeneratedCritterData,
  ManualCritterData,
  CritterParams
> = {
  generateApi: generateCritter as unknown as (
    params: CritterParams,
    timeout: number,
  ) => Promise<Record<string, unknown>>,
  saveApi: (data) => saveCritter(data as Record<string, unknown>),
  normalizeResponse: (raw) => {
    // API returns { critter: {...} }
    if (raw.critter && typeof raw.critter === "object") {
      return normalizeCritterResponse(raw.critter as Record<string, unknown>);
    }
    return normalizeCritterResponse(raw);
  },
  hasValidContent: hasValidCritterContent,
  entityKey: "critter",
  defaultManualData: defaultCritterData,

  buildSavePayload: (critter, campaignId) => ({
    name: critter.name || "Unnamed Critter",
    species: critter.species || "",
    critter_type: critter.critter_type,
    size: critter.size,
    temperament: critter.temperament,
    habitat: critter.habitat,
    description: critter.description || "",
    behavior: critter.behavior || "",
    stats: critter.stats || {},
    special_abilities: critter.special_abilities || [],
    uses: critter.uses || [],
    training_difficulty: critter.training_difficulty || "",
    diet: critter.diet || "",
    lifespan: critter.lifespan || "",
    interesting_facts: critter.interesting_facts || [],
    encounter_notes: critter.encounter_notes || "",
    campaign_id: campaignId || undefined,
    ai_generated: true,
  }),

  buildManualSavePayload: (data, campaignId) => ({
    name: data.name,
    species: data.species || "",
    critter_type: data.critter_type,
    size: data.size,
    temperament: data.temperament,
    habitat: data.habitat,
    description: data.description || "",
    behavior: data.behavior || "",
    stats: data.stats || {},
    special_abilities: data.special_abilities || [],
    uses: data.uses || [],
    training_difficulty: data.training_difficulty || "",
    diet: data.diet || "",
    lifespan: data.lifespan || "",
    interesting_facts: data.interesting_facts || [],
    encounter_notes: data.encounter_notes || "",
    campaign_id: campaignId || undefined,
    ai_generated: false,
  }),
};

// ============================================================================
// Component
// ============================================================================

export function CritterGenerator() {
  const state = useGenerator(critterConfig);

  // AI form state
  const [formData, setFormData] = useState<CritterFormData>({
    critter_type: "mammal",
    size: "medium",
    temperament: "neutral",
    habitat: "forest",
    special_requests: "",
  });

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate({
      campaign_id: state.campaignId || undefined,
      critter_type: formData.critter_type,
      size: formData.size,
      temperament: formData.temperament,
      habitat: formData.habitat,
      special_requests: formData.special_requests || undefined,
    });
  }, [state, formData]);

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(
        formatCritterForClipboard(state.generatedData),
      );
    }
  }, [state.generatedData]);

  // Build form content based on entry mode
  const formContent =
    state.entryMode === "ai" ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <CritterAIForm
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
        <CritterManualForm
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
    <CritterRenderer
      critter={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : state.entryMode === "manual" ? (
    <ManualEntryPreview entityType="Critter" />
  ) : null;

  return (
    <>
      <GeneratorLayout
        title="Critter Generator"
        description="Generate wildlife, companions, and creatures for your campaign"
        icon="PawPrint"
        formTitle={
          state.entryMode === "ai" ? "Critter Details" : "Manual Entry"
        }
        formIcon={state.entryMode === "ai" ? "Settings" : "Edit"}
        resultsTitle={
          state.entryMode === "ai" ? "Generated Critter" : "Preview"
        }
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Critter"
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

export default CritterGenerator;
