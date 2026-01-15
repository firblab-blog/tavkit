// Shared types for campaign content

export interface CampaignContent {
  id: string;
  campaign_id: string;
  user_id: string;
  section: string;
  subsection: string | null;
  title: string;
  content: string;
  type: "manual" | "imported";
  created_at: string;
  updated_at: string;
  file_name?: string;
  // Extended data for specific types
  characterData?: any;
  npcData?: any;
  locationData?: any;
}

export type ContentType =
  | "pcs"
  | "npcs"
  | "items"
  | "monsters"
  | "encounters"
  | "dialogues"
  | "rumors"
  | "locations"
  | "quests"
  | "taverns"
  | "merchants"
  | "traps"
  | "critters"
  | "chases";

// Content loader function type
export type ContentLoader = (campaignId: string) => Promise<CampaignContent[]>;
