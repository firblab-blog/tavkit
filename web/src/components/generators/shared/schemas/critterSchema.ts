// Field schema for manual Critter entry

export interface ManualCritterStats {
  ac: number | null;
  hp: number | null;
  speed: string;
  str: number | null;
  dex: number | null;
  con: number | null;
  int: number | null;
  wis: number | null;
  cha: number | null;
}

export interface ManualCritterAbility {
  name: string;
  description: string;
}

export interface ManualCritterData {
  name: string;
  species: string;
  critter_type: string;
  size: string;
  temperament: string;
  habitat: string;
  description: string;
  behavior: string;
  stats: ManualCritterStats;
  special_abilities: ManualCritterAbility[];
  uses: string[];
  training_difficulty: string;
  diet: string;
  lifespan: string;
  interesting_facts: string[];
  encounter_notes: string;
}

export const defaultCritterStats: ManualCritterStats = {
  ac: null,
  hp: null,
  speed: "",
  str: null,
  dex: null,
  con: null,
  int: null,
  wis: null,
  cha: null,
};

export const defaultCritterData: ManualCritterData = {
  name: "",
  species: "",
  critter_type: "mammal",
  size: "medium",
  temperament: "neutral",
  habitat: "forest",
  description: "",
  behavior: "",
  stats: { ...defaultCritterStats },
  special_abilities: [],
  uses: [],
  training_difficulty: "",
  diet: "",
  lifespan: "",
  interesting_facts: [],
  encounter_notes: "",
};

export const critterTypeOptions = [
  { value: "bird", label: "Bird" },
  { value: "mammal", label: "Mammal" },
  { value: "reptile", label: "Reptile" },
  { value: "amphibian", label: "Amphibian" },
  { value: "insect", label: "Insect" },
  { value: "aquatic", label: "Aquatic" },
  { value: "magical", label: "Magical" },
  { value: "hybrid", label: "Hybrid" },
];

export const sizeOptions = [
  { value: "tiny", label: "Tiny" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "huge", label: "Huge" },
];

export const temperamentOptions = [
  { value: "docile", label: "Docile" },
  { value: "neutral", label: "Neutral" },
  { value: "skittish", label: "Skittish" },
  { value: "territorial", label: "Territorial" },
  { value: "aggressive", label: "Aggressive" },
  { value: "curious", label: "Curious" },
];

export const habitatOptions = [
  { value: "forest", label: "Forest" },
  { value: "mountain", label: "Mountain" },
  { value: "desert", label: "Desert" },
  { value: "swamp", label: "Swamp" },
  { value: "plains", label: "Plains" },
  { value: "arctic", label: "Arctic" },
  { value: "underground", label: "Underground" },
  { value: "coastal", label: "Coastal" },
  { value: "urban", label: "Urban" },
];
