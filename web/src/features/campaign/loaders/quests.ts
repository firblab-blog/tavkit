// Quest content loader

import type { CampaignContent } from "../types";
import { fetchContentData, parseJSONField } from "./utils";

function formatArrayOrObject(field: any): string {
  if (!field) return "";
  const parsed = parseJSONField<any>(field);
  if (Array.isArray(parsed)) {
    return parsed
      .map((item: any) => {
        if (typeof item === "string") return `- ${item}`;
        if (typeof item === "object") {
          return Object.entries(item)
            .map(([key, value]) => `- **${key}:** ${value}`)
            .join("\n");
        }
        return `- ${String(item)}`;
      })
      .join("\n");
  } else if (typeof parsed === "object") {
    return Object.entries(parsed)
      .map(([key, value]) => `- **${key}:** ${value}`)
      .join("\n");
  }
  return String(field);
}

export async function loadQuests(
  campaignId: string,
): Promise<CampaignContent[]> {
  const quests = await fetchContentData<any>("quests", campaignId, "quests");

  return quests.map((quest: any) => ({
    id: quest.id,
    campaign_id: campaignId,
    user_id: quest.user_id || "",
    section: "quests",
    subsection: null,
    title: quest.title || quest.name,
    content: [
      `**Status:** ${quest.status || "N/A"}`,
      `**Type:** ${quest.type || "N/A"}`,
      quest.category ? `**Category:** ${quest.category}` : "",
      quest.party_level ? `**Party Level:** ${quest.party_level}` : "",
      quest.faction_alignment ? `**Faction:** ${quest.faction_alignment}` : "",
      quest.time_limit ? `**Time Limit:** ${quest.time_limit}` : "",
      quest.combat_intensity
        ? `**Combat Intensity:** ${quest.combat_intensity}`
        : "",
      "",
      `**Description:**\n${quest.description || "N/A"}`,
      quest.objectives
        ? `\n**Objectives:**\n${formatArrayOrObject(quest.objectives)}`
        : "",
      quest.rewards
        ? `\n**Rewards:**\n${formatArrayOrObject(quest.rewards)}`
        : "",
      quest.complications
        ? `\n**Complications:**\n${formatArrayOrObject(quest.complications)}`
        : "",
      quest.npcs_involved
        ? `\n**NPCs Involved:**\n${formatArrayOrObject(quest.npcs_involved)}`
        : "",
      quest.locations_involved
        ? `\n**Locations:**\n${formatArrayOrObject(quest.locations_involved)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    type: (quest.ai_generated ? "imported" : "manual") as "manual" | "imported",
    created_at: quest.created_at,
    updated_at: quest.created_at,
  }));
}
