import { useState, useEffect, useCallback } from 'react'
import Icon from '../common/Icon'
import ChaseSetup from './ChaseSetup'
import ActiveChaseTracker from './ActiveChaseTracker'
import { useCampaignStore } from '../../store/campaignStore'
import { useCharacterStore } from '../../store/characterStore'
import { apiClient } from '@/api/client'
import { logger } from '@/utils/logger'
import type {
  Chase,
  ChaseParticipant,
  ChaseChallenge,
  ChaseComplication,
  ChaseEvent,
} from '../../types/chase'

export default function ChaseManager() {
  const [chases, setChases] = useState<Chase[]>([])
  const [selectedChase, setSelectedChase] = useState<Chase | null>(null)
  const [participants, setParticipants] = useState<ChaseParticipant[]>([])
  const [challenges, setChallenges] = useState<ChaseChallenge[]>([])
  const [complications, setComplications] = useState<ChaseComplication[]>([])
  const [events, setEvents] = useState<ChaseEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [campaignFilter, setCampaignFilter] = useState<string>('all')

  const { campaigns } = useCampaignStore()
  const { characters, fetchCharacters } = useCharacterStore()

  useEffect(() => {
    fetchChases()
    fetchCharacters()
  }, [campaignFilter, fetchCharacters])

  const fetchChases = async () => {
    setLoading(true)
    setError('')

    try {
      const endpoint =
        campaignFilter === 'all' ? '/chases' : `/chases?campaign_id=${campaignFilter}`
      const response = await apiClient.get(endpoint)
      setChases(Array.isArray(response.data) ? response.data : [])
    } catch (err: any) {
      if (err.response?.status === 404) {
        setChases([])
        return
      }
      setError(err.response?.data?.error || err.message || 'Failed to load chases')
    } finally {
      setLoading(false)
    }
  }

  // Load chase sub-resources when a chase is selected
  const loadChaseData = useCallback(async (chaseId: string) => {
    try {
      // Fetch participants, challenges, complications, and events in parallel
      const [participantsRes, challengesRes, complicationsRes, eventsRes] = await Promise.all([
        apiClient.get(`/chases/${chaseId}/participants`).catch(() => ({ data: [] })),
        apiClient.get(`/chases/${chaseId}/challenges`).catch(() => ({ data: [] })),
        apiClient.get(`/chases/${chaseId}/complications`).catch(() => ({ data: [] })),
        apiClient.get(`/chases/${chaseId}/events`).catch(() => ({ data: [] })),
      ])

      setParticipants(Array.isArray(participantsRes.data) ? participantsRes.data : [])
      setChallenges(Array.isArray(challengesRes.data) ? challengesRes.data : [])
      setComplications(Array.isArray(complicationsRes.data) ? complicationsRes.data : [])
      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : [])
    } catch (err) {
      logger.error('Failed to load chase data:', err)
    }
  }, [])

  const handleSelectChase = async (chase: Chase) => {
    setSelectedChase(chase)
    await loadChaseData(chase.id)
  }

  const handleStartChase = async (chaseId: string) => {
    setShowCreateForm(false)
    await fetchChases()
    // Find and select the newly created chase
    try {
      const response = await apiClient.get(`/chases/${chaseId}`)
      handleSelectChase(response.data)
    } catch (err) {
      logger.error('Failed to load newly created chase:', err)
    }
  }

  const handleDeleteChase = async (chaseId: string) => {
    if (!confirm('Are you sure you want to delete this chase?')) return

    try {
      await apiClient.delete(`/chases/${chaseId}`)
      fetchChases()
      if (selectedChase?.id === chaseId) {
        setSelectedChase(null)
        setParticipants([])
        setChallenges([])
        setComplications([])
        setEvents([])
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to delete chase')
    }
  }

  // Update chase status
  const handleUpdateChase = async (updates: Partial<Chase>) => {
    if (!selectedChase) return

    try {
      const response = await apiClient.put(`/chases/${selectedChase.id}`, updates)
      setSelectedChase(response.data)
      fetchChases()
    } catch (err) {
      logger.error('Failed to update chase:', err)
    }
  }

  // Add event to chase log
  const handleAddEvent = async (event: Omit<ChaseEvent, 'id' | 'created_at'>) => {
    if (!selectedChase) return

    try {
      // API route is POST /chases/events (chase_id in body)
      const response = await apiClient.post('/chases/events', {
        chase_id: selectedChase.id,
        round: event.round,
        event_type: event.action,
        participant_id: event.participant_name,
        description: event.effect,
      })
      setEvents((prev) => [...prev, response.data])
    } catch (err) {
      logger.error('Failed to add event:', err)
    }
  }

  // Add participant to chase
  const handleAddParticipant = async (participant: Omit<ChaseParticipant, 'id' | 'created_at'>) => {
    if (!selectedChase) return

    try {
      // API route is POST /chases/participants (chase_id in body)
      const response = await apiClient.post('/chases/participants', participant)
      setParticipants((prev) => [...prev, response.data])
    } catch (err) {
      logger.error('Failed to add participant:', err)
    }
  }

  // Update participant
  const handleUpdateParticipant = async (
    participantId: string,
    updates: Partial<ChaseParticipant>
  ) => {
    try {
      // API route is PUT /chases/participants/:participant_id
      const response = await apiClient.put(`/chases/participants/${participantId}`, updates)
      setParticipants((prev) => prev.map((p) => (p.id === participantId ? response.data : p)))
    } catch (err) {
      logger.error('Failed to update participant:', err)
    }
  }

  // Remove participant from chase
  const handleRemoveParticipant = async (participantId: string) => {
    try {
      await apiClient.delete(`/chases/participants/${participantId}`)
      setParticipants((prev) => prev.filter((p) => p.id !== participantId))
    } catch (err) {
      logger.error('Failed to remove participant:', err)
    }
  }

  // Clear all events for a chase (used when re-running)
  const handleClearEvents = async () => {
    if (!selectedChase) return

    try {
      await apiClient.delete(`/chases/${selectedChase.id}/events`)
      setEvents([])
    } catch (err) {
      logger.error('Failed to clear events:', err)
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background-panel px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <Icon name="Swords" className="w-8 h-8 text-primary" />
              Chase Manager
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Run and track your saved chase scenes. Generate new chases in the Chase Generator.
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
          >
            <Icon name="Plus" className="w-5 h-5" />
            Manual Setup
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Chase List */}
        <div className="w-64 flex-shrink-0 border-r border-border bg-background-panel overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border space-y-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Your Chases
            </h2>

            {/* Campaign Filter */}
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="all">All Chases</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center">
                <Icon name="Loader2" className="w-6 h-6 text-text-muted animate-spin mx-auto" />
              </div>
            )}

            {error && <div className="p-4 text-sm text-red-400">{error}</div>}

            {!loading && !error && chases.length === 0 && (
              <div className="p-4 text-center text-text-muted text-sm">
                No chases yet. Create your first chase to get started!
              </div>
            )}

            <div className="divide-y divide-border">
              {chases.map((chase) => (
                <div
                  key={chase.id}
                  onClick={() => handleSelectChase(chase)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedChase?.id === chase.id
                      ? 'bg-primary/20 border-l-4 border-l-primary'
                      : 'hover:bg-background/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text truncate">{chase.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            chase.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : chase.status === 'completed'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {chase.status}
                        </span>
                        <span className="text-xs text-text-muted">{chase.chase_type}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteChase(chase.id)
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                    >
                      <Icon name="Trash2" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {showCreateForm ? (
            <ChaseSetup onStartChase={handleStartChase} onCancel={() => setShowCreateForm(false)} />
          ) : selectedChase ? (
            <ActiveChaseTracker
              chase={selectedChase}
              participants={participants}
              challenges={challenges}
              complications={complications}
              events={events}
              characters={characters}
              onUpdateChase={handleUpdateChase}
              onAddEvent={handleAddEvent}
              onAddParticipant={handleAddParticipant}
              onUpdateParticipant={handleUpdateParticipant}
              onRemoveParticipant={handleRemoveParticipant}
              onClearEvents={handleClearEvents}
              onEnd={() => {
                setSelectedChase(null)
                setParticipants([])
                setChallenges([])
                setComplications([])
                setEvents([])
                fetchChases()
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Icon name="Swords" className="w-20 h-20 text-text-muted mx-auto mb-4 opacity-30" />
                <p className="text-text-muted text-lg">Select a chase to view details</p>
                <p className="text-text-muted text-sm mt-2">or create a new one to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
