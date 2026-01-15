// Field schema for Merchant entries

export interface ManualInventoryItem {
  name: string;
  description: string;
  price: string;
  [key: string]: unknown;
}

export interface ManualMerchantData {
  name: string;
  merchant_type: string;
  description: string;
  personality: string;
  appearance: string;
  backstory: string;
  inventory: ManualInventoryItem[];
  services: string[];
  specialties: string[];
  quirks: string[];
  rumors: string[];
  connections: string[];
}

export const defaultMerchantData: ManualMerchantData = {
  name: "",
  merchant_type: "general",
  description: "",
  personality: "",
  appearance: "",
  backstory: "",
  inventory: [],
  services: [],
  specialties: [],
  quirks: [],
  rumors: [],
  connections: [],
};

export const merchantTypeOptions = [
  { value: "general_store", label: "General Store" },
  { value: "weapon_shop", label: "Weapon Shop" },
  { value: "armor_shop", label: "Armor Shop" },
  { value: "magic_shop", label: "Magic Shop" },
  { value: "potion_shop", label: "Potion Shop" },
  { value: "bookstore", label: "Bookstore" },
  { value: "jeweler", label: "Jeweler" },
  { value: "tailor", label: "Tailor / Clothier" },
  { value: "blacksmith", label: "Blacksmith" },
  { value: "apothecary", label: "Apothecary" },
  { value: "curiosity_shop", label: "Curiosity Shop" },
  { value: "pawn_shop", label: "Pawn Shop" },
  { value: "exotic_goods", label: "Exotic Goods" },
  { value: "temple_shop", label: "Temple Shop" },
];

export const merchantQualityOptions = [
  { value: "poor", label: "Poor (run-down, cheap)" },
  { value: "modest", label: "Modest (working class)" },
  { value: "average", label: "Average (comfortable)" },
  { value: "wealthy", label: "Wealthy (upscale)" },
  { value: "aristocratic", label: "Aristocratic (luxurious)" },
];

export const merchantSizeOptions = [
  { value: "tiny", label: "Tiny (stall/cart)" },
  { value: "small", label: "Small (single room)" },
  { value: "medium", label: "Medium (storefront)" },
  { value: "large", label: "Large (warehouse)" },
  { value: "massive", label: "Massive (emporium)" },
];
