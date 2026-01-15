// Field schema for Location entries

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

export const locationSizeOptions = [
  { value: "tiny", label: "Tiny" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "huge", label: "Huge" },
];

export const dangerLevelOptions = [
  { value: "safe", label: "Safe" },
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "deadly", label: "Deadly" },
];

export const themeOptions = [
  { value: "fantasy", label: "Standard Fantasy" },
  { value: "gothic", label: "Gothic Horror" },
  { value: "high_magic", label: "High Magic" },
  { value: "low_magic", label: "Low Magic" },
  { value: "dark", label: "Dark/Grim" },
  { value: "whimsical", label: "Whimsical/Fey" },
  { value: "steampunk", label: "Steampunk" },
  { value: "ancient", label: "Ancient/Forgotten" },
  { value: "corrupted", label: "Corrupted/Cursed" },
];
