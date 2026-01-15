// NPC content loader

import type { CampaignContent } from "../types";
import { fetchContentData, parseJSONField, formatAbilityScores } from "./utils";

interface NPCStats {
  level?: number;
  alignment?: string;
  abilities?: Record<string, number>;
  skills?: string[];
  equipment?: string[];
  role?: string;
  plot_hooks?: string[];
}

export async function loadNPCs(campaignId: string): Promise<CampaignContent[]> {
  const npcs = await fetchContentData<any>("npcs", campaignId, "npcs");

  return npcs.map((npc: any) => {
    let statsDisplay = "";
    const stats = parseJSONField<NPCStats>(npc.stats);

    if (stats) {
      if (stats.abilities) {
        statsDisplay += `\n\n**Ability Scores:**\n${formatAbilityScores(stats.abilities)}`;
      }
      if (stats.level) statsDisplay += `\n\n**Level:** ${stats.level}`;
      if (stats.alignment)
        statsDisplay += ` | **Alignment:** ${stats.alignment}`;
      if (stats.role) statsDisplay += `\n\n**Role:** ${stats.role}`;
      if (stats.skills?.length) {
        statsDisplay += `\n\n**Skills:** ${stats.skills.join(", ")}`;
      }
      if (stats.equipment?.length) {
        statsDisplay += `\n\n**Equipment:**\n${stats.equipment.map((e: string) => `- ${e}`).join("\n")}`;
      }
      if (stats.plot_hooks?.length) {
        statsDisplay += `\n\n**Plot Hooks:**\n${stats.plot_hooks.map((h: string) => `- ${h}`).join("\n")}`;
      }
    }

    // Format personality with line breaks
    let personalityFormatted = npc.personality || "N/A";
    if (npc.personality) {
      personalityFormatted = npc.personality
        .replace(/^Traits:\s*/g, "**Traits:** ")
        .replace(/\s+Ideals:\s*/g, "\n\n**Ideals:** ")
        .replace(/\s+Bonds:\s*/g, "\n\n**Bonds:** ")
        .replace(/\s+Flaws:\s*/g, "\n\n**Flaws:** ");
    }

    // Format backstory
    let backstoryFormatted = npc.backstory || "N/A";
    if (npc.backstory) {
      backstoryFormatted = npc.backstory.replace(
        /\s*Motivation:\s*/g,
        "\n\n**Motivation:** ",
      );
    }

    return {
      id: npc.id,
      campaign_id: campaignId,
      user_id: npc.user_id || "",
      section: "npcs",
      subsection: null,
      title: npc.name,
      content: `**Race:** ${npc.race || "N/A"} | **Class:** ${npc.class || "N/A"}${statsDisplay}\n\n${personalityFormatted}\n\n**Backstory:**\n${backstoryFormatted}`,
      type: (npc.ai_generated ? "imported" : "manual") as "manual" | "imported",
      created_at: npc.created_at,
      updated_at: npc.created_at,
      npcData: npc,
    };
  });
}
