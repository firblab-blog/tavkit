// Field schema for manual Item entry

export interface ManualItemProperty {
  name: string;
  value: string;
}

export interface ManualItemData {
  name: string;
  type: string;
  rarity: string;
  description: string;
  properties: ManualItemProperty[];
  origin: string;
  value: number | null;
  weight: number | null;
  attunement: boolean;
}

export const defaultItemData: ManualItemData = {
  name: "",
  type: "weapon",
  rarity: "uncommon",
  description: "",
  properties: [],
  origin: "",
  value: null,
  weight: null,
  attunement: false,
};

export const itemTypeOptions = [
  { value: "weapon", label: "Weapon" },
  { value: "armor", label: "Armor" },
  { value: "shield", label: "Shield" },
  { value: "ring", label: "Ring" },
  { value: "amulet", label: "Amulet/Necklace" },
  { value: "wand", label: "Wand/Rod/Staff" },
  { value: "potion", label: "Potion" },
  { value: "scroll", label: "Scroll" },
  { value: "wondrous", label: "Wondrous Item" },
  { value: "tool", label: "Tool/Instrument" },
  { value: "treasure", label: "Treasure/Gem" },
];

export const rarityOptions = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "very_rare", label: "Very Rare" },
  { value: "legendary", label: "Legendary" },
  { value: "artifact", label: "Artifact" },
];
