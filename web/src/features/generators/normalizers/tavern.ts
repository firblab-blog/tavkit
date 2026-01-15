// Tavern Response Normalizer
// Converts raw AI responses to typed TavernData

import { normalizeStringArray } from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// ============================================================================
// Types
// ============================================================================

export interface MenuItem {
  name: string;
  description: string;
  price: string;
}

export interface Room {
  type: string;
  description: string;
  price: string;
  available: number;
}

export interface Patron {
  name: string;
  race: string;
  description: string;
  hook?: string;
}

export interface GeneratedTavernData {
  name: string;
  type: string;
  atmosphere: string;
  description: string;
  keeper_name: string;
  keeper_personality: string;
  keeper_description: string;
  menu_food: MenuItem[];
  menu_drinks: MenuItem[];
  rooms: Room[];
  patrons: Patron[];
  events: string[];
  rumors: string[];
  special_notes: string;
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeMenuItem(value: unknown): MenuItem | null {
  if (!value) return null;

  if (typeof value === "string") {
    return { name: value, description: "", price: "1 cp" };
  }

  if (typeof value === "object" && value !== null) {
    const item = value as Record<string, unknown>;
    return {
      name: String(item.name || item.item || "Unknown Item"),
      description: String(item.description || item.desc || ""),
      price: String(item.price || item.cost || "1 cp"),
    };
  }

  return null;
}

function normalizeMenuItems(value: unknown): MenuItem[] {
  if (!value || !Array.isArray(value)) return [];

  return value
    .map((item) => normalizeMenuItem(item))
    .filter((item): item is MenuItem => item !== null);
}

function normalizeRoom(value: unknown): Room | null {
  if (!value || typeof value !== "object") return null;

  const room = value as Record<string, unknown>;
  return {
    type: String(room.type || room.name || "Room"),
    description: String(room.description || ""),
    price: String(room.price || room.cost || "5 sp"),
    available: Number(room.available || room.count || 1),
  };
}

function normalizeRooms(value: unknown): Room[] {
  if (!value || !Array.isArray(value)) return [];

  return value
    .map((room) => normalizeRoom(room))
    .filter((room): room is Room => room !== null);
}

function normalizePatron(value: unknown): Patron | null {
  if (!value) return null;

  if (typeof value === "string") {
    return { name: value, race: "Human", description: "" };
  }

  if (typeof value === "object" && value !== null) {
    const patron = value as Record<string, unknown>;
    return {
      name: String(patron.name || "Unknown Patron"),
      race: String(patron.race || patron.species || "Human"),
      description: String(patron.description || ""),
      hook: patron.hook ? String(patron.hook) : undefined,
    };
  }

  return null;
}

function normalizePatrons(value: unknown): Patron[] {
  if (!value || !Array.isArray(value)) return [];

  return value
    .map((patron) => normalizePatron(patron))
    .filter((patron): patron is Patron => patron !== null);
}

function extractKeeperInfo(raw: Record<string, unknown>): {
  name: string;
  personality: string;
  description: string;
} {
  const keeper = raw.keeper as Record<string, unknown> | undefined;
  const owner = raw.owner as Record<string, unknown> | undefined;
  const nested = keeper || owner;

  if (nested && typeof nested === "object") {
    return {
      name: String(nested.name || raw.keeper_name || "Unknown"),
      personality: String(nested.personality || raw.keeper_personality || ""),
      description: String(nested.description || raw.keeper_description || ""),
    };
  }

  return {
    name: String(raw.keeper_name || raw.owner_name || "Unknown"),
    personality: String(raw.keeper_personality || raw.owner_personality || ""),
    description: String(raw.keeper_description || raw.owner_description || ""),
  };
}

function extractMenu(raw: Record<string, unknown>): {
  food: MenuItem[];
  drinks: MenuItem[];
} {
  const menu = raw.menu as Record<string, unknown> | undefined;

  if (menu && typeof menu === "object") {
    return {
      food: normalizeMenuItems(menu.food || menu.meals),
      drinks: normalizeMenuItems(menu.drinks || menu.beverages),
    };
  }

  return {
    food: normalizeMenuItems(raw.menu_food || raw.food),
    drinks: normalizeMenuItems(raw.menu_drinks || raw.drinks),
  };
}

// ============================================================================
// Main Normalizer
// ============================================================================

export function normalizeTavernResponse(
  raw: Record<string, unknown>,
): GeneratedTavernData {
  logger.debug("[normalizeTavern] Input:", raw);

  // Handle case where description contains the entire JSON response
  let processedRaw = raw;
  if (raw.description && typeof raw.description === "string") {
    const descStr = (raw.description as string).trim();
    if (descStr.startsWith("{") && descStr.endsWith("}")) {
      try {
        const parsedTavern = JSON.parse(descStr);
        logger.debug(
          "[normalizeTavern] Parsed tavern from JSON description:",
          parsedTavern,
        );
        processedRaw = parsedTavern;
      } catch (e) {
        logger.warn(
          "[normalizeTavern] Failed to parse description as JSON:",
          e,
        );
      }
    }
  }

  // Expected fields
  const expectedFields = [
    "name",
    "title",
    "establishment_name",
    "type",
    "atmosphere",
    "description",
    "keeper",
    "keeper_name",
    "keeper_personality",
    "keeper_description",
    "owner",
    "owner_name",
    "owner_personality",
    "owner_description",
    "menu",
    "menu_food",
    "menu_drinks",
    "food",
    "drinks",
    "rooms",
    "accommodations",
    "patrons",
    "current_patrons",
    "events",
    "rumors",
    "gossip",
    "special_notes",
    "notes",
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

  const keeper = extractKeeperInfo(processedRaw);
  const menu = extractMenu(processedRaw);

  const result: GeneratedTavernData = {
    name: String(
      processedRaw.name ||
        processedRaw.title ||
        processedRaw.establishment_name ||
        "The Unknown Tavern",
    ),
    type: String(processedRaw.type || ""),
    atmosphere: String(processedRaw.atmosphere || ""),
    description: description,
    keeper_name: keeper.name,
    keeper_personality: keeper.personality,
    keeper_description: keeper.description,
    menu_food: menu.food,
    menu_drinks: menu.drinks,
    rooms: normalizeRooms(processedRaw.rooms || processedRaw.accommodations),
    patrons: normalizePatrons(
      processedRaw.patrons || processedRaw.current_patrons,
    ),
    events: normalizeStringArray(processedRaw.events),
    rumors: normalizeStringArray(processedRaw.rumors || processedRaw.gossip),
    special_notes: String(
      processedRaw.special_notes || processedRaw.notes || "",
    ),
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  if (raw._parse_warning) {
    result._parseError = String(raw._parse_warning);
  }

  logger.debug("[normalizeTavern] Result:", result);
  return result;
}

export function hasValidTavernContent(tavern: GeneratedTavernData): boolean {
  return !!(
    tavern.name &&
    tavern.name !== "The Unknown Tavern" &&
    (tavern.description ||
      tavern.atmosphere ||
      tavern.keeper_name !== "Unknown")
  );
}
