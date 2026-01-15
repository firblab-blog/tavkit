// Field schema for Chase generator

export interface ManualObstacle {
  name: string;
  description: string;
  check: string;
  failure: string;
  [key: string]: unknown;
}

export interface ManualShortcut {
  name: string;
  description: string;
  benefit: string;
  [key: string]: unknown;
}

export interface ManualChaseData {
  name: string;
  chase_type: string;
  terrain: string;
  difficulty: string;
  description: string;
  setting: string;
  quarry: string;
  pursuers: string;
  starting_conditions: string;
  obstacles: ManualObstacle[];
  complications: string[];
  shortcuts: ManualShortcut[];
  environmental_factors: string[];
  success_condition: string;
  failure_condition: string;
  success_reward: string;
  failure_consequence: string;
}

export const defaultChaseData: ManualChaseData = {
  name: "",
  chase_type: "pursuit",
  terrain: "urban",
  difficulty: "medium",
  description: "",
  setting: "",
  quarry: "",
  pursuers: "",
  starting_conditions: "",
  obstacles: [],
  complications: [],
  shortcuts: [],
  environmental_factors: [],
  success_condition: "",
  failure_condition: "",
  success_reward: "",
  failure_consequence: "",
};

export const chaseTypeOptions = [
  { value: "foot_chase", label: "Foot Chase" },
  { value: "mounted_chase", label: "Mounted Chase" },
  { value: "vehicle_chase", label: "Vehicle Chase" },
  { value: "flying_chase", label: "Flying Chase" },
  { value: "underwater_chase", label: "Underwater Chase" },
  { value: "rooftop_chase", label: "Rooftop Chase" },
];

export const chaseDifficultyOptions = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "deadly", label: "Deadly" },
];

export const chaseTerrainOptions = [
  { value: "urban", label: "Urban (City Streets)" },
  { value: "forest", label: "Forest" },
  { value: "mountain", label: "Mountain" },
  { value: "desert", label: "Desert" },
  { value: "swamp", label: "Swamp" },
  { value: "underground", label: "Underground" },
  { value: "market", label: "Crowded Market" },
  { value: "docks", label: "Docks/Harbor" },
];
