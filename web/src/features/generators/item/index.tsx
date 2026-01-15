// Item Generator
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
  ItemRenderer,
  formatItemForClipboard,
} from "../renderers/ItemRenderer";
import {
  normalizeItemResponse,
  hasValidItemContent,
  getNumericValue,
  type GeneratedItemData,
} from "../normalizers/item";
import { defaultItemData, type ManualItemData } from "../schemas/item";
import { ItemAIForm } from "./ItemAIForm";
import { ItemManualForm } from "./ItemManualForm";
import {
  generateItem,
  saveItem,
  type ItemGenerationRequest,
} from "@/api/generators";

// ============================================================================
// Configuration
// ============================================================================

type ItemParams = ItemGenerationRequest;

const itemConfig: GeneratorConfig<
  GeneratedItemData,
  ManualItemData,
  ItemParams
> = {
  generateApi: generateItem as unknown as (
    params: ItemParams,
    timeout: number,
  ) => Promise<Record<string, unknown>>,
  saveApi: (data) => saveItem(data as Record<string, unknown>),
  normalizeResponse: normalizeItemResponse,
  hasValidContent: hasValidItemContent,
  entityKey: "item",
  defaultManualData: defaultItemData,

  buildSavePayload: (item, campaignId) => {
    // Convert origin to string for saving
    const originStr =
      typeof item.origin === "string"
        ? item.origin
        : item.origin
          ? JSON.stringify(item.origin)
          : "";

    return {
      name: item.name || "Unnamed Item",
      type: item.type || "weapon",
      rarity: item.rarity || "uncommon",
      description: item.description,
      origin: originStr,
      properties: item.properties || {},
      value: getNumericValue(item.value),
      weight: getNumericValue(item.weight),
      attunement: item.attunement,
      campaign_id: campaignId || undefined,
      ai_generated: true,
    };
  },

  buildManualSavePayload: (data, campaignId) => {
    // Convert properties array to object
    const propertiesObj: Record<string, unknown> = {};
    data.properties
      .filter((p) => p.name.trim())
      .forEach((p) => {
        propertiesObj[p.name] = p.value || true;
      });

    return {
      campaign_id: campaignId || undefined,
      name: data.name.trim(),
      type: data.type,
      rarity: data.rarity,
      description: data.description.trim() || undefined,
      origin: data.origin.trim() || undefined,
      properties: propertiesObj,
      value: data.value ?? 0,
      weight: data.weight ?? 0,
      attunement: data.attunement,
      ai_generated: false,
    };
  },
};

// ============================================================================
// Component
// ============================================================================

export function ItemGenerator() {
  const state = useGenerator(itemConfig);

  // AI form state
  const [formData, setFormData] = useState({
    type: "weapon",
    rarity: "uncommon",
    category: "magical",
    cursed: "no",
    special_requests: "",
  });

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate({
      campaign_id: state.campaignId || undefined,
      type: formData.type,
      rarity: formData.rarity,
      category: formData.category,
      cursed: formData.cursed,
      special_requests: formData.special_requests || undefined,
    });
  }, [state, formData]);

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(
        formatItemForClipboard(state.generatedData),
      );
    }
  }, [state.generatedData]);

  // Build form content based on entry mode
  const formContent =
    state.entryMode === "ai" ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <ItemAIForm
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
        <ItemManualForm
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
    <ItemRenderer
      item={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : state.entryMode === "manual" ? (
    <ManualEntryPreview entityType="Item" />
  ) : null;

  return (
    <>
      <GeneratorLayout
        title="Item Generator"
        description="Create magical items, weapons, armor, and treasures for your campaign"
        icon="Package"
        formTitle={state.entryMode === "ai" ? "Item Details" : "Manual Entry"}
        formIcon={state.entryMode === "ai" ? "Sparkles" : "Edit"}
        resultsTitle={state.entryMode === "ai" ? "Generated Item" : "Preview"}
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Item"
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

export default ItemGenerator;
