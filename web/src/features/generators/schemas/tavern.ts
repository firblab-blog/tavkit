// Field schema for Tavern entries

export interface ManualMenuItem {
  name: string;
  description: string;
  price: string;
  [key: string]: unknown;
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
  { value: "roadhouse", label: "Roadhouse" },
  { value: "brewery", label: "Brewery" },
];

export const tavernQualityOptions = [
  { value: "poor", label: "Poor (dive, rough)" },
  { value: "modest", label: "Modest (working class)" },
  { value: "average", label: "Average (comfortable)" },
  { value: "wealthy", label: "Wealthy (upscale)" },
  { value: "aristocratic", label: "Aristocratic (luxurious)" },
];

export const tavernSizeOptions = [
  { value: "tiny", label: "Tiny (5-10 patrons)" },
  { value: "small", label: "Small (10-20 patrons)" },
  { value: "medium", label: "Medium (20-40 patrons)" },
  { value: "large", label: "Large (40-80 patrons)" },
  { value: "massive", label: "Massive (80+ patrons)" },
];
