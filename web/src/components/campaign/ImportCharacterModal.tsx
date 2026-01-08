import { useState, useEffect } from 'react'
import Icon from '../common/Icon'
import { useCampaignStore } from '../../store/campaignStore'
import { useAuthStore } from '../../store/authStore'
import { getApiUrl } from '@/config/api'
import { logger } from '@/utils/logger'
import { authFetch } from '@/utils/authFetch'

interface Character {
  id: string
  name: string
  race: string
  class_info: string
  level: number
  avatar?: string
}

interface ImportCharacterModalProps {
  campaignId: string
  existingCharacterIds: string[]
  onClose: () => void
  onImportComplete: () => void
}

export default function ImportCharacterModal({
  campaignId,
  existingCharacterIds,
  onClose,
  onImportComplete,
}: ImportCharacterModalProps) {
  const { linkCharacterToCampaign } = useCampaignStore()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCharacters()
  }, [])

  const loadCharacters = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!isAuthenticated) {
        throw new Error('Not authenticated')
      }

      const response = await authFetch(getApiUrl('/characters'))

      if (!response.ok) {
        throw new Error('Failed to fetch characters')
      }

      const data = await response.json()
      const allCharacters = Array.isArray(data) ? data : data?.characters || []

      // Filter out characters already in this campaign
      const availableCharacters = allCharacters.filter(
        (char: Character) => !existingCharacterIds.includes(char.id)
      )

      setCharacters(availableCharacters)
    } catch (err) {
      logger.error('Failed to load characters:', err)
      setError(err instanceof Error ? err.message : 'Failed to load characters')
    } finally {
      setLoading(false)
    }
  }

  const toggleCharacter = (characterId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(characterId)) {
        next.delete(characterId)
      } else {
        next.add(characterId)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(characters.map((c) => c.id)))
  }

  const selectNone = () => {
    setSelectedIds(new Set())
  }

  const handleImport = async () => {
    if (selectedIds.size === 0) return

    setImporting(true)
    try {
      // Link each selected character to the campaign
      for (const characterId of selectedIds) {
        await linkCharacterToCampaign(campaignId, characterId)
      }
      onImportComplete()
    } catch (err) {
      logger.error('Failed to import characters:', err)
      setError(err instanceof Error ? err.message : 'Failed to import characters')
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background-panel border border-border rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-xl font-bold text-tavern-light">Import from Guild Roster</h3>
            <p className="text-sm text-tavern-mauve mt-1">
              Select characters to add to this campaign
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-tavern-dark rounded transition-colors">
            <Icon name="X" className="w-5 h-5 text-tavern-mauve" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader2" className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Icon name="AlertCircle" className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadCharacters}
                className="mt-4 px-4 py-2 bg-tavern-dark hover:bg-tavern-purple text-tavern-cream rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="Users" className="w-12 h-12 text-tavern-mauve mx-auto mb-3 opacity-50" />
              <p className="text-tavern-mauve">No characters available to import</p>
              <p className="text-sm text-tavern-mauve mt-1">
                All your characters are already in this campaign, or you haven't created any yet.
              </p>
            </div>
          ) : (
            <>
              {/* Select All / None */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-tavern-mauve">
                  {selectedIds.size} of {characters.length} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-primary hover:text-primary-light transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-tavern-mauve">|</span>
                  <button
                    onClick={selectNone}
                    className="text-sm text-primary hover:text-primary-light transition-colors"
                  >
                    Select None
                  </button>
                </div>
              </div>

              {/* Character List */}
              <div className="space-y-2">
                {characters.map((character) => (
                  <button
                    key={character.id}
                    onClick={() => toggleCharacter(character.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                      selectedIds.has(character.id)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedIds.has(character.id)
                          ? 'bg-primary border-primary'
                          : 'border-tavern-mauve'
                      }`}
                    >
                      {selectedIds.has(character.id) && (
                        <Icon name="Check" className="w-3 h-3 text-tavern-darkest" />
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-tavern-dark flex items-center justify-center overflow-hidden">
                      {character.avatar ? (
                        <img
                          src={character.avatar}
                          alt={character.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon name="User" className="w-6 h-6 text-tavern-mauve" />
                      )}
                    </div>

                    {/* Character Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-tavern-light truncate">{character.name}</h4>
                      <p className="text-sm text-tavern-mauve">
                        Level {character.level} {character.race} {character.class_info}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-tavern-dark hover:bg-tavern-purple text-tavern-cream font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedIds.size === 0 || importing}
            className="px-6 py-2 bg-primary hover:bg-primary-dark text-tavern-darkest font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importing && <Icon name="Loader2" className="w-4 h-4 animate-spin" />}
            <span>
              {importing
                ? 'Importing...'
                : `Import ${selectedIds.size} Character${selectedIds.size !== 1 ? 's' : ''}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
