// Rumor content loader

import type { CampaignContent } from "../types";
import { fetchContentData } from "./utils";

export async function loadRumors(
  campaignId: string,
): Promise<CampaignContent[]> {
  const rumors = await fetchContentData<any>("rumors", campaignId, "rumors");

  return rumors.map((rumor: any) => ({
    id: rumor.id,
    campaign_id: campaignId,
    user_id: rumor.user_id || "",
    section: "rumors",
    subsection: null,
    title: rumor.source || "Rumor",
    content: [
      rumor.source ? `**Source:** ${rumor.source}  ` : "",
      rumor.veracity ? `**Veracity:** ${rumor.veracity}  ` : "",
      rumor.context ? `**Context:** ${rumor.context}  ` : "",
      rumor.leads_to ? `**Leads To:** ${rumor.leads_to}  ` : "",
      "",
      `**Text:** ${rumor.text || rumor.content || ""}`,
    ]
      .filter(Boolean)
      .join("\n"),
    type: (rumor.ai_generated ? "imported" : "manual") as "manual" | "imported",
    created_at: rumor.created_at,
    updated_at: rumor.created_at,
  }));
}
