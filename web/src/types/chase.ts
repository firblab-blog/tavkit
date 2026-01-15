// Chase Tracker Types
// Matches backend models in backend/internal/db/models.go

export interface Chase {
  id: string;
  user_id: string;
  campaign_id?: string;
  name: string;
  chase_type: string; // 'foot_chase', 'mounted_chase', 'vehicle_chase', 'aerial', 'aquatic', etc.
  terrain: string; // 'urban', 'forest', 'dungeon', 'rooftop', etc.
  difficulty: string; // 'easy', 'medium', 'challenging', 'hard', 'extreme'
  description?: string;
  setting?: string;
  participants?: any; // JSON
  starting_conditions?: string;
  obstacles?: any[]; // JSON
  complications?: string[]; // JSON
  shortcuts?: any[]; // JSON
  chase_phases?: any[]; // JSON
  ending_conditions?: any; // JSON
  rewards?: any; // JSON
  special_rules?: string;
  environmental_factors?: string[]; // JSON
  ai_generated: boolean;
  ai_provider?: string;

  // Tracker-specific fields
  current_round: number;
  max_rounds?: number;
  starting_distance: number;
  current_distance: number;
  catch_threshold: number;
  escape_threshold: number;
  status: "setup" | "active" | "completed";
  outcome?: "caught" | "escaped" | "timeout" | "alternate";
  notes?: string;

  created_at: string;
  updated_at: string;
}

export interface ChaseParticipant {
  id: string;
  chase_id: string;
  participant_type: "pc" | "npc";
  character_id?: string; // Reference to characters table
  npc_id?: string; // Reference to npcs table
  name: string;
  role: "pursuer" | "quarry";
  movement_speed: number; // In feet
  current_position: number; // Position on track (spaces from start)
  stamina: number;
  max_stamina: number;
  has_dashed: boolean; // Has used Dash action this round
  conditions?: string[]; // ['advantage', 'disadvantage', 'exhausted']
  movement_this_round: number;
  created_at: string;
}

export interface ChaseChallenge {
  id: string;
  chase_id: string;
  round: number;
  description: string;
  skill: string; // 'Athletics', 'Acrobatics', 'Perception', etc.
  dc: number;
  success_effect: string; // "+1 space", "Advantage next round", etc.
  failure_effect: string; // "-1 space", "Fall prone", etc.
  alternate_skills?: string[]; // Alternative valid skills
  ai_generated: boolean;
  used: boolean; // Has this challenge been used?
  created_at: string;
}

export interface ChaseComplication {
  id: string;
  chase_id: string;
  round: number;
  description: string;
  complication_type:
    | "obstacle"
    | "hazard"
    | "bystander"
    | "terrain_change"
    | "reinforcement";
  effect?: string;
  save_ability?: string; // 'Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'
  save_dc?: number;
  resolved: boolean;
  created_at: string;
}

export interface ChaseEvent {
  id: string;
  chase_id: string;
  round: number;
  participant_name?: string;
  action: string; // "rolled Athletics", "moved forward", "triggered complication"
  roll?: number; // Dice roll result
  success?: boolean; // Was the check successful?
  effect: string; // Description of what happened
  created_at: string;
}

export interface ChaseTemplate {
  id: string;
  name: string;
  description?: string;
  chase_type: string;
  terrain?: string;
  default_starting_distance?: number;
  default_catch_threshold?: number;
  default_escape_threshold?: number;
  default_max_rounds?: number;
  difficulty?: string;
  challenges: ChallengeTemplate[]; // Array of challenge templates
  complications: ComplicationTemplate[]; // Array of complication templates
  is_public: boolean;
  created_by?: string;
  created_at: string;
}

// Template subtypes
export interface ChallengeTemplate {
  description: string;
  skill: string;
  dc: number;
  success_effect: string;
  failure_effect: string;
  alternate_skills?: string[];
}

export interface ComplicationTemplate {
  description: string;
  complication_type:
    | "obstacle"
    | "hazard"
    | "bystander"
    | "terrain_change"
    | "reinforcement";
  effect?: string;
  save_ability?: string;
  save_dc?: number;
}

// Request types for API calls

export interface CreateChaseRequest {
  campaign_id?: string;
  name: string;
  chase_type: string;
  terrain: string;
  difficulty: string;
  description?: string;
  setting?: string;
  starting_distance?: number;
  catch_threshold?: number;
  escape_threshold?: number;
  max_rounds?: number;
}

