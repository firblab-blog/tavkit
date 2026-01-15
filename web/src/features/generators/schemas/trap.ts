// Field schema for Trap entries

export interface ManualTrapData {
  name: string;
  trap_type: string;
  trigger: string;
  effect: string;
  damage: string;
  save_dc: number | null;
  detection_dc: number | null;
  disarm_dc: number | null;
  reset: string;
  bypass: string;
  countermeasures: string[];
  lore: string;
}

export const defaultTrapData: ManualTrapData = {
  name: "",
  trap_type: "mechanical",
  trigger: "",
  effect: "",
  damage: "",
  save_dc: null,
  detection_dc: null,
  disarm_dc: null,
  reset: "",
  bypass: "",
  countermeasures: [],
  lore: "",
};

export const trapTypeOptions = [
  { value: "mechanical", label: "Mechanical Trap" },
  { value: "magical", label: "Magical Trap" },
  { value: "puzzle", label: "Puzzle" },
  { value: "environmental", label: "Environmental Hazard" },
  { value: "illusion", label: "Illusion Trap" },
  { value: "curse", label: "Curse/Magical Ward" },
];

export const trapDifficultyOptions = [
  { value: "trivial", label: "Trivial (DC 5-10)" },
  { value: "easy", label: "Easy (DC 10-12)" },
  { value: "medium", label: "Medium (DC 13-15)" },
  { value: "hard", label: "Hard (DC 16-18)" },
  { value: "deadly", label: "Deadly (DC 19+)" },
];

export const trapEnvironmentOptions = [
  { value: "dungeon", label: "Dungeon" },
  { value: "tomb", label: "Tomb/Crypt" },
  { value: "temple", label: "Temple/Shrine" },
  { value: "castle", label: "Castle/Keep" },
  { value: "cave", label: "Cave/Cavern" },
  { value: "forest", label: "Forest/Wilderness" },
  { value: "urban", label: "Urban/City" },
  { value: "underwater", label: "Underwater" },
];
