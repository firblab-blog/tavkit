import { useEffect, useState } from 'react'
import Icon from '../../common/Icon'
import { usePlayerJournalStore, JournalEntry } from '../../../store/playerJournalStore'
import { useCampaignStore } from '../../../store/campaignStore'
import JournalEntryCard from './JournalEntryCard'
import JournalEditor from './JournalEditor'
import JournalEntryModal from './JournalEntryModal'

interface SessionJournalProps {
  characterId?: string
}

export default function SessionJournal({ characterId }: SessionJournalProps) {
  const { entries, loading, error, fetchEntries, deleteEntry } = usePlayerJournalStore()
  const getActiveCampaign = useCampaignStore((state) => state.getActiveCampaign)
  const activeCampaign = getActiveCampaign()

  const [showEditor, setShowEditor] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSession, setFilterSession] = useState<string>('')

  useEffect(() => {
    fetchEntries(activeCampaign?.id)
  }, [fetchEntries, activeCampaign?.id])

  // Filter entries based on search and session number
  const filteredEntries = entries.filter((entry) => {
    // Filter by character if specified
    if (characterId && entry.character_id !== characterId) return false

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = entry.title.toLowerCase().includes(query)
      const matchesContent = entry.content?.toLowerCase().includes(query)
      if (!matchesTitle && !matchesContent) return false
    }

    // Filter by session number
    if (filterSession && entry.session_number !== parseInt(filterSession)) {
      return false
    }

    return true
  })

  // Sort by session number (desc) then by date
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (a.session_number && b.session_number) {
      return b.session_number - a.session_number
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Get unique session numbers for filter dropdown
  const sessionNumbers = [...new Set(entries.map((e) => e.session_number).filter(Boolean))].sort(
    (a, b) => (b || 0) - (a || 0)
  )

  const handleView = (entry: JournalEntry) => {
    setViewingEntry(entry)
  }

  const handleEdit = (entry: JournalEntry) => {
    setViewingEntry(null) // Close view modal if open
    setEditingEntry(entry)
    setShowEditor(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this journal entry?')) {
      await deleteEntry(id)
      setViewingEntry(null) // Close view modal if open
    }
  }

  const handleEditorClose = () => {
    setShowEditor(false)
    setEditingEntry(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <Icon name="BookOpen" className="w-5 h-5 text-purple-400" />
            Session Journal
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Record your adventures, track important events, and take notes.
          </p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
        >
          <Icon name="Plus" className="w-4 h-4" />
          New Entry
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>
        {sessionNumbers.length > 0 && (
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
          >
            <option value="">All Sessions</option>
            {sessionNumbers.map((num) => (
              <option key={num} value={num}>
                Session {num}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && entries.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedEntries.length === 0 && (
        <div className="text-center py-12 bg-background-panel border border-border rounded-xl">
          <Icon name="BookOpen" className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">
            {searchQuery || filterSession ? 'No matching entries' : 'No journal entries yet'}
          </h3>
          <p className="text-text-muted mb-4 max-w-md mx-auto">
            {searchQuery || filterSession
              ? 'Try adjusting your search or filter.'
              : 'Start recording your adventures! Create your first journal entry to keep track of sessions.'}
          </p>
          {!searchQuery && !filterSession && (
            <button
              onClick={() => setShowEditor(true)}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
            >
              Create First Entry
            </button>
          )}
        </div>
      )}

      {/* Entries List */}
      <div className="space-y-4">
        {sortedEntries.map((entry) => (
          <JournalEntryCard
            key={entry.id}
            entry={entry}
            onClick={() => handleView(entry)}
            onEdit={() => handleEdit(entry)}
            onDelete={() => handleDelete(entry.id)}
          />
        ))}
      </div>

      {/* View Modal */}
      {viewingEntry && (
        <JournalEntryModal
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
          onEdit={() => handleEdit(viewingEntry)}
          onDelete={() => handleDelete(viewingEntry.id)}
        />
      )}

      {/* Editor Modal */}
      {showEditor && (
        <JournalEditor
          entry={editingEntry}
          characterId={characterId}
          campaignId={activeCampaign?.id}
          onClose={handleEditorClose}
        />
      )}
    </div>
  )
}
