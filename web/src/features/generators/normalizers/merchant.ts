// Merchant Response Normalizer
// Converts raw AI responses to typed MerchantData

import { normalizeStringArray } from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// ============================================================================
// Types
// ============================================================================

export interface InventoryItem {
  name: string;
  description: string;
  price: string;
  quantity?: string;
}

export interface ServiceItem {
  name: string;
  description: string;
  price: string;
}

export interface GeneratedMerchantData {
  name: string;
  shop_type: string;
  atmosphere: string;
  description: string;
  location: string;
  owner_name: string;
  owner_personality: string;
  owner_description: string;
  inventory: InventoryItem[];
  services: ServiceItem[];
  special_items: InventoryItem[];
  rumors: string[];
  recently_sold: string[];
  special_notes: string;
  haggle_willingness: string;
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeInventoryItem(value: unknown): InventoryItem | null {
  if (!value) return null;

  if (typeof value === "string") {
    return { name: value, description: "", price: "varies" };
  }

  if (typeof value === "object" && value !== null) {
    const item = value as Record<string, unknown>;
    return {
      name: String(item.name || item.item || "Unknown Item"),
      description: String(item.description || item.desc || ""),
      price: String(item.price || item.cost || "varies"),
      quantity: item.quantity ? String(item.quantity) : undefined,
    };
  }

  return null;
}

function normalizeInventoryItems(value: unknown): InventoryItem[] {
  if (!value) return [];

  // Handle array format
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeInventoryItem(item))
      .filter((item): item is InventoryItem => item !== null);
  }

  // Handle categorized object format (e.g., {Accessories: [...], Armor: [...], Weapons: [...]})
  if (typeof value === "object" && value !== null) {
    const categorizedObj = value as Record<string, unknown>;
    const allItems: InventoryItem[] = [];

    for (const category of Object.keys(categorizedObj)) {
      const categoryItems = categorizedObj[category];
      if (Array.isArray(categoryItems)) {
        for (const item of categoryItems) {
          const normalized = normalizeInventoryItem(item);
          if (normalized) {
            allItems.push(normalized);
          }
        }
      }
    }

    return allItems;
  }

  return [];
}

function normalizeService(value: unknown): ServiceItem | null {
  if (!value) return null;

  if (typeof value === "string") {
    return { name: value, description: "", price: "varies" };
  }

  if (typeof value === "object" && value !== null) {
    const service = value as Record<string, unknown>;
    return {
      name: String(service.name || service.service || "Unknown Service"),
      description: String(service.description || ""),
      price: String(service.price || service.cost || "varies"),
    };
  }

  return null;
}

function normalizeServices(value: unknown): ServiceItem[] {
  if (!value || !Array.isArray(value)) return [];

  return value
    .map((service) => normalizeService(service))
    .filter((service): service is ServiceItem => service !== null);
}

function extractOwnerInfo(raw: Record<string, unknown>): {
  name: string;
  personality: string;
  description: string;
} {
  const owner = raw.owner as Record<string, unknown> | undefined;
  const keeper = raw.keeper as Record<string, unknown> | undefined;
  const nested = owner || keeper;

  if (nested && typeof nested === "object") {
    return {
      name: String(nested.name || raw.owner_name || "Unknown"),
      personality: String(nested.personality || raw.owner_personality || ""),
      description: String(nested.description || raw.owner_description || ""),
    };
  }

  return {
    name: String(raw.owner_name || raw.keeper_name || "Unknown"),
    personality: String(raw.owner_personality || raw.keeper_personality || ""),
    description: String(raw.owner_description || raw.keeper_description || ""),
  };
}

// ============================================================================
// Main Normalizer
// ============================================================================

export function normalizeMerchantResponse(
  raw: Record<string, unknown>,
): GeneratedMerchantData {
  logger.debug("[normalizeMerchant] Input:", raw);

  // Handle case where description contains the entire JSON response
  let processedRaw = raw;
  if (raw.description && typeof raw.description === "string") {
    const descStr = (raw.description as string).trim();
    if (descStr.startsWith("{") && descStr.endsWith("}")) {
      try {
        const parsedMerchant = JSON.parse(descStr);
        logger.debug(
          "[normalizeMerchant] Parsed merchant from JSON description:",
          parsedMerchant,
        );
        processedRaw = parsedMerchant;
      } catch (e) {
        logger.warn(
          "[normalizeMerchant] Failed to parse description as JSON:",
          e,
        );
      }
    }
  }

  // Expected fields
  const expectedFields = [
    "name",
    "shop_name",
    "title",
    "shop_type",
    "type",
    "atmosphere",
    "description",
    "location",
    "owner",
    "owner_name",
    "owner_personality",
    "owner_description",
    "keeper",
    "keeper_name",
    "keeper_personality",
    "keeper_description",
    "inventory",
    "items",
    "wares",
    "stock",
    "services",
    "special_items",
    "magical_items",
    "rare_items",
    "rumors",
    "gossip",
    "recently_sold",
    "special_notes",
    "notes",
    "secrets",
    "haggle_willingness",
    "haggling",
    "bargaining",
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

  const owner = extractOwnerInfo(processedRaw);

  // Get inventory from various possible field names
  let inventory = normalizeInventoryItems(processedRaw.inventory);
  if (inventory.length === 0) {
    inventory = normalizeInventoryItems(
      processedRaw.items || processedRaw.wares || processedRaw.stock,
    );
  }

  // Get special items from various possible field names
  let specialItems = normalizeInventoryItems(processedRaw.special_items);
  if (specialItems.length === 0) {
    specialItems = normalizeInventoryItems(
      processedRaw.magical_items || processedRaw.rare_items,
    );
  }

  // Get haggle willingness from various possible field names
  let haggleWillingness = "";
  if (processedRaw.haggle_willingness) {
    haggleWillingness = String(processedRaw.haggle_willingness);
  } else if (processedRaw.haggling) {
    haggleWillingness = String(processedRaw.haggling);
  } else if (processedRaw.bargaining) {
    haggleWillingness = String(processedRaw.bargaining);
  }

  const result: GeneratedMerchantData = {
    name: String(
      processedRaw.name ||
        processedRaw.shop_name ||
        processedRaw.title ||
        "Unknown Shop",
    ),
    shop_type: String(processedRaw.shop_type || processedRaw.type || ""),
    atmosphere: String(processedRaw.atmosphere || ""),
    description: description,
    location: String(processedRaw.location || ""),
    owner_name: owner.name,
    owner_personality: owner.personality,
    owner_description: owner.description,
    inventory: inventory,
    services: normalizeServices(processedRaw.services),
    special_items: specialItems,
    rumors: normalizeStringArray(processedRaw.rumors || processedRaw.gossip),
    recently_sold: normalizeStringArray(processedRaw.recently_sold),
    special_notes: String(
      processedRaw.special_notes ||
        processedRaw.notes ||
        processedRaw.secrets ||
        "",
    ),
    haggle_willingness: haggleWillingness,
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  if (raw._parse_warning) {
    result._parseError = String(raw._parse_warning);
  }

  logger.debug("[normalizeMerchant] Result:", result);
  return result;
}

export function hasValidMerchantContent(
  merchant: GeneratedMerchantData,
): boolean {
  return !!(
    merchant.name &&
    merchant.name !== "Unknown Shop" &&
    (merchant.description ||
      merchant.atmosphere ||
      merchant.owner_name !== "Unknown" ||
      merchant.inventory.length > 0)
  );
}
