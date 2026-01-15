// Normalizer for Encounter AI responses

import { normalizeStringArray } from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// Expected encounter structure
export interface EnvironmentData {
  setting: string;
  features: string[];
  lighting: string;
}

export interface CreatureData {
  name: string;
  count: number;
  cr: number;
  role: string;
  tactics: string;
}

export interface TreasureData {
  coins: Record<string, number>;
  items: string[];
}

export interface GeneratedEncounterData {
  name: string;
  description: string;
  difficulty: string;
  expected_duration: string;
  environment: EnvironmentData;
  creatures: CreatureData[];
  treasure: TreasureData;
  xp_total: number;
  xp_per_player: number;
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

/**
 * Normalize environment to proper structure
 */
function normalizeEnvironment(value: unknown): EnvironmentData {
  const defaultEnv: EnvironmentData = {
    setting: "",
    features: [],
    lighting: "",
  };

  if (!value) return defaultEnv;

  if (typeof value === "string") {
    return { ...defaultEnv, setting: value };
  }

  if (typeof value === "object" && value !== null) {
    const env = value as Record<string, unknown>;
    return {
      setting: String(env.setting || env.terrain || env.location || ""),
      features: normalizeStringArray(
        env.features || env.environmental_features || env.hazards,
      ),
      lighting: String(env.lighting || env.light || env.visibility || ""),
    };
  }

  return defaultEnv;
}

/**
 * Normalize a single creature to proper structure
 */
function normalizeCreature(value: unknown): CreatureData | null {
  if (!value || typeof value !== "object") return null;

  const creature = value as Record<string, unknown>;

  return {
    name: String(creature.name || creature.creature || "Unknown Creature"),
    count: Number(creature.count || creature.quantity || creature.number || 1),
    cr: Number(
      creature.cr || creature.challenge_rating || creature.challenge || 1,
    ),
    role: String(creature.role || creature.type || ""),
    tactics: String(
      creature.tactics || creature.strategy || creature.behavior || "",
    ),
  };
}

/**
 * Normalize creatures array
 */
function normalizeCreatures(value: unknown): CreatureData[] {
  if (!value) return [];

  if (!Array.isArray(value)) {
    // Single creature object
    const creature = normalizeCreature(value);
    return creature ? [creature] : [];
  }

  return value
    .map((c) => normalizeCreature(c))
    .filter((c): c is CreatureData => c !== null);
}

/**
 * Normalize treasure to proper structure
 */
function normalizeTreasure(value: unknown): TreasureData {
  const defaultTreasure: TreasureData = {
    coins: {},
    items: [],
  };

  if (!value) return defaultTreasure;

  if (typeof value !== "object" || value === null) return defaultTreasure;

  const treasure = value as Record<string, unknown>;

  // Normalize coins
  const coins: Record<string, number> = {};
  if (treasure.coins && typeof treasure.coins === "object") {
    const rawCoins = treasure.coins as Record<string, unknown>;
    for (const [key, val] of Object.entries(rawCoins)) {
      coins[key] = Number(val) || 0;
    }
  }

  // Normalize items
  const items = normalizeStringArray(
    treasure.items || treasure.loot || treasure.rewards,
  );

  return { coins, items };
}

/**
 * Check if encounter has valid essential content
 */
export function hasValidEncounterContent(
  encounter: GeneratedEncounterData | null,
): boolean {
  if (!encounter) return false;
  return !!(
    encounter.name &&
    encounter.name !== "Generated Encounter" &&
    (encounter.description || encounter.creatures.length > 0)
  );
}

/**
 * Main normalization function - converts raw AI response to typed EncounterData
 */
export function normalizeEncounterResponse(
  raw: Record<string, unknown>,
): GeneratedEncounterData {
  logger.debug("[EncounterNormalizer] normalizeEncounterResponse input:", raw);

  // Handle case where description contains the entire JSON response
  let processedRaw = raw;
  if (raw.description && typeof raw.description === "string") {
    const descStr = (raw.description as string).trim();
    if (descStr.startsWith("{") && descStr.endsWith("}")) {
      try {
        const parsedEncounter = JSON.parse(descStr);
        logger.debug(
          "[EncounterNormalizer] Parsed encounter from JSON description:",
          parsedEncounter,
        );
        processedRaw = parsedEncounter;
      } catch (e) {
        logger.warn(
          "[EncounterNormalizer] Failed to parse description as JSON:",
          e,
        );
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    "name",
    "title",
    "description",
    "difficulty",
    "expected_duration",
    "duration",
    "environment",
    "creatures",
    "monsters",
    "enemies",
    "treasure",
    "loot",
    "rewards",
    "xp_total",
    "xp_per_player",
    "total_xp",
    "experience",
    "provider",
    "_parse_warning",
  ];

  // Collect unexpected fields for debugging
  const unexpectedFields: Record<string, unknown> = {};
  for (const key of Object.keys(processedRaw)) {
    if (!expectedFields.includes(key)) {
      unexpectedFields[key] = processedRaw[key];
    }
  }

  // Build description
  let description = "";
  if (
    processedRaw.description &&
    typeof processedRaw.description === "string"
  ) {
    const descText = processedRaw.description as string;
    if (!descText.trim().startsWith("{")) {
      description = descText;
    }
  }
  if (!description && processedRaw.summary) {
    description = String(processedRaw.summary);
  }

  const result: GeneratedEncounterData = {
    name: String(
      processedRaw.name || processedRaw.title || "Generated Encounter",
    ),
    description: description,
    difficulty: String(processedRaw.difficulty || ""),
    expected_duration: String(
      processedRaw.expected_duration || processedRaw.duration || "",
    ),
    environment: normalizeEnvironment(processedRaw.environment),
    creatures: normalizeCreatures(
      processedRaw.creatures || processedRaw.monsters || processedRaw.enemies,
    ),
    treasure: normalizeTreasure(
      processedRaw.treasure || processedRaw.loot || processedRaw.rewards,
    ),
    xp_total: Number(
      processedRaw.xp_total ||
        processedRaw.total_xp ||
        processedRaw.experience ||
        0,
    ),
    xp_per_player: Number(processedRaw.xp_per_player || 0),
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  logger.debug("[EncounterNormalizer] Normalized result:", result);
  return result;
}
