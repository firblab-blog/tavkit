import { useEffect, useState } from 'react'
import Icon from '../../common/Icon'
import {
  usePlayerEncountersStore,
  NPCEncounter,
  RelationshipType,
} from '../../../store/playerEncountersStore'
import { useCampaignStore } from '../../../store/campaignStore'
import NPCDetailModal from './NPCDetailModal'

const relationshipColors: Record<RelationshipType, { bg: string; text: string; border: string }> = {
  friendly: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  neutral: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' },
  hostile: { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/30' },
  unknown: { bg: 'bg-gray-500/10', text: 'text-gray-300', border: 'border-gray-500/30' },
}

export default function NPCsMet() {
  const { npcs, loadingNPCs, error, fetchNPCs, createNPC, updateNPC, deleteNPC } =
    usePlayerEncountersStore()
  const getActiveCampaign = useCampaignStore((state) => state.getActiveCampaign)
  const activeCampaign = getActiveCampaign()

  const [showForm, setShowForm] = useState(false)
  const [editingNPC, setEditingNPC] = useState<NPCEncounter | null>(null)
  const [viewingNPC, setViewingNPC] = useState<NPCEncounter | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRelationship, setFilterRelationship] = useState<RelationshipType | ''>('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    relationship: 'neutral' as RelationshipType,
    first_met_session: '',
    first_met_location: '',
    notes: '',
  })

  useEffect(() => {
    fetchNPCs(activeCampaign?.id)
  }, [fetchNPCs, activeCampaign?.id])

  const filteredNPCs = npcs.filter((npc) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !npc.name.toLowerCase().includes(query) &&
        !npc.description?.toLowerCase().includes(query)
      ) {
        return false
      }
    }
    if (filterRelationship && npc.relationship !== filterRelationship) {
      return false
    }
    return true
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      relationship: 'neutral',
      first_met_session: '',
      first_met_location: '',
      notes: '',
    })
    setEditingNPC(null)
    setShowForm(false)
  }

  const handleView = (npc: NPCEncounter) => {
    setViewingNPC(npc)
  }

  const handleEdit = (npc: NPCEncounter) => {
    setViewingNPC(null)
    setEditingNPC(npc)
    setFormData({
      name: npc.name,
      description: npc.description || '',
      relationship: npc.relationship,
      first_met_session: npc.first_met_session?.toString() || '',
      first_met_location: npc.first_met_location || '',
      notes: npc.notes || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    const data = {
      campaign_id: activeCampaign?.id,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      relationship: formData.relationship,
      first_met_session: formData.first_met_session
        ? parseInt(formData.first_met_session)
        : undefined,
      first_met_location: formData.first_met_location.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    }

    if (editingNPC) {
      await updateNPC(editingNPC.id, data)
    } else {
      await createNPC(data)
    }
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this NPC?')) {
      await deleteNPC(id)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            />
            <input
              type="text"
              placeholder="Search NPCs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <select
            value={filterRelationship}
            onChange={(e) => setFilterRelationship(e.target.value as RelationshipType | '')}
            className="px-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All</option>
            <option value="friendly">Friendly</option>
            <option value="neutral">Neutral</option>
            <option value="hostile">Hostile</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-sm"
        >
          <Icon name="Plus" className="w-4 h-4" />
          Add NPC
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loadingNPCs && npcs.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loadingNPCs && filteredNPCs.length === 0 && (
        <div className="text-center py-8 bg-background-panel border border-border rounded-xl">
          <Icon name="User" className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="text-text font-medium mb-1">
            {searchQuery || filterRelationship ? 'No matching NPCs' : 'No NPCs logged yet'}
          </h3>
          <p className="text-text-muted text-sm">
            {searchQuery || filterRelationship
              ? 'Try adjusting your search.'
              : 'Start tracking NPCs you meet in your adventures!'}
          </p>
        </div>
      )}

      {/* NPC Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNPCs.map((npc) => {
          const colors = relationshipColors[npc.relationship]
          return (
            <div
              key={npc.id}
              onClick={() => handleView(npc)}
              className={`bg-background-panel border ${colors.border} rounded-xl p-4 hover:border-opacity-60 transition-colors cursor-pointer`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon name="User" className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-text font-medium truncate">{npc.name}</h4>
                    <span className={`text-xs ${colors.text} capitalize`}>{npc.relationship}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {npc.is_gm_revealed && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                      GM
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(npc)
                    }}
                    className="p-1 hover:bg-background rounded text-text-muted hover:text-text"
                  >
                    <Icon name="Pencil" className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(npc.id)
                    }}
                    className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                  >
                    <Icon name="Trash2" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {npc.description && (
                <p className="text-text-muted text-sm mb-2 line-clamp-2">{npc.description}</p>
              )}

              <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                {npc.first_met_session && (
                  <span className="flex items-center gap-1">
                    <Icon name="Calendar" className="w-3 h-3" />
                    Session {npc.first_met_session}
                  </span>
                )}
                {npc.first_met_location && (
                  <span className="flex items-center gap-1">
                    <Icon name="MapPin" className="w-3 h-3" />
                    {npc.first_met_location}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && resetForm()}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-background-panel border border-border rounded-xl w-full max-w-md"
          >
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text">
                {editingNPC ? 'Edit NPC' : 'Add NPC'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 hover:bg-background rounded text-text-muted hover:text-text"
              >
                <Icon name="X" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="NPC name"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Relationship
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) =>
                    setFormData({ ...formData, relationship: e.target.value as RelationshipType })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
                >
                  <option value="friendly">Friendly</option>
                  <option value="neutral">Neutral</option>
                  <option value="hostile">Hostile</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this NPC"
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    First Met (Session)
                  </label>
                  <input
                    type="number"
                    value={formData.first_met_session}
                    onChange={(e) =>
                      setFormData({ ...formData, first_met_session: e.target.value })
                    }
                    placeholder="e.g., 5"
                    min="1"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    First Met (Location)
                  </label>
                  <input
                    type="text"
                    value={formData.first_met_location}
                    onChange={(e) =>
                      setFormData({ ...formData, first_met_location: e.target.value })
                    }
                    placeholder="e.g., Tavern"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Personal notes about this NPC"
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary resize-y"
                />
              </div>
            </div>

            <div className="border-t border-border px-5 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-text-muted hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loadingNPCs || !formData.name.trim()}
                className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {editingNPC ? 'Save' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Modal */}
      {viewingNPC && (
        <NPCDetailModal
          npc={viewingNPC}
          onClose={() => setViewingNPC(null)}
          onEdit={() => handleEdit(viewingNPC)}
          onDelete={() => {
            handleDelete(viewingNPC.id)
            setViewingNPC(null)
          }}
        />
      )}
    </div>
  )
}
