// Field schema for Dialogue generator

export interface ManualDialogueOption {
  player_option: string;
  npc_response: string;
  outcome: string;
  [key: string]: unknown;
}

export interface ManualDialogueTree {
  friendly: ManualDialogueOption;
  neutral: ManualDialogueOption;
  hostile: ManualDialogueOption;
}

export interface ManualSkillCheck {
  skill: string;
  dc: number | null;
  success: string;
  failure: string;
  [key: string]: unknown;
}

export interface ManualDialogueData {
  character_name: string;
  scene_setting: string;
  mood: string;
  opening_line: string;
  dialogue_tree: ManualDialogueTree;
  skill_checks: ManualSkillCheck[];
  body_language: string;
  information_revealed: string[];
  potential_quests: string[];
}

export const defaultDialogueOption: ManualDialogueOption = {
  player_option: "",
  npc_response: "",
  outcome: "",
};

export const defaultDialogueTree: ManualDialogueTree = {
  friendly: { ...defaultDialogueOption },
  neutral: { ...defaultDialogueOption },
  hostile: { ...defaultDialogueOption },
};

export const defaultDialogueData: ManualDialogueData = {
  character_name: "",
  scene_setting: "",
  mood: "",
  opening_line: "",
  dialogue_tree: { ...defaultDialogueTree },
  skill_checks: [],
  body_language: "",
  information_revealed: [],
  potential_quests: [],
};

export const moodOptions = [
  { value: "tense", label: "Tense" },
  { value: "lighthearted", label: "Lighthearted" },
  { value: "mysterious", label: "Mysterious" },
  { value: "urgent", label: "Urgent" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "threatening", label: "Threatening" },
];

export const dialogueTypeOptions = [
  { value: "random", label: "Random (surprise me)" },
  { value: "quest_giver", label: "Quest Giver (assign mission)" },
  { value: "merchant", label: "Merchant (trade goods)" },
  { value: "informant", label: "Informant (share secrets)" },
  { value: "antagonist", label: "Antagonist (create conflict)" },
  { value: "ally", label: "Ally (offer help)" },
  { value: "neutral", label: "Neutral (bystander)" },
];

export const personalityOptions = [
  { value: "random", label: "Random" },
  { value: "friendly", label: "Friendly" },
  { value: "suspicious", label: "Suspicious" },
  { value: "gruff", label: "Gruff" },
  { value: "mysterious", label: "Mysterious" },
  { value: "nervous", label: "Nervous" },
  { value: "arrogant", label: "Arrogant" },
  { value: "helpful", label: "Helpful" },
  { value: "deceptive", label: "Deceptive" },
];

export const toneOptions = [
  { value: "random", label: "Random" },
  { value: "tense", label: "Tense" },
  { value: "lighthearted", label: "Lighthearted" },
  { value: "mysterious", label: "Mysterious" },
  { value: "urgent", label: "Urgent" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "threatening", label: "Threatening" },
];

export const complexityOptions = [
  { value: "simple", label: "Simple (basic exchange)" },
  { value: "moderate", label: "Moderate (multiple options)" },
  { value: "complex", label: "Complex (skill checks, branching)" },
];

export const commonSkills = [
  "Persuasion",
  "Deception",
  "Intimidation",
  "Insight",
  "Perception",
  "Investigation",
  "History",
  "Arcana",
  "Religion",
  "Nature",
  "Athletics",
  "Acrobatics",
  "Sleight of Hand",
  "Stealth",
  "Performance",
];
