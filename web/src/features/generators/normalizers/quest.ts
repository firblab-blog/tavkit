// Quest Response Normalizer
// Converts raw AI responses to typed QuestData

import { normalizeToStringArray } from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// ============================================================================
// Types
// ============================================================================

export interface GeneratedQuestData {
  title: string;
  type: string;
  category: string;
  description: string;
  objectives: string[];
  rewards: string[];
  complications: string[];
  npcs_involved: string[];
  locations_involved: string[];
  faction_alignment: string;
  party_level: number;
  moral_ambiguity: boolean;
  combat_intensity: string;
  time_limit: string;
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

// ============================================================================
// Main Normalizer
// ============================================================================

export function normalizeQuestResponse(
  raw: Record<string, unknown>,
): GeneratedQuestData {
  logger.debug("[normalizeQuest] Input:", raw);

  // Handle case where description contains the entire JSON response
  let processedRaw = raw;
  if (raw.description && typeof raw.description === "string") {
    const descStr = (raw.description as string).trim();
    if (descStr.startsWith("{") && descStr.endsWith("}")) {
      try {
        const parsedQuest = JSON.parse(descStr);
        logger.debug(
          "[normalizeQuest] Parsed quest from JSON description:",
          parsedQuest,
        );
        processedRaw = parsedQuest;
      } catch (e) {
        logger.warn("[normalizeQuest] Failed to parse description as JSON:", e);
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    "title",
    "name",
    "type",
    "category",
    "description",
    "summary",
    "hook",
    "objectives",
    "goals",
    "rewards",
    "complications",
    "twists",
    "npcs_involved",
    "npcs",
    "locations_involved",
    "locations",
    "faction_alignment",
    "party_level",
    "moral_ambiguity",
    "combat_intensity",
    "time_limit",
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

  // Build description - handle various field names AI might use
  let description = "";
  if (
    processedRaw.description &&
    typeof processedRaw.description === "string"
  ) {
    const descText = processedRaw.description as string;
    // Only use if it's not JSON
    if (!descText.trim().startsWith("{")) {
      description = descText;
    }
  }
  if (!description && processedRaw.summary) {
    description = String(processedRaw.summary);
  }
  if (!description && processedRaw.hook) {
    description = String(processedRaw.hook);
  }

  const result: GeneratedQuestData = {
    title: String(processedRaw.title || processedRaw.name || "Untitled Quest"),
    type: String(processedRaw.type || ""),
    category: String(processedRaw.category || ""),
    description: description,
    objectives: normalizeToStringArray(
      processedRaw.objectives || processedRaw.goals,
    ),
    rewards: normalizeToStringArray(processedRaw.rewards),
    complications: normalizeToStringArray(
      processedRaw.complications || processedRaw.twists,
    ),
    npcs_involved: normalizeToStringArray(
      processedRaw.npcs_involved || processedRaw.npcs,
    ),
    locations_involved: normalizeToStringArray(
      processedRaw.locations_involved || processedRaw.locations,
    ),
    faction_alignment: String(processedRaw.faction_alignment || ""),
    party_level:
      typeof processedRaw.party_level === "number"
        ? processedRaw.party_level
        : 1,
    moral_ambiguity: Boolean(processedRaw.moral_ambiguity),
    combat_intensity: String(processedRaw.combat_intensity || ""),
    time_limit: String(processedRaw.time_limit || ""),
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  if (raw._parse_warning) {
    result._parseError = String(raw._parse_warning);
  }

  logger.debug("[normalizeQuest] Result:", result);
  return result;
}

export function hasValidQuestContent(quest: GeneratedQuestData): boolean {
  return !!(
    quest.title &&
    quest.title !== "Untitled Quest" &&
    (quest.description || quest.objectives.length > 0)
  );
}
