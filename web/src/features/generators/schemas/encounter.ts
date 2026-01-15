// Field schema for Encounter generator

export interface ManualCreature {
  name: string;
  count: number;
  notes: string;
  [key: string]: unknown;
}

export interface ManualEncounterData {
  name: string;
  encounter_type: string;
  difficulty: string;
  description: string;
  environment: string;
  creatures: ManualCreature[];
  tactics: string[];
  complications: string[];
  treasure: string[];
  objectives: string[];
  terrain_features: string[];
  setup: string;
}

export const defaultEncounterData: ManualEncounterData = {
  name: "",
  encounter_type: "combat",
  difficulty: "medium",
  description: "",
  environment: "",
  creatures: [],
  tactics: [],
  complications: [],
  treasure: [],
  objectives: [],
  terrain_features: [],
  setup: "",
};

export const encounterTypeOptions = [
  { value: "combat", label: "Combat" },
  { value: "social", label: "Social" },
  { value: "exploration", label: "Exploration" },
  { value: "puzzle", label: "Puzzle" },
  { value: "chase", label: "Chase" },
  { value: "stealth", label: "Stealth" },
  { value: "boss", label: "Boss Fight" },
];

export const difficultyOptions = [
  { value: "trivial", label: "Trivial" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "deadly", label: "Deadly" },
];

export const encounterEnvironmentOptions = [
  { value: "random", label: "Random" },
  { value: "dungeon", label: "Dungeon" },
  { value: "forest", label: "Forest" },
  { value: "mountain", label: "Mountain" },
  { value: "swamp", label: "Swamp" },
  { value: "desert", label: "Desert" },
  { value: "urban", label: "Urban" },
  { value: "aquatic", label: "Aquatic" },
  { value: "arctic", label: "Arctic" },
  { value: "planar", label: "Planar" },
];
