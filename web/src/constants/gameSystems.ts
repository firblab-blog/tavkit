/**
 * Supported Game Systems
 * Centralized list of game systems used across the application
 */
export const GAME_SYSTEMS = [
  'Dungeons & Dragons 5th Edition',
  'Dungeons & Dragons 5.5 Edition (2024)',
  'Pathfinder 2nd Edition',
  'Pathfinder 1st Edition',
  'Call of Cthulhu 7th Edition',
  'Starfinder',
  'Shadowrun 5th Edition',
  'Cyberpunk RED',
  'Vampire: The Masquerade 5th Edition',
  'FATE Core',
  'Savage Worlds',
  'OSR (Old School Renaissance)',
  'Other',
] as const

export type GameSystem = typeof GAME_SYSTEMS[number]
