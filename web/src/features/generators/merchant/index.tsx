// Merchant Generator
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
  MerchantRenderer,
  formatMerchantForClipboard,
} from "../renderers/MerchantRenderer";
import {
  normalizeMerchantResponse,
  hasValidMerchantContent,
  type GeneratedMerchantData,
} from "../normalizers/merchant";
import {
  defaultMerchantData,
  type ManualMerchantData,
} from "../schemas/merchant";
import { MerchantAIForm } from "./MerchantAIForm";
import { MerchantManualForm } from "./MerchantManualForm";
import {
  generateMerchant,
  saveMerchant,
  type MerchantGenerationRequest,
} from "@/api/generators";

// ============================================================================
// Configuration
// ============================================================================

type MerchantParams = MerchantGenerationRequest;

const merchantConfig: GeneratorConfig<
  GeneratedMerchantData,
  ManualMerchantData,
  MerchantParams
> = {
  generateApi: generateMerchant as unknown as (
    params: MerchantParams,
    timeout: number,
  ) => Promise<Record<string, unknown>>,
  saveApi: (data) => saveMerchant(data as Record<string, unknown>),
  normalizeResponse: normalizeMerchantResponse,
  hasValidContent: hasValidMerchantContent,
  entityKey: "merchant",
  defaultManualData: defaultMerchantData,

  buildSavePayload: (merchant, campaignId) => ({
    name: merchant.name || "Unnamed Shop",
    shop_type: merchant.shop_type || "general_store",
    atmosphere: merchant.atmosphere,
    description: merchant.description,
    location: merchant.location,
    owner_name: merchant.owner_name,
    owner_personality: merchant.owner_personality,
    owner_description: merchant.owner_description,
    inventory: merchant.inventory,
    services: merchant.services,
    special_items: merchant.special_items,
    rumors: merchant.rumors,
    recently_sold: merchant.recently_sold,
    special_notes: merchant.special_notes,
    haggle_willingness: merchant.haggle_willingness,
    campaign_id: campaignId || undefined,
    ai_generated: true,
  }),

  buildManualSavePayload: (data, campaignId) => ({
    campaign_id: campaignId || undefined,
    name: data.name.trim(),
    shop_type: data.merchant_type,
    atmosphere: "",
    description: data.description.trim() || "",
    location: "",
    owner_name: data.name.trim(),
    owner_personality: data.personality.trim() || "",
    owner_description: data.appearance.trim() || "",
    inventory: data.inventory
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name,
        description: i.description,
        price: i.price,
      })),
    services: data.services
      .filter((s) => s.trim())
      .map((s) => ({ name: s, description: "", price: "varies" })),
    special_items: data.specialties
      .filter((s) => s.trim())
      .map((s) => ({ name: s, description: "", price: "varies" })),
    rumors: data.rumors.filter((r) => r.trim()),
    recently_sold: [],
    special_notes: data.quirks.filter((q) => q.trim()).join("; "),
    haggle_willingness: "",
    ai_generated: false,
  }),
};

// ============================================================================
// Component
// ============================================================================

export function MerchantGenerator() {
  const state = useGenerator(merchantConfig);

  // AI form state
  const [formData, setFormData] = useState({
    shop_type: "general_store",
    quality: "average",
    size: "medium",
    party_level: 5,
    special_requests: "",
  });

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate({
      campaign_id: state.campaignId || undefined,
      shop_type: formData.shop_type,
      quality: formData.quality,
      size: formData.size,
      party_level: String(formData.party_level),
      special_requests: formData.special_requests || undefined,
    });
  }, [state, formData]);

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(
        formatMerchantForClipboard(state.generatedData),
      );
    }
  }, [state.generatedData]);

  // Build form content based on entry mode
  const formContent =
    state.entryMode === "ai" ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <MerchantAIForm
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
        <MerchantManualForm
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
    <MerchantRenderer
      merchant={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : state.entryMode === "manual" ? (
    <ManualEntryPreview entityType="Merchant" />
  ) : null;

  return (
    <>
      <GeneratorLayout
        title="Merchant & Shop Generator"
        description="Generate merchants, shops, and trading posts for your campaign"
        icon="Package"
        formTitle={state.entryMode === "ai" ? "Shop Details" : "Manual Entry"}
        formIcon={state.entryMode === "ai" ? "Sparkles" : "Edit"}
        resultsTitle={
          state.entryMode === "ai" ? "Generated Merchant" : "Preview"
        }
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Merchant"
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

export default MerchantGenerator;
