/**
 * Generator API Service
 *
 * Centralizes all AI generator API calls using the authenticated apiClient.
 * This eliminates the need for manual token handling in individual generator components.
 */

import { apiClient } from './client'
import { AxiosRequestConfig } from 'axios'

// Base interface for generation requests
interface BaseGenerationRequest {
  campaign_id?: string
  max_tokens?: number
  timeout?: number
}

// ============================================================================
// NPC Generator
// ============================================================================

export interface NPCGenerationRequest extends BaseGenerationRequest {
  race: string
  class: string
  level: number
  role: string
  personality: string
  special_requests?: string
}

export interface NPCGenerationResponse {
  npc: Record<string, unknown>
}

export async function generateNPC(
  request: NPCGenerationRequest,
  timeout?: number
): Promise<NPCGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<NPCGenerationResponse>('/npcs/generate', request, config)
  return response.data
}

export interface SaveNPCRequest {
  name: string
  race: string
  class: string
  personality: string
  backstory: string
  stats: Record<string, unknown>
  campaign_id?: string
  ai_generated?: boolean
}

export async function saveNPC(request: SaveNPCRequest): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/npcs', request)
  return response.data
}

// ============================================================================
// Monster Generator
// ============================================================================

export interface MonsterGenerationRequest extends BaseGenerationRequest {
  monster_type: string
  size: string
  challenge_rating: number
  environment: string
  special_requests?: string
}

export interface MonsterGenerationResponse {
  monster: Record<string, unknown>
}

export async function generateMonster(
  request: MonsterGenerationRequest,
  timeout?: number
): Promise<MonsterGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<MonsterGenerationResponse>(
    '/monsters/generate',
    request,
    config
  )
  return response.data
}

export async function saveMonster(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/monsters', request)
  return response.data
}

// ============================================================================
// Location Generator
// ============================================================================

export interface LocationGenerationRequest extends BaseGenerationRequest {
  type: string
  size: string
  danger_level: string
  theme: string
  special_requests?: string
}

export interface LocationGenerationResponse {
  location: Record<string, unknown>
}

export async function generateLocation(
  request: LocationGenerationRequest,
  timeout?: number
): Promise<LocationGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<LocationGenerationResponse>(
    '/locations/generate',
    request,
    config
  )
  return response.data
}

export async function saveLocation(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/locations', request)
  return response.data
}

// ============================================================================
// Quest Generator
// ============================================================================

export interface QuestGenerationRequest extends BaseGenerationRequest {
  type: string
  category?: string
  party_level: number
  party_size: number
  moral_ambiguity: boolean
  combat_intensity: string
  quest_length: string
  include_factions?: string[]
  include_locations?: string[]
  include_npcs?: string[]
  special_requests?: string
}

export interface QuestGenerationResponse {
  quest: Record<string, unknown>
}

export async function generateQuest(
  request: QuestGenerationRequest,
  timeout?: number
): Promise<QuestGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<QuestGenerationResponse>(
    '/quests/generate',
    request,
    config
  )
  return response.data
}

export async function saveQuest(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/quests', request)
  return response.data
}

// ============================================================================
// Item Generator
// ============================================================================

export interface ItemGenerationRequest extends BaseGenerationRequest {
  type: string
  rarity: string
  category?: string
  cursed?: string
  special_requests?: string
}

export interface ItemGenerationResponse {
  item: Record<string, unknown>
}

export async function generateItem(
  request: ItemGenerationRequest,
  timeout?: number
): Promise<ItemGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<ItemGenerationResponse>('/items/generate', request, config)
  return response.data
}

export async function saveItem(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/items', request)
  return response.data
}

// ============================================================================
// Encounter Builder
// ============================================================================

export interface EncounterGenerationRequest extends BaseGenerationRequest {
  difficulty: string
  environment: string
  party_level: number
  party_size: number
  special_requests?: string
}

export interface EncounterGenerationResponse {
  encounter: Record<string, unknown>
}

export async function generateEncounter(
  request: EncounterGenerationRequest,
  timeout?: number
): Promise<EncounterGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<EncounterGenerationResponse>(
    '/encounters/generate',
    request,
    config
  )
  return response.data
}

export async function saveEncounter(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/encounters', request)
  return response.data
}

// ============================================================================
// Merchant Generator
// ============================================================================

export interface MerchantGenerationRequest extends BaseGenerationRequest {
  shop_type: string
  quality: string
  size: string
  party_level?: string
  special_requests?: string
}

export interface MerchantGenerationResponse {
  merchant: Record<string, unknown>
}

export async function generateMerchant(
  request: MerchantGenerationRequest,
  timeout?: number
): Promise<MerchantGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<MerchantGenerationResponse>(
    '/merchants/generate',
    request,
    config
  )
  return response.data
}

