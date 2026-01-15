import { useState, useEffect } from 'react'
import Icon from '../../common/Icon'
import { usePartyLootStore, PartyLootItem } from '../../../store/partyLootStore'
import { useCharacterStore } from '../../../store/characterStore'
import { useCampaignStore } from '../../../store/campaignStore'

interface ClaimModalProps {
  item: PartyLootItem
  campaignId: string
  onClose: () => void
}

export default function ClaimModal({ item, campaignId, onClose }: ClaimModalProps) {
  const { claimLoot, unclaimLoot, loading } = usePartyLootStore()
  const { characters, fetchCharacters } = useCharacterStore()
  const { fetchCampaignCharacters } = useCampaignStore()

  const [selectedCharacter, setSelectedCharacter] = useState<string>(item.claimed_by || '')
  const [selectedName, setSelectedName] = useState<string>(item.claimed_by_name || '')
  const [customName, setCustomName] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [campaignCharacters, setCampaignCharacters] = useState<
    Array<{ character_id: string; character_name?: string }>
  >([])

  useEffect(() => {
    fetchCharacters()
    // Also fetch campaign-linked characters
    fetchCampaignCharacters(campaignId)
      .then(setCampaignCharacters)
      .catch(() => {})
  }, [fetchCharacters, fetchCampaignCharacters, campaignId])

  // Combine user's characters with campaign characters
  const availableCharacters = [
    ...characters.map((c) => ({ id: c.id, name: c.name })),
    ...campaignCharacters
      .filter((cc) => !characters.find((c) => c.id === cc.character_id))
      .map((cc) => ({ id: cc.character_id, name: cc.character_name || 'Unknown Character' })),
  ]

  const handleClaim = async () => {
    if (useCustom) {
      if (!customName.trim()) return
      await claimLoot(campaignId, item.id, {
        claimed_by: 'custom',
        claimed_by_name: customName.trim(),
      })
    } else {
      if (!selectedCharacter) return
      await claimLoot(campaignId, item.id, {
        claimed_by: selectedCharacter,
        claimed_by_name: selectedName,
      })
    }
    onClose()
  }

  const handleUnclaim = async () => {
    await unclaimLoot(campaignId, item.id)
    onClose()
  }

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacter(characterId)
    const char = availableCharacters.find((c) => c.id === characterId)
    setSelectedName(char?.name || '')
    setUseCustom(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-sm">
        {/* Header */}
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="UserPlus" className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-text">Claim Item</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background rounded text-text-muted hover:text-text"
          >
            <Icon name="X" className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="text-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
              <Icon name="Gem" className="w-6 h-6 text-yellow-400" />
            </div>
            <h4 className="text-text font-medium">{item.name}</h4>
            {item.quantity > 1 && <span className="text-text-muted text-sm">x{item.quantity}</span>}
          </div>

          {/* Character Selection */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Who is claiming this item?
            </label>

            {/* Character list */}
            {availableCharacters.length > 0 && !useCustom && (
              <div className="space-y-2 mb-3">
                {availableCharacters.map((char) => (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleCharacterSelect(char.id)}
                    className={`w-full px-4 py-3 rounded-lg border text-left transition-colors flex items-center gap-3 ${
                      selectedCharacter === char.id
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-border hover:border-border-hover bg-background'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon name="User" className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-text font-medium">{char.name}</span>
                    {selectedCharacter === char.id && (
                      <Icon name="Check" className="w-4 h-4 text-yellow-400 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Custom name option */}
            <button
              type="button"
              onClick={() => {
                setUseCustom(true)
                setSelectedCharacter('')
              }}
              className={`w-full px-4 py-3 rounded-lg border text-left transition-colors ${
                useCustom
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-border hover:border-border-hover bg-background'
              }`}
            >
              <span className="text-text-muted text-sm">
                {useCustom ? 'Enter custom name:' : 'Or enter a custom name...'}
              </span>
            </button>

            {useCustom && (
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Character name"
                className="w-full mt-2 px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                autoFocus
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 flex justify-between">
          {item.claimed_by ? (
            <button
              type="button"
              onClick={handleUnclaim}
              disabled={loading}
              className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
            >
              Unclaim
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-muted hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleClaim}
              disabled={loading || (!selectedCharacter && !customName.trim())}
              className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Icon name="Loader2" className="w-4 h-4 animate-spin" />}
              Claim
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
