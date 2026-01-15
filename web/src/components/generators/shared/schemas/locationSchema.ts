// Field schema for manual Location entry

export interface ManualLocationData {
  name: string;
  location_type: string;
  size: string;
  description: string;
  atmosphere: string;
  notable_features: string[];
  inhabitants: string[];
  secrets: string[];
  hazards: string[];
  treasure: string[];
  connections: string[];
  history: string;
}

export const defaultLocationData: ManualLocationData = {
  name: "",
  location_type: "dungeon",
  size: "medium",
  description: "",
  atmosphere: "",
  notable_features: [],
  inhabitants: [],
  secrets: [],
  hazards: [],
  treasure: [],
  connections: [],
  history: "",
};

export const locationTypeOptions = [
  { value: "dungeon", label: "Dungeon" },
  { value: "tavern", label: "Tavern/Inn" },
  { value: "town", label: "Town/Village" },
  { value: "city", label: "City" },
  { value: "wilderness", label: "Wilderness" },
  { value: "ruin", label: "Ruins" },
  { value: "temple", label: "Temple/Shrine" },
  { value: "castle", label: "Castle/Fortress" },
  { value: "cave", label: "Cave System" },
  { value: "manor", label: "Manor/Estate" },
];

export const sizeOptions = [
  { value: "tiny", label: "Tiny" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "huge", label: "Huge" },
];
