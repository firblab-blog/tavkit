import { useState } from 'react'
import Icon from '../common/Icon'
import { PatronInteraction } from './TavernSession'

interface PatronListProps {
  patrons: PatronInteraction[]
  onAddPatron: (data: { patron_name: string; relationship: string }) => void
  onUpdatePatron: (patronId: string, updates: Partial<PatronInteraction>) => void
  disabled?: boolean
}

const RELATIONSHIPS = [
  { value: 'hostile', label: 'Hostile', color: 'text-red-400 bg-red-500/20' },
  { value: 'unfriendly', label: 'Unfriendly', color: 'text-orange-400 bg-orange-500/20' },
  { value: 'neutral', label: 'Neutral', color: 'text-gray-400 bg-gray-500/20' },
  { value: 'friendly', label: 'Friendly', color: 'text-emerald-400 bg-emerald-500/20' },
  { value: 'helpful', label: 'Helpful', color: 'text-blue-400 bg-blue-500/20' },
]

export default function PatronList({
  patrons,
  onAddPatron,
  onUpdatePatron,
  disabled = false,
}: PatronListProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPatronName, setNewPatronName] = useState('')
  const [newPatronRelationship, setNewPatronRelationship] = useState('neutral')
  const [expandedPatron, setExpandedPatron] = useState<string | null>(null)

  const handleAddPatron = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPatronName.trim()) return

    onAddPatron({
      patron_name: newPatronName.trim(),
      relationship: newPatronRelationship,
    })

    setNewPatronName('')
    setNewPatronRelationship('neutral')
    setShowAddForm(false)
  }

  const getRelationshipBadge = (relationship: string) => {
    const rel = RELATIONSHIPS.find((r) => r.value === relationship)
    return rel || RELATIONSHIPS[2] // Default to neutral
  }

  return (
    <div className="bg-background-panel border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Icon name="Users" className="w-4 h-4 text-primary" />
          Patrons Present
        </h3>
        {!disabled && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1.5 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-primary"
          >
            <Icon name={showAddForm ? 'X' : 'Plus'} className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Add Patron Form */}
      {showAddForm && !disabled && (
        <form onSubmit={handleAddPatron} className="p-4 border-b border-border bg-background/50">
          <div className="space-y-3">
            <input
              type="text"
              value={newPatronName}
              onChange={(e) => setNewPatronName(e.target.value)}
              placeholder="Patron name..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              autoFocus
            />
            <div className="flex flex-wrap gap-1">
              {RELATIONSHIPS.map((rel) => (
                <button
                  key={rel.value}
                  type="button"
                  onClick={() => setNewPatronRelationship(rel.value)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    newPatronRelationship === rel.value
                      ? rel.color
                      : 'bg-background text-text-muted border border-border hover:border-primary/40'
                  }`}
                >
                  {rel.label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!newPatronName.trim()}
              className="w-full px-3 py-2 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Add Patron
            </button>
          </div>
        </form>
      )}

      {/* Patron List */}
      {patrons.length === 0 ? (
        <div className="p-6 text-center text-text-muted">
          <Icon name="Users" className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No patrons added yet</p>
          <p className="text-sm mt-1">Add patrons to track interactions</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {patrons.map((patron) => {
            const relBadge = getRelationshipBadge(patron.relationship)
            const isExpanded = expandedPatron === patron.id

            return (
              <div key={patron.id} className="p-4">
                {/* Patron Header */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      !disabled && onUpdatePatron(patron.id, { talked_to: !patron.talked_to })
                    }
                    disabled={disabled}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      patron.talked_to
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-border hover:border-emerald-500/50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {patron.talked_to && <Icon name="Check" className="w-3 h-3 text-white" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">{patron.patron_name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${relBadge.color}`}
                      >
                        {relBadge.label}
                      </span>
                    </div>
                    {patron.conversation_summary && (
                      <p className="text-sm text-text-muted mt-0.5 line-clamp-1">
                        {patron.conversation_summary}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedPatron(isExpanded ? null : patron.id)}
                    className="p-1 hover:bg-background rounded transition-colors text-text-muted"
                  >
                    <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} className="w-4 h-4" />
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pl-9 space-y-3">
                    {/* Relationship Selector */}
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Relationship</label>
                      <div className="flex flex-wrap gap-1">
                        {RELATIONSHIPS.map((rel) => (
                          <button
                            key={rel.value}
                            onClick={() =>
                              !disabled && onUpdatePatron(patron.id, { relationship: rel.value })
                            }
                            disabled={disabled}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              patron.relationship === rel.value
                                ? rel.color
                                : 'bg-background text-text-muted border border-border hover:border-primary/40'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {rel.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Conversation Summary */}
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Conversation Summary
                      </label>
                      <textarea
                        value={patron.conversation_summary || ''}
                        onChange={(e) =>
                          onUpdatePatron(patron.id, { conversation_summary: e.target.value })
                        }
                        placeholder="What did they discuss?"
                        className="w-full h-16 px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-text-muted resize-none focus:border-primary focus:outline-none"
                        disabled={disabled}
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Notes</label>
                      <textarea
                        value={patron.notes || ''}
                        onChange={(e) => onUpdatePatron(patron.id, { notes: e.target.value })}
                        placeholder="Additional notes..."
                        className="w-full h-16 px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-text-muted resize-none focus:border-primary focus:outline-none"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
