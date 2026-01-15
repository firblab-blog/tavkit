// Field schema for manual Tavern entry

export interface ManualMenuItem {
  name: string;
  description: string;
  price: string;
}

export interface ManualTavernData {
  name: string;
  tavern_type: string;
  size: string;
  description: string;
  atmosphere: string;
  owner_name: string;
  owner_description: string;
  notable_staff: string[];
  menu_items: ManualMenuItem[];
  rumors: string[];
  regular_patrons: string[];
  special_features: string[];
  secrets: string[];
}

export const defaultTavernData: ManualTavernData = {
  name: "",
  tavern_type: "tavern",
  size: "medium",
  description: "",
  atmosphere: "",
  owner_name: "",
  owner_description: "",
  notable_staff: [],
  menu_items: [],
  rumors: [],
  regular_patrons: [],
  special_features: [],
  secrets: [],
};

export const tavernTypeOptions = [
  { value: "tavern", label: "Tavern" },
  { value: "inn", label: "Inn" },
  { value: "pub", label: "Pub/Alehouse" },
  { value: "noble", label: "Noble Establishment" },
  { value: "dive", label: "Dive Bar" },
  { value: "guild", label: "Guild Hall" },
];
