import apiClient from './client'
import type {
  Chase,
  ChaseParticipant,
  ChaseChallenge,
  ChaseComplication,
  ChaseEvent,
  ChaseTemplate,
  CreateChaseRequest,
  GenerateChaseRequest,
  UpdateChaseRequest,
  CreateChaseParticipantRequest,
  UpdateChaseParticipantRequest,
  CreateChaseChallengeRequest,
  CreateChaseComplicationRequest,
  CreateChaseEventRequest,
  GenerateChallengeRequest,
  GenerateComplicationRequest,
} from '../types/chase'

// Chase CRUD operations

export const createChase = async (request: CreateChaseRequest): Promise<Chase> => {
  const response = await apiClient.post('/chases', request)
  return response.data
}

export const generateChase = async (request: GenerateChaseRequest): Promise<{ chase: any }> => {
  const response = await apiClient.post('/chases/generate', request)
  return response.data
}

export const getChase = async (id: string): Promise<Chase> => {
  const response = await apiClient.get(`/chases/${id}`)
  return response.data
}

export const listChases = async (campaignId?: string): Promise<Chase[]> => {
  const params = campaignId ? { campaign_id: campaignId } : {}
  const response = await apiClient.get('/chases', { params })
  return response.data
}

export const listChasesByCampaign = async (campaignId: string): Promise<Chase[]> => {
  const response = await apiClient.get(`/chases/campaign/${campaignId}`)
  return response.data
}

export const updateChase = async (id: string, request: UpdateChaseRequest): Promise<Chase> => {
  const response = await apiClient.put(`/chases/${id}`, request)
  return response.data
}

export const deleteChase = async (id: string): Promise<void> => {
  await apiClient.delete(`/chases/${id}`)
}

// Chase Tracker - Participants

export const createChaseParticipant = async (
  request: CreateChaseParticipantRequest
): Promise<ChaseParticipant> => {
  const response = await apiClient.post('/chase-participants', request)
  return response.data
}

export const getChaseParticipant = async (id: string): Promise<ChaseParticipant> => {
  const response = await apiClient.get(`/chase-participants/${id}`)
  return response.data
}

export const listChaseParticipants = async (chaseId: string): Promise<ChaseParticipant[]> => {
  const response = await apiClient.get(`/chase-participants/chase/${chaseId}`)
  return response.data
}

export const updateChaseParticipant = async (
  id: string,
  request: UpdateChaseParticipantRequest
): Promise<ChaseParticipant> => {
  const response = await apiClient.put(`/chase-participants/${id}`, request)
  return response.data
}

export const deleteChaseParticipant = async (id: string): Promise<void> => {
  await apiClient.delete(`/chase-participants/${id}`)
}

// Chase Tracker - Challenges

export const createChaseChallenge = async (
  request: CreateChaseChallengeRequest
): Promise<ChaseChallenge> => {
  const response = await apiClient.post('/chase-challenges', request)
  return response.data
}

export const getChaseChallenge = async (id: string): Promise<ChaseChallenge> => {
  const response = await apiClient.get(`/chase-challenges/${id}`)
  return response.data
}

export const listChaseChallenges = async (chaseId: string): Promise<ChaseChallenge[]> => {
  const response = await apiClient.get(`/chase-challenges/chase/${chaseId}`)
  return response.data
}

export const listChaseChallengesByRound = async (
  chaseId: string,
  round: number
): Promise<ChaseChallenge[]> => {
  const response = await apiClient.get(`/chase-challenges/chase/${chaseId}/round/${round}`)
  return response.data
}

export const updateChaseChallenge = async (id: string, used: boolean): Promise<ChaseChallenge> => {
  const response = await apiClient.put(`/chase-challenges/${id}`, { used })
  return response.data
}

export const deleteChaseChallenge = async (id: string): Promise<void> => {
  await apiClient.delete(`/chase-challenges/${id}`)
}

export const generateChaseChallenge = async (
  request: GenerateChallengeRequest
): Promise<ChaseChallenge> => {
  const response = await apiClient.post('/chase-challenges/generate', request)
  return response.data
}

// Chase Tracker - Complications

export const createChaseComplication = async (
  request: CreateChaseComplicationRequest
): Promise<ChaseComplication> => {
  const response = await apiClient.post('/chase-complications', request)
  return response.data
}

export const getChaseComplication = async (id: string): Promise<ChaseComplication> => {
  const response = await apiClient.get(`/chase-complications/${id}`)
  return response.data
}

