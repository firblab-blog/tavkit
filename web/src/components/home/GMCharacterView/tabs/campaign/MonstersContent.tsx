import { useEffect, useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import Icon from '../../../../common/Icon'
import { authFetch } from '../../../../../utils/authFetch'
import { getApiUrl } from '../../../../../config/api'
import { logger } from '../../../../../utils/logger'
import { useGeneratorModalStore } from '../../../../../store/generatorModalStore'

interface MonstersContentProps {
  campaignId: string
}

interface Monster {
  id: string
  name: string
  cr: number | string
  type?: string
  size?: string
  alignment?: string
  hp?: number
  ac?: number
  lore?: string
  abilities?: string
  tactics?: string
  created_at: string
  updated_at: string
}

/**
 * MonstersContent - Display monsters from the campaign.
 */
export default function MonstersContent({ campaignId }: MonstersContentProps) {
  const { openGenerator } = useGeneratorModalStore()
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingMonster, setViewingMonster] = useState<Monster | null>(null)

  useEffect(() => {
    const loadMonsters = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await authFetch(getApiUrl(`/monsters?campaign_id=${campaignId}`))
        if (!response.ok) throw new Error('Failed to fetch monsters')
        const data = await response.json()
        setMonsters(Array.isArray(data) ? data : [])
      } catch (err) {
        setError('Failed to load monsters')
        logger.error('Failed to load monsters:', err)
      } finally {
        setLoading(false)
      }
    }
    loadMonsters()
  }, [campaignId])

  const filteredMonsters = useMemo(() => {
    if (!searchQuery) return monsters
    const query = searchQuery.toLowerCase()
    return monsters.filter(
      (monster) =>
        monster.name.toLowerCase().includes(query) ||
        monster.type?.toLowerCase().includes(query) ||
        monster.lore?.toLowerCase().includes(query)
    )
  }, [monsters, searchQuery])

  const handleDelete = async (monster: Monster) => {
    if (window.confirm(`Delete "${monster.name}"? This cannot be undone.`)) {
      try {
        const response = await authFetch(getApiUrl(`/monsters/${monster.id}`), {
          method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete monster')
        setMonsters((prev) => prev.filter((m) => m.id !== monster.id))
        if (viewingMonster?.id === monster.id) {
          setViewingMonster(null)
        }
      } catch (err) {
        logger.error('Failed to delete monster:', err)
      }
    }
  }

  const getCRDisplay = (cr: number | string) => {
    if (typeof cr === 'number') {
      if (cr < 1) return `CR ${cr}`
      return `CR ${cr}`
    }
    return `CR ${cr}`
  }

  return (
    <div className="space-y-4">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search monsters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
          />
        </div>
        <button
          onClick={() => openGenerator('monster')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm"
        >
          <Icon name="Plus" className="w-4 h-4" />
          Add Monster
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredMonsters.length === 0 && (
        <div className="text-center py-8 bg-background-panel border border-border rounded-xl">
          <Icon name="Skull" className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="text-text font-medium mb-1">
            {searchQuery ? 'No matching monsters' : 'No monsters yet'}
          </h3>
          <p className="text-text-muted text-sm mb-4">
            {searchQuery
              ? 'Try adjusting your search.'
              : 'Add custom monsters, bosses, and creatures.'}
          </p>
          <button
            onClick={() => openGenerator('monster')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm mx-auto"
          >
            <Icon name="Plus" className="w-4 h-4" />
            Add Monster
          </button>
        </div>
      )}

      {/* Monster Grid */}
      {!loading && filteredMonsters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMonsters.map((monster) => (
            <div
              key={monster.id}
              onClick={() => setViewingMonster(monster)}
              className="bg-background-panel border border-orange-500/30 rounded-xl p-4 hover:border-orange-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="Skull" className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-text font-medium truncate">{monster.name}</h4>
                    <p className="text-text-muted text-sm">{getCRDisplay(monster.cr)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(monster)
                  }}
                  className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400 flex-shrink-0"
                >
                  <Icon name="Trash2" className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {monster.type && (
                  <span className="px-2 py-1 bg-background rounded-lg text-xs text-text-muted capitalize">
                    {monster.type}
                  </span>
                )}
                {monster.size && (
                  <span className="px-2 py-1 bg-background rounded-lg text-xs text-text-muted capitalize">
                    {monster.size}
                  </span>
                )}
                {monster.hp && (
                  <span className="px-2 py-1 bg-orange-500/10 rounded-lg text-xs text-orange-400">
                    HP {monster.hp}
                  </span>
                )}
                {monster.ac && (
                  <span className="px-2 py-1 bg-blue-500/10 rounded-lg text-xs text-blue-400">
                    AC {monster.ac}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewingMonster && (
        <MonsterDetailModal
          monster={viewingMonster}
          onClose={() => setViewingMonster(null)}
          onDelete={() => handleDelete(viewingMonster)}
        />
      )}
    </div>
  )
}

// Monster Detail Modal
interface MonsterDetailModalProps {
  monster: Monster
  onClose: () => void
  onDelete: () => void
}

function MonsterDetailModal({ monster, onClose, onDelete }: MonsterDetailModalProps) {
  const getCRDisplay = (cr: number | string) => {
    if (typeof cr === 'number') {
      if (cr < 1) return `CR ${cr}`
      return `CR ${cr}`
    }
    return `CR ${cr}`
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-5xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Icon name="Skull" className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-text">{monster.name}</h3>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span>{getCRDisplay(monster.cr)}</span>
                {monster.type && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{monster.type}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-text"
          >
            <Icon name="X" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Stats Row */}
          <div className="flex flex-wrap gap-3 mb-6">
            {monster.hp && (
              <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p className="text-xs text-text-muted">Hit Points</p>
                <p className="text-lg font-semibold text-orange-400">{monster.hp}</p>
              </div>
            )}
            {monster.ac && (
              <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-text-muted">Armor Class</p>
                <p className="text-lg font-semibold text-blue-400">{monster.ac}</p>
              </div>
            )}
            {monster.size && (
              <div className="px-4 py-2 bg-background border border-border rounded-lg">
                <p className="text-xs text-text-muted">Size</p>
                <p className="text-lg font-semibold text-text capitalize">{monster.size}</p>
              </div>
            )}
            {monster.alignment && (
              <div className="px-4 py-2 bg-background border border-border rounded-lg">
                <p className="text-xs text-text-muted">Alignment</p>
                <p className="text-lg font-semibold text-text capitalize">{monster.alignment}</p>
              </div>
            )}
          </div>

          {/* Lore */}
          {monster.lore && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                Lore
              </h4>
              <div className="prose prose-invert prose-tavern max-w-none">
                <ReactMarkdown>{monster.lore.replace(/\\n/g, '\n')}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Abilities */}
          {monster.abilities && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                Abilities
              </h4>
              <div className="prose prose-invert prose-tavern max-w-none">
                <ReactMarkdown>{monster.abilities.replace(/\\n/g, '\n')}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Tactics */}
          {monster.tactics && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                Tactics
              </h4>
              <div className="prose prose-invert prose-tavern max-w-none">
                <ReactMarkdown>{monster.tactics.replace(/\\n/g, '\n')}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* No content fallback */}
          {!monster.lore && !monster.abilities && !monster.tactics && (
            <p className="text-text-muted italic">No additional details</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 sm:px-6 py-4 flex justify-between flex-shrink-0">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            <Icon name="Trash2" className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
