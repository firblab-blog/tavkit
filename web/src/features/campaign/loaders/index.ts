// Content loaders barrel export

import type { CampaignContent, ContentType } from "../types";

export { loadPCs } from "./pcs";
export { loadNPCs } from "./npcs";
export { loadItems } from "./items";
export { loadMonsters } from "./monsters";
export { loadEncounters } from "./encounters";
export { loadDialogues } from "./dialogues";
export { loadRumors } from "./rumors";
export { loadLocations } from "./locations";
export { loadQuests } from "./quests";
export { loadTaverns } from "./taverns";
export { loadMerchants } from "./merchants";
export { loadTraps } from "./traps";
export { loadCritters } from "./critters";
export { loadChases } from "./chases";

// Re-export utils
export * from "./utils";

// Loader function type
type ContentLoader = (campaignId: string) => Promise<CampaignContent[]>;

// Import all loaders
import { loadPCs } from "./pcs";
import { loadNPCs } from "./npcs";
import { loadItems } from "./items";
import { loadMonsters } from "./monsters";
import { loadEncounters } from "./encounters";
import { loadDialogues } from "./dialogues";
import { loadRumors } from "./rumors";
import { loadLocations } from "./locations";
import { loadQuests } from "./quests";
import { loadTaverns } from "./taverns";
import { loadMerchants } from "./merchants";
import { loadTraps } from "./traps";
import { loadCritters } from "./critters";
import { loadChases } from "./chases";

/**
 * Map of content types to their loader functions
 */
export const contentLoaders: Record<ContentType, ContentLoader> = {
  pcs: loadPCs,
  npcs: loadNPCs,
  items: loadItems,
  monsters: loadMonsters,
  encounters: loadEncounters,
  dialogues: loadDialogues,
  rumors: loadRumors,
  locations: loadLocations,
  quests: loadQuests,
  taverns: loadTaverns,
  merchants: loadMerchants,
  traps: loadTraps,
  critters: loadCritters,
  chases: loadChases,
};

/**
 * Load content for a specific type
 */
export async function loadContent(
  campaignId: string,
  contentType: ContentType,
): Promise<CampaignContent[]> {
  const loader = contentLoaders[contentType];
  if (!loader) {
    throw new Error(`No loader found for content type: ${contentType}`);
  }
  return loader(campaignId);
}
