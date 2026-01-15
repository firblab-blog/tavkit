// NPC Response Normalizer
// Converts raw AI responses to typed NPCData

import {
  normalizeStringArray,
  flattenCategorizedArray,
} from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// ============================================================================
// Types
// ============================================================================

export interface NPCPersonality {
  traits: string[];
  ideals: string;
  bonds: string;
  flaws: string;
}

export interface NPCAbilities {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
}

export interface NPCCombatStats {
  hp?: number;
  ac?: number;
  speed?: string;
  initiative?: number;
}

export interface GeneratedNPCData {
  name: string;
  race: string;
  class: string;
  level: number;
  alignment: string;
  appearance: string;
  personality: NPCPersonality;
  background: string;
  motivation: string;
  abilities: NPCAbilities;
  combat?: NPCCombatStats;
  skills: string[];
  equipment: string[];
  role: string;
  plot_hooks: string[];
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

// ============================================================================
// Normalizer Functions
// ============================================================================

function normalizePersonality(data: Record<string, unknown>): NPCPersonality {
  const result: NPCPersonality = {
    traits: [],
    ideals: "",
    bonds: "",
    flaws: "",
  };

  // Try to find personality in various locations
  let personality = data.personality;
  if (!personality) {
    for (const altName of [
      "personality_traits",
      "traits",
      "character_traits",
    ]) {
      if (data[altName]) {
        personality = data[altName];
        break;
      }
    }
  }

  if (!personality) return result;

  // Handle personality as a map (expected format)
  if (
    typeof personality === "object" &&
    personality !== null &&
    !Array.isArray(personality)
  ) {
    const pMap = personality as Record<string, unknown>;
    result.traits = normalizeStringArray(pMap.traits);
    result.ideals = String(pMap.ideals || "");
    result.bonds = String(pMap.bonds || "");
    result.flaws = String(pMap.flaws || "");
    return result;
  }

  // Handle personality as a string
  if (typeof personality === "string") {
    result.traits = [personality];
    return result;
  }

  // Handle personality as an array of traits
  if (Array.isArray(personality)) {
    result.traits = normalizeStringArray(personality);
    return result;
  }

  return result;
}

function normalizeAbilities(data: Record<string, unknown>): NPCAbilities {
  const result: NPCAbilities = {
    STR: 10,
    DEX: 10,
    CON: 10,
    INT: 10,
    WIS: 10,
    CHA: 10,
  };

  // Try to find abilities in various field names
  let rawAbilities: unknown = null;
  for (const name of ["abilities", "stats", "ability_scores", "attributes"]) {
    if (data[name]) {
      rawAbilities = data[name];
      break;
    }
  }

  const statMap: Record<string, keyof NPCAbilities> = {
    str: "STR",
    strength: "STR",
    dex: "DEX",
    dexterity: "DEX",
    con: "CON",
    constitution: "CON",
    int: "INT",
    intelligence: "INT",
    wis: "WIS",
    wisdom: "WIS",
    cha: "CHA",
    charisma: "CHA",
  };

  // Extract from abilities object
  if (rawAbilities && typeof rawAbilities === "object") {
    const abilitiesMap = rawAbilities as Record<string, unknown>;
    for (const [key, mappedKey] of Object.entries(statMap)) {
      const value = abilitiesMap[key] || abilitiesMap[key.toUpperCase()];
      if (value !== undefined) {
        // Handle verbose format like { value: 10, modifier: 0 }
        if (typeof value === "object" && value !== null) {
          const vObj = value as Record<string, unknown>;
          if (typeof vObj.value === "number") result[mappedKey] = vObj.value;
          else if (typeof vObj.score === "number")
            result[mappedKey] = vObj.score;
        } else if (typeof value === "number") {
          result[mappedKey] = value;
        } else if (typeof value === "string") {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) result[mappedKey] = parsed;
        }
      }
    }
  }

  // Also check flat fields at root
  for (const [key, mappedKey] of Object.entries(statMap)) {
    const value = data[key] || data[key.toUpperCase()];
    if (value !== undefined && typeof value === "number") {
      result[mappedKey] = value;
    }
  }

  return result;
}

