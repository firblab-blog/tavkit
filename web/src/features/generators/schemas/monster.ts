// Field schema for manual Monster entry

export interface ManualMonsterStats {
  ac: number | null
  hp: number | null
  speed: string
  str: number | null
  dex: number | null
  con: number | null
  int: number | null
  wis: number | null
  cha: number | null
}

export interface ManualAction {
  name: string
  description: string
  [key: string]: unknown
}

export interface ManualMonsterData {
  name: string
  creature_type: string
  size: string
  alignment: string
  challenge_rating: string
  description: string
  stats: ManualMonsterStats
  damage_resistances: string[]
  damage_immunities: string[]
  condition_immunities: string[]
  senses: string[]
  languages: string[]
  traits: ManualAction[]
  actions: ManualAction[]
  reactions: ManualAction[]
  legendary_actions: ManualAction[]
  lair_actions: string[]
  tactics: string
  lore: string
}

export const defaultMonsterStats: ManualMonsterStats = {
  ac: null,
  hp: null,
  speed: '',
  str: null,
  dex: null,
  con: null,
  int: null,
  wis: null,
  cha: null,
}

export const defaultMonsterData: ManualMonsterData = {
  name: '',
  creature_type: 'beast',
  size: 'medium',
  alignment: 'unaligned',
  challenge_rating: '1',
  description: '',
  stats: { ...defaultMonsterStats },
  damage_resistances: [],
  damage_immunities: [],
  condition_immunities: [],
  senses: [],
  languages: [],
  traits: [],
  actions: [],
  reactions: [],
  legendary_actions: [],
  lair_actions: [],
  tactics: '',
  lore: '',
}

export const creatureTypeOptions = [
  { value: 'aberration', label: 'Aberration' },
  { value: 'beast', label: 'Beast' },
  { value: 'celestial', label: 'Celestial' },
  { value: 'construct', label: 'Construct' },
  { value: 'dragon', label: 'Dragon' },
  { value: 'elemental', label: 'Elemental' },
  { value: 'fey', label: 'Fey' },
  { value: 'fiend', label: 'Fiend' },
  { value: 'giant', label: 'Giant' },
  { value: 'humanoid', label: 'Humanoid' },
  { value: 'monstrosity', label: 'Monstrosity' },
  { value: 'ooze', label: 'Ooze' },
  { value: 'plant', label: 'Plant' },
  { value: 'undead', label: 'Undead' },
]

export const sizeOptions = [
  { value: 'tiny', label: 'Tiny' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'huge', label: 'Huge' },
  { value: 'gargantuan', label: 'Gargantuan' },
]

export const alignmentOptions = [
  { value: 'lawful good', label: 'Lawful Good' },
  { value: 'neutral good', label: 'Neutral Good' },
  { value: 'chaotic good', label: 'Chaotic Good' },
  { value: 'lawful neutral', label: 'Lawful Neutral' },
  { value: 'neutral', label: 'True Neutral' },
  { value: 'chaotic neutral', label: 'Chaotic Neutral' },
  { value: 'lawful evil', label: 'Lawful Evil' },
  { value: 'neutral evil', label: 'Neutral Evil' },
  { value: 'chaotic evil', label: 'Chaotic Evil' },
  { value: 'unaligned', label: 'Unaligned' },
]

export const challengeRatingOptions = [
  { value: '0', label: 'CR 0' },
  { value: '1/8', label: 'CR 1/8' },
  { value: '1/4', label: 'CR 1/4' },
  { value: '1/2', label: 'CR 1/2' },
  { value: '1', label: 'CR 1' },
  { value: '2', label: 'CR 2' },
  { value: '3', label: 'CR 3' },
  { value: '4', label: 'CR 4' },
  { value: '5', label: 'CR 5' },
  { value: '6', label: 'CR 6' },
  { value: '7', label: 'CR 7' },
  { value: '8', label: 'CR 8' },
  { value: '9', label: 'CR 9' },
  { value: '10', label: 'CR 10' },
  { value: '11', label: 'CR 11' },
  { value: '12', label: 'CR 12' },
  { value: '13', label: 'CR 13' },
  { value: '14', label: 'CR 14' },
  { value: '15', label: 'CR 15' },
  { value: '16', label: 'CR 16' },
  { value: '17', label: 'CR 17' },
  { value: '18', label: 'CR 18' },
  { value: '19', label: 'CR 19' },
  { value: '20', label: 'CR 20' },
  { value: '21+', label: 'CR 21+' },
]

export const environmentOptions = [
  { value: 'dungeon', label: 'Dungeon/Underground' },
  { value: 'forest', label: 'Forest' },
  { value: 'mountain', label: 'Mountain' },
  { value: 'swamp', label: 'Swamp' },
  { value: 'desert', label: 'Desert' },
  { value: 'arctic', label: 'Arctic/Tundra' },
  { value: 'aquatic', label: 'Aquatic/Underwater' },
  { value: 'urban', label: 'Urban' },
  { value: 'planar', label: 'Planar/Otherworldly' },
  { value: 'volcanic', label: 'Volcanic' },
]
