import { IconName } from "@/components/common/Icon";

export interface ContentTypeConfig {
  id: string;
  label: string;
  icon: IconName;
  color: string;
}

/**
 * All generator content types that can appear in campaign tabs.
 * Order matters - this is the display order in settings and tabs.
 */
export const GENERATOR_CONTENT_TYPES: ContentTypeConfig[] = [
  { id: "npcs", label: "NPCs", icon: "Users", color: "emerald" },
  { id: "monsters", label: "Monsters", icon: "Skull", color: "orange" },
  { id: "encounters", label: "Encounters", icon: "Swords", color: "red" },
  { id: "locations", label: "Locations", icon: "MapPin", color: "cyan" },
  { id: "quests", label: "Quests", icon: "Scroll", color: "amber" },
  { id: "items", label: "Items", icon: "Package", color: "purple" },
  { id: "dialogues", label: "Dialogues", icon: "MessageSquare", color: "blue" },
  { id: "rumors", label: "Rumors", icon: "Quote", color: "rose" },
  { id: "taverns", label: "Taverns", icon: "Beer", color: "yellow" },
  { id: "merchants", label: "Merchants", icon: "Store", color: "teal" },
  { id: "traps", label: "Traps", icon: "AlertTriangle", color: "red" },
  { id: "critters", label: "Critters", icon: "PawPrint", color: "green" },
  { id: "chases", label: "Chases", icon: "Zap", color: "indigo" },
];

/**
 * Default content types shown in campaign tabs for new campaigns.
 * Minimal set: NPCs, Locations, Quests
 */
export const DEFAULT_VISIBLE_CONTENT_TYPES = ["npcs", "locations", "quests"];

/**
 * Content types grouped by category for the settings UI.
 */
export const CONTENT_TYPE_GROUPS = {
  core: ["npcs", "monsters", "encounters", "locations", "quests", "items"],
  extended: [
    "dialogues",
    "rumors",
    "taverns",
    "merchants",
    "traps",
    "critters",
    "chases",
  ],
};

/**
 * Get a content type config by ID
 */
export function getContentTypeConfig(
  id: string,
): ContentTypeConfig | undefined {
  return GENERATOR_CONTENT_TYPES.find((t) => t.id === id);
}

/**
 * Tab colors for content types (matching library tab colors)
 */
export const contentTypeTabColors: Record<string, string> = {
  emerald: "text-emerald-400 border-emerald-400",
  orange: "text-orange-400 border-orange-400",
  red: "text-red-400 border-red-400",
  blue: "text-blue-400 border-blue-400",
  cyan: "text-cyan-400 border-cyan-400",
  amber: "text-amber-400 border-amber-400",
  purple: "text-purple-400 border-purple-400",
  rose: "text-rose-400 border-rose-400",
  yellow: "text-yellow-400 border-yellow-400",
  teal: "text-teal-400 border-teal-400",
  green: "text-green-400 border-green-400",
  indigo: "text-indigo-400 border-indigo-400",
};