function extractCombatStats(
  data: Record<string, unknown>,
): NPCCombatStats | undefined {
  const combat: NPCCombatStats = {};

  // Extract HP
  const hpValue = data.hp || data.hit_points || data.health;
  if (hpValue !== undefined) {
    if (typeof hpValue === "number") {
      combat.hp = hpValue;
    } else if (typeof hpValue === "string") {
      const parsed = parseInt(hpValue, 10);
      if (!isNaN(parsed)) combat.hp = parsed;
    }
  }

  // Extract AC
  const acValue = data.ac || data.armor_class;
  if (acValue !== undefined) {
    if (typeof acValue === "number") {
      combat.ac = acValue;
    } else if (typeof acValue === "string") {
      const parsed = parseInt(acValue, 10);
      if (!isNaN(parsed)) combat.ac = parsed;
    }
  }

  // Extract Speed
  const speedValue = data.speed || data.movement;
  if (speedValue !== undefined) {
    combat.speed = String(speedValue);
  }

  // Extract Initiative
  if (data.initiative !== undefined) {
    if (typeof data.initiative === "number") {
      combat.initiative = data.initiative;
    } else if (typeof data.initiative === "string") {
      const parsed = parseInt(data.initiative, 10);
      if (!isNaN(parsed)) combat.initiative = parsed;
    }
  }

  return Object.keys(combat).length > 0 ? combat : undefined;
}

// ============================================================================
// Main Normalizer
// ============================================================================

const EXPECTED_FIELDS = [
  "name",
  "race",
  "class",
  "level",
  "alignment",
  "appearance",
  "personality",
  "personality_traits",
  "traits",
  "character_traits",
  "background",
  "motivation",
  "abilities",
  "stats",
  "ability_scores",
  "attributes",
  "combat",
  "skills",
  "equipment",
  "role",
  "plot_hooks",
  "provider",
  "_parse_warning",
  "_raw",
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
  "hp",
  "ac",
  "speed",
  "hit_points",
  "armor_class",
];

export function normalizeNPCResponse(
  raw: Record<string, unknown>,
): GeneratedNPCData {
  logger.debug("[normalizeNPC] Input:", raw);

  // Handle case where background contains the entire JSON response
  let processedRaw = raw;
  if (raw.background && typeof raw.background === "string") {
    const bgStr = (raw.background as string).trim();
    if (bgStr.startsWith("{") && bgStr.endsWith("}")) {
      try {
        const parsedNPC = JSON.parse(bgStr);
        logger.debug(
          "[normalizeNPC] Parsed NPC from JSON background:",
          parsedNPC,
        );
        processedRaw = parsedNPC;
      } catch {
        logger.warn("[normalizeNPC] Failed to parse background as JSON:", e);
      }
    }
  }

  // Collect unexpected fields
  const unexpectedFields: Record<string, unknown> = {};
  for (const key of Object.keys(processedRaw)) {
    if (!EXPECTED_FIELDS.includes(key.toLowerCase())) {
      unexpectedFields[key] = processedRaw[key];
    }
  }

  const result: GeneratedNPCData = {
    name: String(processedRaw.name || "Unknown NPC"),
    race: String(processedRaw.race || ""),
    class: String(processedRaw.class || ""),
    level:
      typeof processedRaw.level === "number"
        ? processedRaw.level
        : parseInt(String(processedRaw.level || "1"), 10) || 1,
    alignment: String(processedRaw.alignment || ""),
    appearance: String(processedRaw.appearance || ""),
    personality: normalizePersonality(processedRaw),
    background: String(processedRaw.background || ""),
    motivation: String(processedRaw.motivation || ""),
    abilities: normalizeAbilities(processedRaw),
    combat: extractCombatStats(processedRaw),
    skills: normalizeStringArray(processedRaw.skills),
    equipment: flattenCategorizedArray(processedRaw.equipment),
    role: String(processedRaw.role || ""),
    plot_hooks: normalizeStringArray(processedRaw.plot_hooks),
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  // Check for parse warning from backend
  if (processedRaw._parse_warning) {
    result._parseError = String(processedRaw._parse_warning);
  }

  logger.debug("[normalizeNPC] Result:", result);
  return result;
}

export function hasValidNPCContent(npc: GeneratedNPCData): boolean {
  return !!(
    npc.name &&
    npc.name !== "Unknown NPC" &&
    (npc.appearance || npc.background || npc.personality.traits.length > 0)
  );
}
