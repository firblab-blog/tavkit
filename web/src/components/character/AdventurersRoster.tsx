import { useState, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import Icon from '../common/Icon'
import CharacterSheet from './CharacterSheet'
import ImportCharacter from './ImportCharacter'
import ManualCharacterForm from './ManualCharacterForm'
import { useCharacterStore, Character } from '../../store/characterStore'
import { useCampaignStore } from '../../store/campaignStore'
import { useMobileSidebar } from '../../hooks/useMobileSidebar'
import { apiClient } from '@/api/client'

export default function AdventurersRoster() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { characters, loading, error, fetchCharacters, deleteCharacter } = useCharacterStore()
  const { activeCampaignId, unlinkCharacterFromCampaign, getActiveCampaign } = useCampaignStore()
  const activeCampaign = getActiveCampaign()

  // Determine if we're in sandbox mode (no campaign context)
  const isSandboxMode = location.pathname.includes('/sandbox')
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createMethod, setCreateMethod] = useState<'choose' | 'manual' | 'import'>('choose')

  // Use shared mobile sidebar hook
  const { isMobile, isDrawerOpen, setIsDrawerOpen } = useMobileSidebar()

  useEffect(() => {
    // Fetch characters filtered by campaign (unless in sandbox mode)
    // Use activeCampaign?.id instead of activeCampaignId to handle stale IDs in localStorage
    fetchCharacters(false, isSandboxMode ? undefined : (activeCampaign?.id ?? undefined))
  }, [fetchCharacters, activeCampaign?.id, isSandboxMode])

  // Select character from URL query parameter
  useEffect(() => {
    const characterId = searchParams.get('character')
    if (characterId && characters.length > 0) {
      const char = characters.find((c) => c.id === characterId)
      if (char) {
        setSelectedCharacter(char)
      }
    }
  }, [searchParams, characters])

  const handleDeleteCharacter = async (id: string) => {
    // Different behavior based on context
    // Use activeCampaign (not just activeCampaignId) to handle stale IDs
    if (isSandboxMode || !activeCampaign) {
      // Sandbox mode or no valid campaign: permanently delete the character
      if (
        !confirm(
          'Are you sure you want to permanently delete this character? This cannot be undone.'
        )
      )
        return

      try {
        await apiClient.delete(`/characters/${id}`)
        deleteCharacter(id)

        if (selectedCharacter?.id === id) {
          setSelectedCharacter(null)
        }
      } catch (err: any) {
        alert(err.response?.data?.error || err.message || 'Failed to delete character')
      }
    } else {
      // Campaign mode: unlink from campaign (character remains in personal library)
      if (
        !confirm(
          'Remove this character from the campaign? The character will still be available in your personal library.'
        )
      )
        return

      try {
        await unlinkCharacterFromCampaign(activeCampaign.id, id)
        // Remove from local character list for this view
        deleteCharacter(id)

        if (selectedCharacter?.id === id) {
          setSelectedCharacter(null)
        }
      } catch (err: any) {
        alert(
          err.response?.data?.error || err.message || 'Failed to remove character from campaign'
        )
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-x-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background-panel px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="p-2 hover:bg-tavern-dark rounded transition-colors lg:hidden"
                aria-label="Open navigation menu"
                aria-expanded={isDrawerOpen}
              >
                <svg
                  className="w-6 h-6 text-text"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                <Icon name="Users" className="w-8 h-8 text-primary" />
                Guild Roster
              </h1>
              <p className="text-sm text-text-muted mt-1">
                Manage your player characters and party members
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
          >
            <Icon name="Plus" className="w-5 h-5" />
            <span className="hidden sm:inline">New Character</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Backdrop - Mobile only */}
        {isMobile && isDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close navigation"
          />
        )}

        {/* Character List Sidebar */}
        <aside
          className={`
            ${isMobile ? 'fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out' : 'w-64 flex-shrink-0'}
            ${isMobile && !isDrawerOpen ? '-translate-x-full' : 'translate-x-0'}
            border-r border-border bg-background-panel overflow-y-auto
          `}
          role="navigation"
          aria-label="Character list"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <Icon name="Users" className="w-3 h-3" />
                Your Characters
              </h2>
              {!loading && characters.length > 0 && (
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-semibold rounded-full">
                  {characters.length}
                </span>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Icon name="Loader2" className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {!loading && characters.length === 0 && (
              <div className="text-center py-8 px-4">
                <div className="bg-background-panel/50 border-2 border-dashed border-border rounded-xl p-6">
                  <Icon name="Users" className="w-16 h-16 text-primary/40 mx-auto mb-3" />
                  <h3 className="text-text font-semibold mb-1">No Characters Yet</h3>
                  <p className="text-text-muted text-xs">
                    Create your first adventurer to start tracking your party!
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 w-full px-4 py-2 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="Plus" className="w-4 h-4" />
                    Create Character
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    selectedCharacter?.id === character.id
                      ? 'bg-primary/20 border-primary'
                      : 'bg-background border-border hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setSelectedCharacter(character)
                    if (isMobile) setIsDrawerOpen(false)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text truncate">{character.name}</h3>
                      <p className="text-sm text-text-muted">
                        Level {character.level} {character.race} {character.class_info}
                      </p>
                      {character.background && (
                        <p className="text-xs text-text-muted mt-1">{character.background}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCharacter(character.id)
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
        </aside>

        {/* Character Sheet */}
        <div className="flex-1 overflow-y-auto">
          {selectedCharacter ? (
            <CharacterSheet
              character={selectedCharacter}
              onUpdate={() =>
                fetchCharacters(true, isSandboxMode ? undefined : (activeCampaignId ?? undefined))
              }
              onClose={() => setSelectedCharacter(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl"></div>
                  <Icon name="UserCircle" className="w-24 h-24 text-primary/30 mx-auto relative" />
                </div>
                <h2 className="text-2xl font-bold text-text mb-2">
                  {characters.length > 0 ? 'Select a Character' : 'Create Your First Character'}
                </h2>
                <p className="text-text-muted mb-6">
                  {characters.length > 0
                    ? 'Choose a character from the sidebar to view and edit their character sheet'
                    : 'Get started by adding your first party member to the roster'}
                </p>
                {characters.length === 0 && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-primary hover:bg-primary/80 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <Icon name="Plus" className="w-5 h-5" />
                    Create New Character
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Character Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-panel border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {createMethod === 'choose' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-text">Create New Character</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setCreateMethod('choose')
                    }}
                    className="text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="X" className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-text-muted mb-6">Choose how you'd like to add your character:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setCreateMethod('manual')}
                    className="flex flex-col items-center gap-4 p-6 border-2 border-border hover:border-primary rounded-lg transition-all group"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Icon name="FileEdit" className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-text mb-2">Create Manually</h3>
                      <p className="text-sm text-text-muted">
                        Build your character from scratch with our step-by-step form
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setCreateMethod('import')}
                    className="flex flex-col items-center gap-4 p-6 border-2 border-border hover:border-primary rounded-lg transition-all group"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Icon name="Upload" className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-text mb-2">
                        Import from D&D Beyond
                      </h3>
                      <p className="text-sm text-text-muted">
                        Import an existing character from your D&D Beyond account
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}

            {createMethod === 'manual' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCreateMethod('choose')}
                    className="flex items-center gap-2 text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="ArrowLeft" className="w-4 h-4" />
                    Back
                  </button>
                  <h2 className="text-xl font-bold text-text">Create Character Manually</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setCreateMethod('choose')
                    }}
                    className="text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="X" className="w-5 h-5" />
                  </button>
                </div>

                <ManualCharacterForm
                  onSuccess={() => {
                    setShowCreateModal(false)
                    setCreateMethod('choose')
                    fetchCharacters(
                      true,
                      isSandboxMode ? undefined : (activeCampaignId ?? undefined)
                    )
                  }}
                  onCancel={() => setCreateMethod('choose')}
                  campaignId={isSandboxMode ? undefined : activeCampaignId}
                />
              </>
            )}

            {createMethod === 'import' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCreateMethod('choose')}
                    className="flex items-center gap-2 text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="ArrowLeft" className="w-4 h-4" />
                    Back
                  </button>
                  <h2 className="text-xl font-bold text-text">Import from D&D Beyond</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setCreateMethod('choose')
                    }}
                    className="text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="X" className="w-5 h-5" />
                  </button>
                </div>

                <ImportCharacter
                  onSuccess={() => {
                    setShowCreateModal(false)
                    setCreateMethod('choose')
                    fetchCharacters(
                      true,
                      isSandboxMode ? undefined : (activeCampaignId ?? undefined)
                    )
                  }}
                  onCancel={() => setCreateMethod('choose')}
                  campaignId={isSandboxMode ? undefined : activeCampaignId}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
