// Normalizer for Trap generator responses

import { normalizeStringArray } from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// Detection structure
export interface Detection {
  passive_perception_dc: number | null;
  investigation_dc: number | null;
  clues: string[];
}

// Solution path structure
export interface SolutionPath {
  approach: string;
  skill: string;
  dc: number | null;
  description: string;
  time: string;
  failure: string;
}

// Scaling structure
export interface Scaling {
  easier: string;
  harder: string;
}

// Generated trap data
export interface GeneratedTrapData {
  name: string;
  trap_type: string;
  difficulty: string;
  description: string;
  environment: string;
  trigger: string;
  effect: string;
  damage: string;
  detection: Detection;
  solution_paths: SolutionPath[];
  complications: string[];
  rewards: string[];
  scaling: Scaling;
  dm_notes: string;
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

/**
 * Normalize detection object
 */
function normalizeDetection(value: unknown): Detection {
  const result: Detection = {
    passive_perception_dc: null,
    investigation_dc: null,
    clues: [],
  };

  if (!value || typeof value !== "object") return result;

  const det = value as Record<string, unknown>;

  // Handle passive perception DC from various field names
  const passiveDC =
    det.passive_perception_dc || det.passive_dc || det.perception_dc || det.dc;
  if (passiveDC !== undefined && passiveDC !== null) {
    result.passive_perception_dc = Number(passiveDC) || null;
  }

  // Handle investigation DC
  const invDC = det.investigation_dc || det.search_dc;
  if (invDC !== undefined && invDC !== null) {
    result.investigation_dc = Number(invDC) || null;
  }

  // Handle clues
  result.clues = normalizeStringArray(det.clues || det.hints);

  return result;
}

/**
 * Normalize a single solution path
 */
function normalizeSolutionPath(value: unknown): SolutionPath | null {
  if (!value) return null;

  if (typeof value === "string") {
    return {
      approach: value,
      skill: "",
      dc: null,
      description: "",
      time: "",
      failure: "",
    };
  }

  if (typeof value === "object" && value !== null) {
    const path = value as Record<string, unknown>;
    return {
      approach: String(
        path.approach || path.method || path.name || "Unknown Approach",
      ),
      skill: String(path.skill || path.ability || path.check || ""),
      dc: path.dc !== undefined && path.dc !== null ? Number(path.dc) : null,
      description: String(path.description || ""),
      time: String(path.time || ""),
      failure: String(
        path.failure || path.on_failure || path.failure_effect || "",
      ),
    };
  }

  return null;
}

/**
 * Normalize solution paths array
 */
function normalizeSolutionPaths(value: unknown): SolutionPath[] {
  if (!value || !Array.isArray(value)) return [];

  return value
    .map((path) => normalizeSolutionPath(path))
    .filter((path): path is SolutionPath => path !== null);
}

/**
 * Normalize scaling object
 */
function normalizeScaling(value: unknown): Scaling {
  const result: Scaling = {
    easier: "",
    harder: "",
  };

  if (!value || typeof value !== "object") return result;

  const scaling = value as Record<string, unknown>;

  result.easier = String(
    scaling.easier || scaling.lower_level || scaling.easy || "",
  );
  result.harder = String(
    scaling.harder || scaling.higher_level || scaling.hard || "",
  );

  return result;
}

/**
 * Main normalization function - converts raw AI response to typed TrapData
 */
export function normalizeTrapResponse(
  raw: Record<string, unknown>,
): GeneratedTrapData {
  logger.debug("[TrapNormalizer] normalizeTrapResponse input:", raw);

  // Handle case where description contains the entire JSON response
  let processedRaw = raw;
  if (raw.description && typeof raw.description === "string") {
    const descStr = (raw.description as string).trim();
    if (descStr.startsWith("{") && descStr.endsWith("}")) {
      try {
        const parsedTrap = JSON.parse(descStr);
        logger.debug(
          "[TrapNormalizer] Parsed trap from JSON description:",
          parsedTrap,
        );
        processedRaw = parsedTrap;
      } catch (e) {
        logger.warn("[TrapNormalizer] Failed to parse description as JSON:", e);
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    "name",
    "title",
    "trap_type",
    "type",
    "difficulty",
    "description",
    "environment",
    "trigger",
    "effect",
    "damage",
    "detection",
    "save",
    "solution_paths",
    "solutions",
    "disarm",
    "complications",
    "rewards",
    "loot",
    "treasure",
    "scaling",
    "dm_notes",
    "notes",
    "gm_notes",
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

  // Get solution paths from various possible field names
  let solutionPaths = normalizeSolutionPaths(processedRaw.solution_paths);
  if (solutionPaths.length === 0) {
    solutionPaths = normalizeSolutionPaths(processedRaw.solutions);
  }
  // Convert disarm to solution path if present and no paths found
  if (solutionPaths.length === 0 && processedRaw.disarm) {
    const disarm = processedRaw.disarm as Record<string, unknown>;
    if (typeof disarm === "object") {
      solutionPaths = [
        {
          approach: "Disarm",
          skill: String(disarm.method || disarm.skill || ""),
          dc: disarm.dc !== undefined ? Number(disarm.dc) : null,
          description: String(disarm.description || ""),
          time: "1 action",
          failure: "Triggers the trap",
        },
      ];
    }
  }

  // Get rewards from various possible field names
  let rewards = normalizeStringArray(processedRaw.rewards);
  if (rewards.length === 0) {
    rewards = normalizeStringArray(processedRaw.loot || processedRaw.treasure);
  }

  const result: GeneratedTrapData = {
    name: String(processedRaw.name || processedRaw.title || "Unknown Trap"),
    trap_type: String(processedRaw.trap_type || processedRaw.type || ""),
    difficulty: String(processedRaw.difficulty || ""),
    description: description,
    environment: String(processedRaw.environment || ""),
    trigger: String(processedRaw.trigger || ""),
    effect: String(processedRaw.effect || ""),
    damage: String(processedRaw.damage || ""),
    detection: normalizeDetection(processedRaw.detection),
    solution_paths: solutionPaths,
    complications: normalizeStringArray(processedRaw.complications),
    rewards: rewards,
    scaling: normalizeScaling(processedRaw.scaling),
    dm_notes: String(
      processedRaw.dm_notes ||
        processedRaw.notes ||
        processedRaw.gm_notes ||
        "",
    ),
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  logger.debug("[TrapNormalizer] Normalized result:", result);
  return result;
}

/**
 * Check if trap has valid essential content
 */
export function hasValidTrapContent(trap: GeneratedTrapData): boolean {
  return !!(
    trap.name &&
    trap.name !== "Unknown Trap" &&
    (trap.description || trap.trigger || trap.effect)
  );
}