export interface GenerateChaseRequest {
  campaign_id?: string;
  chase_type: string;
  terrain: string;
  difficulty: string;
  party_level?: string;
  special_requests?: string;
  max_tokens?: number;
  timeout?: number;
}

export interface UpdateChaseRequest {
  name?: string;
  chase_type?: string;
  terrain?: string;
  difficulty?: string;
  description?: string;
  current_round?: number;
  current_distance?: number;
  status?: "setup" | "active" | "completed";
  outcome?: "caught" | "escaped" | "timeout" | "alternate";
  notes?: string;
}

export interface CreateChaseParticipantRequest {
  chase_id: string;
  participant_type: "pc" | "npc";
  character_id?: string;
  npc_id?: string;
  name: string;
  role: "pursuer" | "quarry";
  movement_speed: number;
  stamina?: number;
  max_stamina?: number;
}

export interface UpdateChaseParticipantRequest {
  current_position?: number;
  stamina?: number;
  has_dashed?: boolean;
  conditions?: string[];
  movement_this_round?: number;
}

export interface CreateChaseChallengeRequest {
  chase_id: string;
  round: number;
  description: string;
  skill: string;
  dc: number;
  success_effect: string;
  failure_effect: string;
  alternate_skills?: string[];
  ai_generated?: boolean;
}

export interface CreateChaseComplicationRequest {
  chase_id: string;
  round: number;
  description: string;
  complication_type:
    | "obstacle"
    | "hazard"
    | "bystander"
    | "terrain_change"
    | "reinforcement";
  effect?: string;
  save_ability?: string;
  save_dc?: number;
}

export interface CreateChaseEventRequest {
  chase_id: string;
  round: number;
  participant_name?: string;
  action: string;
  roll?: number;
  success?: boolean;
  effect: string;
}

export interface GenerateChallengeRequest {
  chase_id: string;
  round: number;
  chase_type: string;
  terrain: string;
  difficulty: string;
  campaign_context?: string;
  previous_challenges?: ChaseChallenge[];
}

export interface GenerateComplicationRequest {
  chase_id: string;
  round: number;
  chase_type: string;
  terrain: string;
  current_distance: number;
  tension_level?: "low" | "medium" | "high";
  recent_events?: string[];
}

// UI State types

export interface ChaseTrackerState {
  chase: Chase | null;
  participants: ChaseParticipant[];
  challenges: ChaseChallenge[];
  complications: ChaseComplication[];
  events: ChaseEvent[];
  currentChallenge: ChaseChallenge | null;
  pendingComplications: ChaseComplication[];
  loading: boolean;
  error: string | null;
}

export interface ParticipantPosition {
  participant: ChaseParticipant;
  position: number; // Absolute position on track
  icon: string; // Emoji or icon to display
}

// Constants

export const CHASE_TYPES = [
  { value: "foot_chase", label: "Foot Chase" },
  { value: "mounted_chase", label: "Mounted Chase" },
  { value: "vehicle_chase", label: "Vehicle Chase" },
  { value: "aerial", label: "Aerial Chase" },
  { value: "aquatic", label: "Aquatic Chase" },
  { value: "urban_pursuit", label: "Urban Pursuit" },
  { value: "wilderness", label: "Wilderness Chase" },
  { value: "dungeon", label: "Dungeon Chase" },
  { value: "magical", label: "Magical Chase" },
] as const;

export const TERRAIN_TYPES = [
  { value: "urban", label: "Urban Streets" },
  { value: "rooftops", label: "Rooftops" },
  { value: "forest", label: "Forest" },
  { value: "mountains", label: "Mountains" },
  { value: "desert", label: "Desert" },
  { value: "swamp", label: "Swamp" },
  { value: "snow", label: "Snow/Ice" },
  { value: "underground", label: "Underground" },
  { value: "waterways", label: "Waterways" },
  { value: "magical", label: "Magical Terrain" },
] as const;

export const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Easy (DC 8-11)" },
  { value: "medium", label: "Medium (DC 12-15)" },
  { value: "hard", label: "Hard (DC 16-18)" },
  { value: "deadly", label: "Deadly (DC 19+)" },
] as const;

