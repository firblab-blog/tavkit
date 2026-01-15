// Normalizer for Chase AI responses

import { normalizeStringArray } from "@/utils/aiResponseNormalizer";

// ============================================================================
// Type Definitions
// ============================================================================

interface Obstacle {
  name: string;
  description: string;
  check: string;
  failure: string;
}

interface Shortcut {
  name: string;
  description: string;
  benefit: string;
}

interface ChasePhase {
  round: string | number;
  description: string;
  difficulty: string;
}

interface Participants {
  quarry: string;
  pursuers: string;
}

interface EndingConditions {
  success: string;
  failure: string;
  alternative: string;
}

interface Rewards {
  success: string;
  partial: string;
  failure: string;
}

export interface GeneratedChaseData {
  name: string;
  chase_type: string;
  terrain: string;
  difficulty: string;
  description: string;
  setting: string;
  participants: Participants;
  starting_conditions: string;
  obstacles: Obstacle[];
  complications: string[];
  shortcuts: Shortcut[];
  chase_phases: ChasePhase[];
  ending_conditions: EndingConditions;
  rewards: Rewards;
  special_rules: string;
  environmental_factors: string[];
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

// ============================================================================
// Helper Normalizers
// ============================================================================

function normalizeObstacle(value: unknown): Obstacle | null {
  if (!value) return null;

  if (typeof value === "string") {
    return { name: value, description: "", check: "", failure: "" };
  }

  if (typeof value === "object" && value !== null) {
    const obs = value as Record<string, unknown>;
    return {
      name: String(obs.name || obs.title || obs.obstacle || "Unknown Obstacle"),
      description: String(obs.description || obs.desc || ""),
      check: String(obs.check || obs.skill_check || obs.dc || ""),
      failure: String(obs.failure || obs.on_failure || obs.consequence || ""),
    };
  }

  return null;
}

function normalizeObstacles(value: unknown): Obstacle[] {
  if (!value || !Array.isArray(value)) return [];
  return value
    .map((obs) => normalizeObstacle(obs))
    .filter((obs): obs is Obstacle => obs !== null);
}

function normalizeShortcut(value: unknown): Shortcut | null {
  if (!value) return null;

  if (typeof value === "string") {
    return { name: value, description: "", benefit: "" };
  }

  if (typeof value === "object" && value !== null) {
    const sc = value as Record<string, unknown>;
    return {
      name: String(sc.name || sc.title || sc.route || "Unknown Shortcut"),
      description: String(sc.description || sc.desc || ""),
      benefit: String(sc.benefit || sc.advantage || sc.effect || ""),
    };
  }

  return null;
}

function normalizeShortcuts(value: unknown): Shortcut[] {
  if (!value || !Array.isArray(value)) return [];
  return value
    .map((sc) => normalizeShortcut(sc))
    .filter((sc): sc is Shortcut => sc !== null);
}

function normalizeChasePhase(value: unknown, index: number): ChasePhase | null {
  if (!value) return null;

  if (typeof value === "string") {
    return {
      round: String(index + 1),
      description: value,
      difficulty: "Medium",
    };
  }

  if (typeof value === "object" && value !== null) {
    const phase = value as Record<string, unknown>;
    return {
      round: String(phase.round || phase.number || phase.turn || index + 1),
      description: String(phase.description || phase.desc || phase.event || ""),
      difficulty: String(
        phase.difficulty || phase.dc || phase.level || "Medium",
      ),
    };
  }

  return null;
}

function normalizeChasePhases(value: unknown): ChasePhase[] {
  if (!value || !Array.isArray(value)) return [];
  return value
    .map((phase, idx) => normalizeChasePhase(phase, idx))
    .filter((phase): phase is ChasePhase => phase !== null);
}

function normalizeParticipants(value: unknown): Participants {
  const result: Participants = { quarry: "", pursuers: "" };

  if (!value || typeof value !== "object") return result;

  const p = value as Record<string, unknown>;
  result.quarry = String(p.quarry || p.target || p.prey || "");
  result.pursuers = String(p.pursuers || p.chasers || p.hunters || "");

  return result;
}

function normalizeEndingConditions(value: unknown): EndingConditions {
  const result: EndingConditions = {
    success: "",
    failure: "",
    alternative: "",
  };

  if (!value || typeof value !== "object") return result;

  const ec = value as Record<string, unknown>;
  result.success = String(ec.success || ec.win || ec.escape || "");
  result.failure = String(ec.failure || ec.lose || ec.caught || "");
  result.alternative = String(ec.alternative || ec.other || ec.partial || "");

  return result;
}

function normalizeRewards(value: unknown): Rewards {
  const result: Rewards = { success: "", partial: "", failure: "" };

  if (!value || typeof value !== "object") return result;

  const r = value as Record<string, unknown>;
  result.success = String(r.success || r.win || "");
  result.partial = String(r.partial || r.some || "");
  result.failure = String(r.failure || r.lose || "");

  return result;
}

function normalizeSpecialRules(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return String(value);
}

// ============================================================================
// Main Normalizer
// ============================================================================

export function normalizeChaseResponse(
  raw: Record<string, unknown>,
): GeneratedChaseData {
  // Handle case where description contains the entire JSON response
  let processedRaw = raw;
  if (raw.description && typeof raw.description === "string") {
    const descStr = (raw.description as string).trim();
    if (descStr.startsWith("{") && descStr.endsWith("}")) {
      try {
        const parsedChase = JSON.parse(descStr);
        processedRaw = parsedChase;
      } catch {
        // Keep original raw if parsing fails
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    "name",
    "title",
    "scene_name",
    "chase_type",
    "type",
    "terrain",
    "environment",
    "difficulty",
    "description",
    "setting",
    "participants",
    "target",
    "prey",
    "chasers",
    "hunters",
    "starting_conditions",
    "obstacles",
    "challenges",
    "hazards",
    "complications",
    "shortcuts",
    "chase_phases",
    "phases",
    "rounds",
    "ending_conditions",
    "victory",
    "defeat",
    "escape",
    "caught",
    "rewards",
    "special_rules",
    "rules",
    "mechanics",
    "environmental_factors",
    "environment_effects",
    "weather",
    "provider",
    "_parse_warning",
  ];

  // Collect unexpected fields
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

  // Get obstacles from various possible field names
  let obstacles = normalizeObstacles(processedRaw.obstacles);
  if (obstacles.length === 0) {
    obstacles = normalizeObstacles(
      processedRaw.challenges || processedRaw.hazards,
    );
  }

  // Get chase_phases from various possible field names
  let chasePhases = normalizeChasePhases(processedRaw.chase_phases);
  if (chasePhases.length === 0) {
    chasePhases = normalizeChasePhases(
      processedRaw.phases || processedRaw.rounds,
    );
  }

  // Get environmental_factors from various possible field names
  let environmentalFactors = normalizeStringArray(
    processedRaw.environmental_factors,
  );
  if (environmentalFactors.length === 0) {
    environmentalFactors = normalizeStringArray(
      processedRaw.environment_effects || processedRaw.weather,
    );
  }

  const result: GeneratedChaseData = {
    name: String(
      processedRaw.name ||
        processedRaw.title ||
        processedRaw.scene_name ||
        "Unknown Chase",
    ),
    chase_type: String(
      processedRaw.chase_type || processedRaw.type || "foot_chase",
    ),
    terrain: String(
      processedRaw.terrain || processedRaw.environment || "urban",
    ),
    difficulty: String(processedRaw.difficulty || "medium"),
    description: description,
    setting: String(processedRaw.setting || ""),
    participants: normalizeParticipants(processedRaw.participants),
    starting_conditions: String(processedRaw.starting_conditions || ""),
    obstacles: obstacles,
    complications: normalizeStringArray(processedRaw.complications),
    shortcuts: normalizeShortcuts(processedRaw.shortcuts),
    chase_phases: chasePhases,
    ending_conditions: normalizeEndingConditions(
      processedRaw.ending_conditions,
    ),
    rewards: normalizeRewards(processedRaw.rewards),
    special_rules: normalizeSpecialRules(
      processedRaw.special_rules ||
        processedRaw.rules ||
        processedRaw.mechanics,
    ),
    environmental_factors: environmentalFactors,
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  return result;
}

// ============================================================================
// Validation
// ============================================================================

export function hasValidChaseContent(chase: GeneratedChaseData): boolean {
  return !!(
    chase.name &&
    chase.name !== "Unknown Chase" &&
    (chase.description ||
      chase.obstacles.length > 0 ||
      chase.chase_phases.length > 0)
  );
}
