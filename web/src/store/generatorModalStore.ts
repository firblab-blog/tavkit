/**
 * Generator Modal Store
 *
 * Manages the state for the global generator modal that can be opened from anywhere
 * in the app (Library tab, CategoryModal, etc.) without requiring navigation.
 */
import { create } from 'zustand'

export type GeneratorType =
  | 'npc'
  | 'monster'
  | 'encounter'
  | 'dialogue'
  | 'location'
  | 'quest'
  | 'item'
  | 'rumor'
  | 'tavern'
  | 'merchant'
  | 'trap'
  | 'critter'
  | 'chase'

interface GeneratorModalState {
  isOpen: boolean
  generatorType: GeneratorType | null

  // Actions
  openGenerator: (type: GeneratorType) => void
  closeGenerator: () => void
}

export const useGeneratorModalStore = create<GeneratorModalState>((set) => ({
  isOpen: false,
  generatorType: null,

  openGenerator: (type) => set({ isOpen: true, generatorType: type }),
  closeGenerator: () => set({ isOpen: false, generatorType: null }),
}))
