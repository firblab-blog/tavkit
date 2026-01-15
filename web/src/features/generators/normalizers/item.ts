// Item Response Normalizer
// Converts raw AI responses to typed ItemData

import {
  normalizeBoolean,
  normalizeFlexibleField,
} from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// ============================================================================
// Types
// ============================================================================

export interface OriginObject {
  creator?: string;
  creation_date?: string;
  location_created?: string;
  backstory?: string;
}

export interface PreviousOwnerObject {
  name?: string;
  description?: string;
}

export interface ComplicationObject {
  name?: string;
  description?: string;
  effect?: string;
}

export interface ValueObject {
  amount: number;
  currency?: string;
}

export interface WeightObject {
  amount: number;
  unit?: string;
}

export interface GeneratedItemData {
  name: string;
  type: string;
  rarity: string;
  description: string;
  properties: Record<string, unknown>;
  origin: string | OriginObject;
  previous_owner: string | PreviousOwnerObject;
  complication: string | ComplicationObject;
  value: number | ValueObject;
  weight: number | WeightObject;
  attunement: boolean;
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeProperties(value: unknown): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (Array.isArray(value)) {
    const result: Record<string, unknown> = {};
    value.forEach((item, index) => {
      if (typeof item === "string") {
        result[item] = true;
      } else if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        if (obj.name) {
          result[String(obj.name)] = obj.description || obj.effect || true;
        } else {
          result[`property_${index}`] = item;
        }
      }
    });
    return result;
  }

  return {};
}

function normalizeNumericField(
  value: unknown,
): number | { amount: number; currency?: string; unit?: string } {
  if (!value) return 0;

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.amount !== undefined) {
      return {
        amount: Number(obj.amount) || 0,
        currency: obj.currency ? String(obj.currency) : undefined,
        unit: obj.unit ? String(obj.unit) : undefined,
      };
    }
  }

  return 0;
}

// ============================================================================
// Display Helpers (exported for use in renderer)
// ============================================================================

export function getValueDisplay(value: number | ValueObject): string {
  if (typeof value === "number") {
    return `${value} gp`;
  }
  if (typeof value === "object" && value.amount !== undefined) {
    return `${value.amount} ${value.currency || "gp"}`;
  }
  return "Unknown";
}

export function getWeightDisplay(weight: number | WeightObject): string {
  if (typeof weight === "number") {
    return `${weight} lb`;
  }
  if (typeof weight === "object" && weight.amount !== undefined) {
    return `${weight.amount} ${weight.unit || "lb"}`;
  }
  return "Unknown";
}

export function getNumericValue(
  value: number | ValueObject | WeightObject,
): number {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value.amount !== undefined)
    return value.amount;
  return 0;
}

// ============================================================================
// Main Normalizer
// ============================================================================

export function normalizeItemResponse(
  raw: Record<string, unknown>,
): GeneratedItemData {
  logger.debug("[normalizeItem] Input:", raw);

  // Handle case where description contains the entire JSON response
  let processedRaw = raw;
  if (raw.description && typeof raw.description === "string") {
    const descStr = (raw.description as string).trim();
    if (descStr.startsWith("{") && descStr.endsWith("}")) {
      try {
        const parsedItem = JSON.parse(descStr);
        logger.debug(
          "[normalizeItem] Parsed item from JSON description:",
          parsedItem,
        );
        processedRaw = parsedItem;
      } catch {
        logger.warn("[normalizeItem] Failed to parse description as JSON:", e);
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    "name",
    "type",
    "rarity",
    "description",
    "properties",
    "origin",
    "previous_owner",
    "complication",
    "value",
    "weight",
    "attunement",
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

  const result: GeneratedItemData = {
    name: String(processedRaw.name || "Unknown Item"),
    type: String(processedRaw.type || ""),
    rarity: String(processedRaw.rarity || ""),
    description: description,
    properties: normalizeProperties(processedRaw.properties),
    origin: normalizeFlexibleField(processedRaw.origin),
    previous_owner: normalizeFlexibleField(processedRaw.previous_owner),
    complication: normalizeFlexibleField(processedRaw.complication),
    value: normalizeNumericField(processedRaw.value),
    weight: normalizeNumericField(processedRaw.weight),
    attunement: normalizeBoolean(processedRaw.attunement),
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  if (raw._parse_warning) {
    result._parseError = String(raw._parse_warning);
  }

  logger.debug("[normalizeItem] Result:", result);
  return result;
}

export function hasValidItemContent(item: GeneratedItemData): boolean {
  return !!(
    item.name &&
    item.name !== "Unknown Item" &&
    (item.description || Object.keys(item.properties).length > 0)
  );
}
