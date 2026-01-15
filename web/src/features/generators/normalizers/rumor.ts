// Normalizer for Rumor generator responses

import { normalizeStringArray } from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// Single rumor structure
export interface GeneratedRumorData {
  text: string;
  source: string;
  veracity: string;
  leads_to: string;
  context: string;
  foreshadowing: boolean;
  tags: string[];
  _raw?: Record<string, unknown>;
}

// Response with multiple rumors
export interface GeneratedRumorsData {
  rumors: GeneratedRumorData[];
  _parseError?: string;
}

/**
 * Normalize a single rumor to proper structure
 */
function normalizeSingleRumor(value: unknown): GeneratedRumorData | null {
  if (!value || typeof value !== "object") {
    // If it's just a string, wrap it as a rumor
    if (typeof value === "string" && value.trim()) {
      return {
        text: value,
        source: "Unknown",
        veracity: "unknown",
        leads_to: "",
        context: "",
        foreshadowing: false,
        tags: [],
      };
    }
    return null;
  }

  const rumor = value as Record<string, unknown>;

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    "text",
    "content",
    "description",
    "message",
    "source",
    "speaker",
    "origin",
    "from",
    "veracity",
    "truth",
    "accuracy",
    "is_true",
    "leads_to",
    "adventure_hook",
    "hooks",
    "hook",
    "context",
    "background",
    "foreshadowing",
    "tags",
    "keywords",
    "categories",
    "related_id",
  ];

  // Collect unexpected fields
  const unexpectedFields: Record<string, unknown> = {};
  for (const key of Object.keys(rumor)) {
    if (!expectedFields.includes(key)) {
      unexpectedFields[key] = rumor[key];
    }
  }

  // Get text from various possible field names
  let text = "";
  if (rumor.text) text = String(rumor.text);
  else if (rumor.content) text = String(rumor.content);
  else if (rumor.description) text = String(rumor.description);
  else if (rumor.message) text = String(rumor.message);

  // Get source from various possible field names
  let source = "Unknown";
  if (rumor.source) source = String(rumor.source);
  else if (rumor.speaker) source = String(rumor.speaker);
  else if (rumor.origin) source = String(rumor.origin);
  else if (rumor.from) source = String(rumor.from);

  // Get veracity from various possible field names
  let veracity = "unknown";
  if (rumor.veracity) veracity = String(rumor.veracity);
  else if (rumor.truth) veracity = String(rumor.truth);
  else if (rumor.accuracy) veracity = String(rumor.accuracy);
  else if (typeof rumor.is_true === "boolean") {
    veracity = rumor.is_true ? "true" : "false";
  }

  // Get leads_to from various possible field names
  let leadsTo = "";
  if (rumor.leads_to) leadsTo = String(rumor.leads_to);
  else if (rumor.adventure_hook) leadsTo = String(rumor.adventure_hook);
  else if (rumor.hook) leadsTo = String(rumor.hook);
  else if (Array.isArray(rumor.hooks) && rumor.hooks.length > 0) {
    leadsTo = String(rumor.hooks[0]);
  }

  // Get context
  let context = "";
  if (rumor.context) context = String(rumor.context);
  else if (rumor.background) context = String(rumor.background);

  // Get foreshadowing
  let foreshadowing = false;
  if (typeof rumor.foreshadowing === "boolean") {
    foreshadowing = rumor.foreshadowing;
  } else if (typeof rumor.foreshadowing === "string") {
    foreshadowing =
      rumor.foreshadowing.toLowerCase() === "true" ||
      rumor.foreshadowing.toLowerCase() === "yes";
  }

  // Get tags
  const tags = normalizeStringArray(
    rumor.tags || rumor.keywords || rumor.categories,
  );

  return {
    text,
    source,
    veracity,
    leads_to: leadsTo,
    context,
    foreshadowing,
    tags,
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };
}

/**
 * Main normalization function - converts raw AI response to typed RumorsResponse
 */
export function normalizeRumorsResponse(
  raw: Record<string, unknown>,
): GeneratedRumorsData {
  logger.debug("[RumorNormalizer] normalizeRumorsResponse input:", raw);

  let rumors: GeneratedRumorData[] = [];
  let parseError: string | undefined;

  // Try to extract rumors array
  const rawRumors = raw.rumors || raw.rumor_list || raw.items || raw.results;

  if (Array.isArray(rawRumors)) {
    rumors = rawRumors
      .map((r) => normalizeSingleRumor(r))
      .filter((r): r is GeneratedRumorData => r !== null && !!r.text);
  } else if (rawRumors && typeof rawRumors === "object") {
    // Single rumor object
    const single = normalizeSingleRumor(rawRumors);
    if (single && single.text) {
      rumors = [single];
    }
  }

  // If no rumors found, check if the raw response itself is a single rumor
  if (rumors.length === 0 && (raw.text || raw.content || raw.description)) {
    const single = normalizeSingleRumor(raw);
    if (single && single.text) {
      rumors = [single];
    }
  }

  // If still no rumors, check for parse warning
  if (rumors.length === 0) {
    if (raw._parse_warning) {
      parseError = String(raw._parse_warning);
    } else {
      parseError = "No valid rumors found in AI response";
    }
  }

  const result: GeneratedRumorsData = {
    rumors,
    _parseError: parseError,
  };

  logger.debug("[RumorNormalizer] Normalized result:", result);
  return result;
}

/**
 * Check if response has valid rumor content
 */
export function hasValidRumorsContent(response: GeneratedRumorsData): boolean {
  return response.rumors.length > 0 && response.rumors.some((r) => !!r.text);
}