export const SKILLS = [
  { value: "Athletics", label: "Athletics", ability: "str" },
  { value: "Acrobatics", label: "Acrobatics", ability: "dex" },
  { value: "Perception", label: "Perception", ability: "wis" },
  { value: "Stealth", label: "Stealth", ability: "dex" },
  { value: "Intimidation", label: "Intimidation", ability: "cha" },
  { value: "Deception", label: "Deception", ability: "cha" },
  { value: "Survival", label: "Survival", ability: "wis" },
  { value: "Investigation", label: "Investigation", ability: "int" },
  { value: "Performance", label: "Performance", ability: "cha" },
  { value: "Persuasion", label: "Persuasion", ability: "cha" },
] as const;

export const ABILITIES = [
  { value: "str", label: "Strength" },
  { value: "dex", label: "Dexterity" },
  { value: "con", label: "Constitution" },
  { value: "int", label: "Intelligence" },
  { value: "wis", label: "Wisdom" },
  { value: "cha", label: "Charisma" },
] as const;

export const COMPLICATION_TYPES = [
  { value: "obstacle", label: "Obstacle" },
  { value: "hazard", label: "Environmental Hazard" },
  { value: "bystander", label: "Innocent Bystander" },
  { value: "terrain_change", label: "Terrain Change" },
  { value: "reinforcement", label: "Reinforcement" },
] as const;

// Helper functions

export function getChaseStatusLabel(status: Chase["status"]): string {
  const labels: Record<Chase["status"], string> = {
    setup: "Setting Up",
    active: "In Progress",
    completed: "Completed",
  };
  return labels[status] || status;
}

export function getChaseOutcomeLabel(outcome?: Chase["outcome"]): string {
  if (!outcome) return "Unknown";
  const labels: Record<NonNullable<Chase["outcome"]>, string> = {
    caught: "Quarry Caught",
    escaped: "Quarry Escaped",
    timeout: "Time Limit Reached",
    alternate: "Alternative Outcome",
  };
  return labels[outcome] || outcome;
}

export function getParticipantRoleLabel(
  role: ChaseParticipant["role"],
): string {
  return role === "pursuer" ? "Pursuer" : "Quarry";
}

export function getComplicationTypeLabel(
  type: ChaseComplication["complication_type"],
): string {
  const labels: Record<ChaseComplication["complication_type"], string> = {
    obstacle: "Obstacle",
    hazard: "Environmental Hazard",
    bystander: "Innocent Bystander",
    terrain_change: "Terrain Change",
    reinforcement: "Reinforcement",
  };
  return labels[type] || type;
}

export function calculateDistance(participants: ChaseParticipant[]): number {
  const pursuers = participants.filter((p) => p.role === "pursuer");
  const quarry = participants.filter((p) => p.role === "quarry");

  if (pursuers.length === 0 || quarry.length === 0) return 0;

  // Average position of pursuers vs average position of quarry
  const pursuerAvg =
    pursuers.reduce((sum, p) => sum + p.current_position, 0) / pursuers.length;
  const quarryAvg =
    quarry.reduce((sum, p) => sum + p.current_position, 0) / quarry.length;

  return Math.abs(quarryAvg - pursuerAvg);
}

export function checkWinConditions(
  chase: Chase,
  distance: number,
): {
  won: boolean;
  outcome: Chase["outcome"];
  message: string;
} | null {
  // Check if caught
  if (distance <= chase.catch_threshold) {
    return {
      won: true,
      outcome: "caught",
      message: "The pursuers have caught up to the quarry!",
    };
  }

  // Check if escaped
  if (distance >= chase.escape_threshold) {
    return {
      won: true,
      outcome: "escaped",
      message: "The quarry has escaped!",
    };
  }

  // Check time limit
  if (chase.max_rounds && chase.current_round >= chase.max_rounds) {
    return {
      won: true,
      outcome: "timeout",
      message: "Time limit reached!",
    };
  }

  return null;
}

export function getDCFromDifficulty(difficulty: string): {
  min: number;
  max: number;
} {
  const ranges: Record<string, { min: number; max: number }> = {
    easy: { min: 8, max: 11 },
    medium: { min: 12, max: 15 },
    hard: { min: 16, max: 18 },
    deadly: { min: 19, max: 25 },
  };
  return ranges[difficulty] || ranges.medium;
}

export function getParticipantIcon(participant: ChaseParticipant): string {
  // Return appropriate emoji based on participant type and role
  if (participant.role === "quarry") {
    return participant.participant_type === "pc" ? "🏃" : "🏃‍♂️";
  } else {
    return participant.participant_type === "pc" ? "⚔️" : "👤";
  }
}
