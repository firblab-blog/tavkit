// PC (Player Character) content loader

import type { CampaignContent } from "../types";
import { useCampaignStore } from "@/store/campaignStore";

/**
 * Load player characters linked to the campaign.
 * PCs come from two sources:
 * 1. Characters linked via campaign_characters table
 * 2. Campaign content entries (imported files, notes)
 */
export async function loadPCs(campaignId: string): Promise<CampaignContent[]> {
  const { fetchCampaignCharacters, fetchCampaignContent } =
    useCampaignStore.getState();

  // Fetch characters linked to this campaign via campaign_characters table
  const characters = await fetchCampaignCharacters(campaignId);
  const characterEntries = characters.map((char: any) => {
    // Format character class info for list preview
    const classDisplay = char.class_info || "Unknown Class";

    return {
      id: char.id,
      campaign_id: campaignId,
      user_id: char.user_id || "",
      section: "pcs",
      subsection: null,
      title: char.name,
      // Brief summary for list view
      content: `Level ${char.level || 1} ${char.race || "Unknown"} ${classDisplay}`,
      type: "imported" as "manual" | "imported",
      created_at: char.created_at,
      updated_at: char.updated_at,
      // Store full character data for CharacterSheet component
      characterData: char,
    };
  });

  // Also fetch any campaign_content entries for the PCs section (imported files, notes, etc.)
  const contentEntries = await fetchCampaignContent(campaignId, "pcs", null);

  // Combine both sources - characters first, then content entries
  return [...characterEntries, ...contentEntries];
}
