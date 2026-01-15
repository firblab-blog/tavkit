import { useEffect, useState } from 'react'
import Icon from '../../common/Icon'
import {
  usePlayerQuestStore,
  QuestTracking,
  QuestStatus,
  QuestType,
  QuestObjective,
} from '../../../store/playerQuestStore'
import { useCampaignStore } from '../../../store/campaignStore'
import QuestDetailModal from './QuestDetailModal'

const statusColors: Record<QuestStatus, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/30' },
  abandoned: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
}

const typeLabels: Record<QuestType, string> = {
  personal: 'Personal Goal',
  main: 'Main Quest',
  side: 'Side Quest',
  gm_shared: 'GM Shared',
}

export default function QuestTracker() {
  const {
    quests,
    loading,
    error,
    fetchQuests,
    createQuest,
    updateQuest,
    deleteQuest,
    toggleObjective,
  } = usePlayerQuestStore()
  const getActiveCampaign = useCampaignStore((state) => state.getActiveCampaign)
  const activeCampaign = getActiveCampaign()

  const [showForm, setShowForm] = useState(false)
  const [editingQuest, setEditingQuest] = useState<QuestTracking | null>(null)
  const [viewingQuest, setViewingQuest] = useState<QuestTracking | null>(null)
  const [filterStatus, setFilterStatus] = useState<QuestStatus | ''>('active')
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set())

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quest_type: 'personal' as QuestType,
    priority: '0',
    objectives: [] as QuestObjective[],
    notes: '',
  })
  const [newObjective, setNewObjective] = useState('')

  useEffect(() => {
    fetchQuests(activeCampaign?.id, filterStatus || undefined)
  }, [fetchQuests, activeCampaign?.id, filterStatus])

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      quest_type: 'personal',
      priority: '0',
      objectives: [],
      notes: '',
    })
    setNewObjective('')
    setEditingQuest(null)
    setShowForm(false)
  }

  const handleView = (quest: QuestTracking) => {
    setViewingQuest(quest)
  }

  const handleEdit = (quest: QuestTracking) => {
    setViewingQuest(null) // Close view modal if open
    setEditingQuest(quest)
    setFormData({
      title: quest.title,
      description: quest.description || '',
      quest_type: quest.quest_type,
      priority: quest.priority.toString(),
      objectives: quest.objectives || [],
      notes: quest.notes || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    const data = {
      campaign_id: activeCampaign?.id,
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      quest_type: formData.quest_type,
      priority: parseInt(formData.priority) || 0,
      objectives: formData.objectives.length > 0 ? formData.objectives : undefined,
      notes: formData.notes.trim() || undefined,
    }

    if (editingQuest) {
      await updateQuest(editingQuest.id, data)
    } else {
      await createQuest(data)
    }
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this quest?')) {
      await deleteQuest(id)
    }
  }

  const handleStatusChange = async (quest: QuestTracking, newStatus: QuestStatus) => {
    await updateQuest(quest.id, { status: newStatus })
  }

  const addObjective = () => {
    if (!newObjective.trim()) return
    setFormData({
      ...formData,
      objectives: [...formData.objectives, { text: newObjective.trim(), completed: false }],
    })
    setNewObjective('')
  }

  const removeObjective = (index: number) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((_, i) => i !== index),
    })
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedQuests)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedQuests(newExpanded)
  }

  // Group quests by status
  const activeQuests = quests.filter((q) => q.status === 'active')
  const completedQuests = quests.filter((q) => q.status === 'completed')
  const otherQuests = quests.filter((q) => q.status === 'failed' || q.status === 'abandoned')

  const renderQuestList = (questList: QuestTracking[], title: string) => {
    if (questList.length === 0) return null

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-muted">{title}</h3>
        {questList.map((quest) => {
          const colors = statusColors[quest.status]
          const isExpanded = expandedQuests.has(quest.id)
          const completedObjectives = quest.objectives?.filter((o) => o.completed).length || 0
          const totalObjectives = quest.objectives?.length || 0

          return (
            <div
              key={quest.id}
              className={`bg-background-panel border ${colors.border} rounded-xl overflow-hidden cursor-pointer hover:border-${colors.text.replace('text-', '')} transition-colors`}
              onClick={() => handleView(quest)}
            >
              {/* Header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpanded(quest.id)
                      }}
                      className="p-1 hover:bg-background rounded text-text-muted hover:text-text mt-0.5"
                    >
                      <Icon
                        name={isExpanded ? 'ChevronDown' : 'ChevronRight'}
                        className="w-4 h-4"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-text font-medium">{quest.title}</h4>
                        <span
                          className={`px-2 py-0.5 ${colors.bg} ${colors.text} text-xs rounded capitalize`}
                        >
                          {quest.status}
                        </span>
                        <span className="px-2 py-0.5 bg-background text-text-muted text-xs rounded">
                          {typeLabels[quest.quest_type]}
                        </span>
                      </div>
                      {totalObjectives > 0 && (
                        <div className="flex items-center gap-2 text-sm text-text-muted">
                          <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden max-w-32">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{
                                width: `${(completedObjectives / totalObjectives) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs">
                            {completedObjectives}/{totalObjectives}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <select
                      value={quest.status}
                      onChange={(e) => handleStatusChange(quest, e.target.value as QuestStatus)}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 bg-background border border-border rounded text-xs text-text focus:outline-none focus:border-primary"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="abandoned">Abandoned</option>
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(quest)
                      }}
                      className="p-1 hover:bg-background rounded text-text-muted hover:text-text"
                    >
                      <Icon name="Pencil" className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(quest.id)
                      }}
                      className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                    >
                      <Icon name="Trash2" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border/50">
                  {quest.description && (
                    <p className="text-text-muted text-sm pt-3">{quest.description}</p>
                  )}

                  {/* Objectives */}
                  {quest.objectives && quest.objectives.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-medium text-text-muted uppercase">Objectives</h5>
                      {quest.objectives.map((obj, i) => (
                        <label key={i} className="flex items-start gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={obj.completed}
                            onChange={() => toggleObjective(quest.id, i)}
                            className="mt-1 rounded border-border text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <span
                            className={`text-sm ${
                              obj.completed ? 'text-text-muted line-through' : 'text-text'
                            }`}
                          >
                            {obj.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {quest.notes && (
                    <p className="text-text-muted/70 text-xs italic pt-2">{quest.notes}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <Icon name="Target" className="w-5 h-5 text-amber-400" />
            Quest Tracker
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Track your quests, personal goals, and objectives.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as QuestStatus | '')}
            className="px-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All Quests</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="abandoned">Abandoned</option>
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
          >
            <Icon name="Plus" className="w-4 h-4" />
            New Quest
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && quests.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && quests.length === 0 && (
        <div className="text-center py-12 bg-background-panel border border-border rounded-xl">
          <Icon name="Target" className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">No quests yet</h3>
          <p className="text-text-muted mb-4">
            Start tracking your adventures by adding quests and personal goals.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
          >
            Add First Quest
          </button>
        </div>
      )}

      {/* Quest Lists */}
      <div className="space-y-6">
        {renderQuestList(activeQuests, 'Active Quests')}
        {renderQuestList(completedQuests, 'Completed')}
        {renderQuestList(otherQuests, 'Other')}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && resetForm()}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-background-panel border border-border rounded-xl w-full max-w-lg my-8"
          >
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text">
                {editingQuest ? 'Edit Quest' : 'New Quest'}
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
                <label className="block text-sm font-medium text-text-muted mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Quest title"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Type</label>
                  <select
                    value={formData.quest_type}
                    onChange={(e) =>
                      setFormData({ ...formData, quest_type: e.target.value as QuestType })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
                  >
                    <option value="personal">Personal Goal</option>
                    <option value="main">Main Quest</option>
                    <option value="side">Side Quest</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
                  >
                    <option value="0">Normal</option>
                    <option value="1">High</option>
                    <option value="2">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Quest description"
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary resize-y"
                />
              </div>

              {/* Objectives */}
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Objectives</label>
                <div className="space-y-2">
                  {formData.objectives.map((obj, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text text-sm">
                        {obj.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeObjective(i)}
                        className="p-2 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                      >
                        <Icon name="X" className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newObjective}
                      onChange={(e) => setNewObjective(e.target.value)}
                      placeholder="Add objective..."
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addObjective()
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addObjective}
                      className="px-3 py-2 bg-background hover:bg-background/80 border border-border rounded-lg text-text transition-colors"
                    >
                      <Icon name="Plus" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Personal notes"
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
                disabled={loading || !formData.title.trim()}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {editingQuest ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quest Detail Modal */}
      {viewingQuest && (
        <QuestDetailModal
          quest={viewingQuest}
          onClose={() => setViewingQuest(null)}
          onEdit={() => handleEdit(viewingQuest)}
          onDelete={() => {
            handleDelete(viewingQuest.id)
            setViewingQuest(null)
          }}
          onToggleObjective={(index) => toggleObjective(viewingQuest.id, index)}
          onStatusChange={(newStatus) => {
            handleStatusChange(viewingQuest, newStatus)
          }}
        />
      )}
    </div>
  )
}