export async function saveMerchant(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/merchants', request)
  return response.data
}

// ============================================================================
// Tavern Generator
// ============================================================================

export interface TavernGenerationRequest extends BaseGenerationRequest {
  type: string
  quality: string
  size: string
  special_requests?: string
}

export interface TavernGenerationResponse {
  tavern: Record<string, unknown>
}

export async function generateTavern(
  request: TavernGenerationRequest,
  timeout?: number
): Promise<TavernGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<TavernGenerationResponse>(
    '/taverns/generate',
    request,
    config
  )
  return response.data
}

export async function saveTavern(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/taverns', request)
  return response.data
}

// ============================================================================
// Rumor Generator
// ============================================================================

export interface RumorGenerationRequest extends BaseGenerationRequest {
  count?: number
  veracity?: string
  rumor_type?: string
  urgency?: string
  scope?: string
  special_requests?: string
}

export interface RumorGenerationResponse {
  rumor: Record<string, unknown>
}

export async function generateRumor(
  request: RumorGenerationRequest,
  timeout?: number
): Promise<RumorGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<RumorGenerationResponse>(
    '/rumors/generate',
    request,
    config
  )
  return response.data
}

export async function saveRumor(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/rumors', request)
  return response.data
}

// ============================================================================
// Trap Generator
// ============================================================================

export interface TrapGenerationRequest extends BaseGenerationRequest {
  trap_type: string
  difficulty: string
  party_level: string
  environment: string
  special_requests?: string
}

export interface TrapGenerationResponse {
  trap: Record<string, unknown>
}

export async function generateTrap(
  request: TrapGenerationRequest,
  timeout?: number
): Promise<TrapGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<TrapGenerationResponse>('/traps/generate', request, config)
  return response.data
}

export async function saveTrap(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/traps', request)
  return response.data
}

// ============================================================================
// Critter Generator
// ============================================================================

export interface CritterGenerationRequest extends BaseGenerationRequest {
  critter_type: string
  size: string
  temperament: string
  habitat: string
  special_requests?: string
}

export interface CritterGenerationResponse {
  critter: Record<string, unknown>
}

export async function generateCritter(
  request: CritterGenerationRequest,
  timeout?: number
): Promise<CritterGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<CritterGenerationResponse>(
    '/critters/generate',
    request,
    config
  )
  return response.data
}

export async function saveCritter(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/critters', request)
  return response.data
}

// ============================================================================
// Chase Generator
// ============================================================================

export interface ChaseGenerationRequest extends BaseGenerationRequest {
  chase_type: string
  terrain: string
  difficulty: string
  party_level: string
  special_requests?: string
}

export interface ChaseGenerationResponse {
  chase: Record<string, unknown>
}

export async function generateChaseScenario(
  request: ChaseGenerationRequest,
  timeout?: number
): Promise<ChaseGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<ChaseGenerationResponse>(
    '/chases/generate',
    request,
    config
  )
  return response.data
}

export async function saveChase(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/chases', request)
  return response.data
}

// ============================================================================
// Dialogue Builder
// ============================================================================

export interface DialogueGenerationRequest extends BaseGenerationRequest {
  character_name?: string
  dialogue_type: string
  npc_personality: string
  mood: string
  complexity: string
  scene_setting?: string
  special_requests?: string
}

export interface DialogueGenerationResponse {
  dialogue: Record<string, unknown>
}

export async function generateDialogue(
  request: DialogueGenerationRequest,
  timeout?: number
): Promise<DialogueGenerationResponse> {
  const config: AxiosRequestConfig = timeout ? { timeout: timeout * 1000 } : {}
  const response = await apiClient.post<DialogueGenerationResponse>(
    '/dialogues/generate',
    request,
    config
  )
  return response.data
}

export async function saveDialogue(request: Record<string, unknown>): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/dialogues', request)
  return response.data
}

// ============================================================================
// Saved Content API
// ============================================================================

export interface SavedContent {
  id: string
  type: string
  name: string
  content: Record<string, unknown>
  campaign_id?: string
  created_at: string
  updated_at: string
}

export async function getSavedContent(type?: string): Promise<SavedContent[]> {
  const params = type ? { type } : {}
  const response = await apiClient.get<SavedContent[]>('/content', { params })
  return response.data
}

export async function deleteSavedContent(id: string): Promise<void> {
  await apiClient.delete(`/content/${id}`)
}

// ============================================================================
// Helper for extracting error messages from Axios errors
// ============================================================================

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for Axios error response
    const axiosError = error as { response?: { data?: { error?: string } } }
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error
    }
    return error.message
  }
  return 'An unexpected error occurred'
}
