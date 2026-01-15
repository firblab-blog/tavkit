// Field schema for manual NPC entry

export interface ManualNPCStats {
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

export interface ManualNPCData {
  name: string;
  race: string;
  class: string;
  level: number | null;
  occupation: string;
  appearance: string;
  personality: string;
  backstory: string;
  motivation: string;
  traits: string[];
  ideals: string;
  bonds: string;
  flaws: string;
  skills: string[];
  equipment: string[];
  stats: ManualNPCStats;
  plot_hooks: string[];
  voice_notes: string;
}

export const defaultNPCStats: ManualNPCStats = {
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

export const defaultNPCData: ManualNPCData = {
  name: "",
  race: "human",
  class: "",
  level: null,
  occupation: "",
  appearance: "",
  personality: "",
  backstory: "",
  motivation: "",
  traits: [],
  ideals: "",
  bonds: "",
  flaws: "",
  skills: [],
  equipment: [],
  stats: { ...defaultNPCStats },
  plot_hooks: [],
  voice_notes: "",
};

export const raceOptions = [
  { value: "human", label: "Human" },
  { value: "elf", label: "Elf" },
  { value: "dwarf", label: "Dwarf" },
  { value: "halfling", label: "Halfling" },
  { value: "gnome", label: "Gnome" },
  { value: "half-elf", label: "Half-Elf" },
  { value: "half-orc", label: "Half-Orc" },
  { value: "tiefling", label: "Tiefling" },
  { value: "dragonborn", label: "Dragonborn" },
  { value: "other", label: "Other" },
];

export const classOptions = [
  { value: "", label: "None/Commoner" },
  { value: "fighter", label: "Fighter" },
  { value: "wizard", label: "Wizard" },
  { value: "rogue", label: "Rogue" },
  { value: "cleric", label: "Cleric" },
  { value: "ranger", label: "Ranger" },
  { value: "paladin", label: "Paladin" },
  { value: "barbarian", label: "Barbarian" },
  { value: "bard", label: "Bard" },
  { value: "druid", label: "Druid" },
  { value: "monk", label: "Monk" },
  { value: "sorcerer", label: "Sorcerer" },
  { value: "warlock", label: "Warlock" },
];
