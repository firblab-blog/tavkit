// Tavern Generator
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
  TavernRenderer,
  formatTavernForClipboard,
} from "../renderers/TavernRenderer";
import {
  normalizeTavernResponse,
  hasValidTavernContent,
  type GeneratedTavernData,
} from "../normalizers/tavern";
import { defaultTavernData, type ManualTavernData } from "../schemas/tavern";
import { TavernAIForm } from "./TavernAIForm";
import { TavernManualForm } from "./TavernManualForm";
import {
  generateTavern,
  saveTavern,
  type TavernGenerationRequest,
} from "@/api/generators";

// ============================================================================
// Configuration
// ============================================================================

type TavernParams = TavernGenerationRequest;

const tavernConfig: GeneratorConfig<
  GeneratedTavernData,
  ManualTavernData,
  TavernParams
> = {
  generateApi: generateTavern as unknown as (
    params: TavernParams,
    timeout: number,
  ) => Promise<Record<string, unknown>>,
  saveApi: (data) => saveTavern(data as Record<string, unknown>),
  normalizeResponse: normalizeTavernResponse,
  hasValidContent: hasValidTavernContent,
  entityKey: "tavern",
  defaultManualData: defaultTavernData,

  buildSavePayload: (tavern, campaignId) => ({
    name: tavern.name || "Unnamed Tavern",
    type: tavern.type || "tavern",
    atmosphere: tavern.atmosphere,
    description: tavern.description,
    keeper_name: tavern.keeper_name,
    keeper_personality: tavern.keeper_personality,
    keeper_description: tavern.keeper_description,
    menu_food: tavern.menu_food,
    menu_drinks: tavern.menu_drinks,
    rooms: tavern.rooms,
    patrons: tavern.patrons,
    events: tavern.events,
    rumors: tavern.rumors,
    special_notes: tavern.special_notes,
    campaign_id: campaignId || undefined,
    ai_generated: true,
  }),

  buildManualSavePayload: (data, campaignId) => ({
    campaign_id: campaignId || undefined,
    name: data.name.trim(),
    type: data.tavern_type,
    atmosphere: data.atmosphere.trim() || "",
    description: data.description.trim() || "",
    keeper_name: data.owner_name.trim() || "",
    keeper_personality: "",
    keeper_description: data.owner_description.trim() || "",
    menu_food: data.menu_items
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name,
        description: m.description,
        price: m.price,
      })),
    menu_drinks: [],
    rooms: [],
    patrons: data.regular_patrons
      .filter((p) => p.trim())
      .map((p) => ({ name: p, race: "", description: "" })),
    events: [],
    rumors: data.rumors.filter((r) => r.trim()),
    special_notes: data.secrets.filter((s) => s.trim()).join("\n"),
    ai_generated: false,
  }),
};

// ============================================================================
// Component
// ============================================================================

export function TavernGenerator() {
  const state = useGenerator(tavernConfig);

  // AI form state
  const [formData, setFormData] = useState({
    tavern_type: "tavern",
    quality: "average",
    size: "medium",
    special_requests: "",
  });

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate({
      campaign_id: state.campaignId || undefined,
      type: formData.tavern_type,
      quality: formData.quality,
      size: formData.size,
      special_requests: formData.special_requests || undefined,
    });
  }, [state, formData]);

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(
        formatTavernForClipboard(state.generatedData),
      );
    }
  }, [state.generatedData]);

  // Build form content based on entry mode
  const formContent =
    state.entryMode === "ai" ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <TavernAIForm
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
        <TavernManualForm
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
    <TavernRenderer
      tavern={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : state.entryMode === "manual" ? (
    <ManualEntryPreview entityType="Tavern" />
  ) : null;

  return (
    <>
      <GeneratorLayout
        title="Tavern Generator"
        description="Generate taverns, inns, and drinking establishments for your campaign"
        icon="Beer"
        formTitle={
          state.entryMode === "ai" ? "Establishment Details" : "Manual Entry"
        }
        formIcon={state.entryMode === "ai" ? "Sparkles" : "Edit"}
        resultsTitle={state.entryMode === "ai" ? "Generated Tavern" : "Preview"}
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Tavern"
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

export default TavernGenerator;
