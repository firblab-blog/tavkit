// Monster Response Normalizer
// Converts raw AI responses to typed MonsterData

import {
  normalizeStringArray,
  normalizeActionArray,
  normalizeHitPoints,
  normalizeSpeed,
} from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// ============================================================================
// Types
// ============================================================================

export interface MonsterAbilities {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
}

export interface MonsterAction {
  name: string;
  description: string;
  attack_bonus?: string;
  damage?: string;
}

export interface GeneratedMonsterData {
  name: string;
  type: string;
  size: string;
  alignment: string;
  armor_class: number;
  hit_points: { average: number; dice: string };
  speed: Record<string, number>;
  abilities: MonsterAbilities;
  saving_throws?: Record<string, string>;
  skills?: Record<string, string>;
  damage_resistances?: string[];
  damage_immunities?: string[];
  condition_immunities?: string[];
  senses: Record<string, number | string>;
  languages: string[];
  challenge_rating: number;
  xp: number;
  traits: MonsterAction[];
  actions: MonsterAction[];
  legendary_actions?: MonsterAction[];
  lair_actions?: MonsterAction[];
  lore: string;
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

// ============================================================================
// Normalizer Functions
// ============================================================================

function normalizeAbilities(value: unknown): MonsterAbilities {
  const defaults: MonsterAbilities = {
    STR: 10,
    DEX: 10,
    CON: 10,
    INT: 10,
    WIS: 10,
    CHA: 10,
  };

  if (!value || typeof value !== "object") return defaults;

  const obj = value as Record<string, unknown>;
  return {
    STR: Number(obj.STR || obj.str || obj.strength || 10),
    DEX: Number(obj.DEX || obj.dex || obj.dexterity || 10),
    CON: Number(obj.CON || obj.con || obj.constitution || 10),
    INT: Number(obj.INT || obj.int || obj.intelligence || 10),
    WIS: Number(obj.WIS || obj.wis || obj.wisdom || 10),
    CHA: Number(obj.CHA || obj.cha || obj.charisma || 10),
  };
}

// ============================================================================
// Main Normalizer
// ============================================================================

const EXPECTED_FIELDS = [
  "name",
  "type",
  "size",
  "alignment",
  "armor_class",
  "hit_points",
  "speed",
  "abilities",
  "saving_throws",
  "skills",
  "damage_resistances",
  "damage_immunities",
  "condition_immunities",
  "senses",
  "languages",
  "challenge_rating",
  "cr",
  "xp",
  "traits",
  "actions",
  "legendary_actions",
  "lair_actions",
  "lore",
  "description",
  "provider",
  "_parse_warning",
];

export function normalizeMonsterResponse(
  raw: Record<string, unknown>,
): GeneratedMonsterData {
  logger.debug("[normalizeMonster] Input:", raw);

  // Collect unexpected fields
  const unexpectedFields: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (!EXPECTED_FIELDS.includes(key)) {
      unexpectedFields[key] = raw[key];
    }
  }

  const result: GeneratedMonsterData = {
    name: String(raw.name || "Unknown Monster"),
    type: String(raw.type || raw.creature_type || "monstrosity"),
    size: String(raw.size || "Medium"),
    alignment: String(raw.alignment || "unaligned"),
    armor_class: Number(raw.armor_class || raw.ac || 10),
    hit_points: normalizeHitPoints(raw.hit_points || raw.hp),
    speed: normalizeSpeed(raw.speed),
    abilities: normalizeAbilities(
      raw.abilities || raw.ability_scores || raw.stats,
    ),
    saving_throws: raw.saving_throws as Record<string, string> | undefined,
    skills: raw.skills as Record<string, string> | undefined,
    damage_resistances: normalizeStringArray(raw.damage_resistances),
    damage_immunities: normalizeStringArray(raw.damage_immunities),
    condition_immunities: normalizeStringArray(raw.condition_immunities),
    senses: (raw.senses as Record<string, number | string>) || {},
    languages: normalizeStringArray(raw.languages),
    challenge_rating: Number(raw.challenge_rating || raw.cr || 1),
    xp: Number(raw.xp || raw.experience_points || 200),
    traits: normalizeActionArray(raw.traits),
    actions: normalizeActionArray(raw.actions),
    legendary_actions: raw.legendary_actions
      ? normalizeActionArray(raw.legendary_actions)
      : undefined,
    lair_actions: raw.lair_actions
      ? normalizeActionArray(raw.lair_actions)
      : undefined,
    lore: String(raw.lore || raw.description || raw.backstory || ""),
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  // Check for parse warning from backend
  if (raw._parse_warning) {
    result._parseError = String(raw._parse_warning);
  }

  logger.debug("[normalizeMonster] Result:", result);
  return result;
}

export function hasValidMonsterContent(monster: GeneratedMonsterData): boolean {
  return !!(
    monster.name &&
    monster.name !== "Unknown Monster" &&
    (monster.lore || monster.traits.length > 0 || monster.actions.length > 0)
  );
}