export const listChaseComplications = async (chaseId: string): Promise<ChaseComplication[]> => {
  const response = await apiClient.get(`/chase-complications/chase/${chaseId}`)
  return response.data
}

export const listChaseComplicationsByRound = async (
  chaseId: string,
  round: number
): Promise<ChaseComplication[]> => {
  const response = await apiClient.get(`/chase-complications/chase/${chaseId}/round/${round}`)
  return response.data
}

export const updateChaseComplication = async (
  id: string,
  resolved: boolean
): Promise<ChaseComplication> => {
  const response = await apiClient.put(`/chase-complications/${id}`, { resolved })
  return response.data
}

export const deleteChaseComplication = async (id: string): Promise<void> => {
  await apiClient.delete(`/chase-complications/${id}`)
}

export const generateChaseComplication = async (
  request: GenerateComplicationRequest
): Promise<ChaseComplication> => {
  const response = await apiClient.post('/chase-complications/generate', request)
  return response.data
}

// Chase Tracker - Events

export const createChaseEvent = async (request: CreateChaseEventRequest): Promise<ChaseEvent> => {
  const response = await apiClient.post('/chase-events', request)
  return response.data
}

export const listChaseEvents = async (chaseId: string): Promise<ChaseEvent[]> => {
  const response = await apiClient.get(`/chase-events/chase/${chaseId}`)
  return response.data
}

export const listChaseEventsByRound = async (
  chaseId: string,
  round: number
): Promise<ChaseEvent[]> => {
  const response = await apiClient.get(`/chase-events/chase/${chaseId}/round/${round}`)
  return response.data
}

// Chase Tracker - Templates

export const createChaseTemplate = async (
  template: Partial<ChaseTemplate>
): Promise<ChaseTemplate> => {
  const response = await apiClient.post('/chase-templates', template)
  return response.data
}

export const getChaseTemplate = async (id: string): Promise<ChaseTemplate> => {
  const response = await apiClient.get(`/chase-templates/${id}`)
  return response.data
}

export const listChaseTemplates = async (chaseType?: string): Promise<ChaseTemplate[]> => {
  const params = chaseType ? { chase_type: chaseType } : {}
  const response = await apiClient.get('/chase-templates', { params })
  return response.data
}

export const updateChaseTemplate = async (
  id: string,
  template: Partial<ChaseTemplate>
): Promise<ChaseTemplate> => {
  const response = await apiClient.put(`/chase-templates/${id}`, template)
  return response.data
}

export const deleteChaseTemplate = async (id: string): Promise<void> => {
  await apiClient.delete(`/chase-templates/${id}`)
}

// Convenience functions

export const startChase = async (id: string): Promise<Chase> => {
  return updateChase(id, { status: 'active', current_round: 1 })
}

export const endChase = async (id: string, outcome: Chase['outcome']): Promise<Chase> => {
  return updateChase(id, { status: 'completed', outcome })
}

export const advanceRound = async (id: string, currentRound: number): Promise<Chase> => {
  return updateChase(id, { current_round: currentRound + 1 })
}

export const updateDistance = async (id: string, distance: number): Promise<Chase> => {
  return updateChase(id, { current_distance: distance })
}

export const resetParticipantDashStatus = async (
  participants: ChaseParticipant[]
): Promise<void> => {
  await Promise.all(
    participants.map((p) =>
      updateChaseParticipant(p.id, { has_dashed: false, movement_this_round: 0 })
    )
  )
}

export const applyStaminaDamage = async (
  participantId: string,
  damage: number
): Promise<ChaseParticipant> => {
  const participant = await getChaseParticipant(participantId)
  const newStamina = Math.max(0, participant.stamina - damage)
  return updateChaseParticipant(participantId, { stamina: newStamina })
}

export const addConditionToParticipant = async (
  participantId: string,
  condition: string
): Promise<ChaseParticipant> => {
  const participant = await getChaseParticipant(participantId)
  const currentConditions = participant.conditions || []
  if (!currentConditions.includes(condition)) {
    return updateChaseParticipant(participantId, {
      conditions: [...currentConditions, condition],
    })
  }
  return participant
}

export const removeConditionFromParticipant = async (
  participantId: string,
  condition: string
): Promise<ChaseParticipant> => {
  const participant = await getChaseParticipant(participantId)
  const currentConditions = participant.conditions || []
  return updateChaseParticipant(participantId, {
    conditions: currentConditions.filter((c) => c !== condition),
  })
}
