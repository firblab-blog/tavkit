import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../common/Icon'
import { useCampaignStore, CampaignCharacterLink } from '../../../../store/campaignStore'
import { useCharacterStore, Character } from '../../../../store/characterStore'
import { getHPBreakdown } from '@/utils/characterStats'

interface DMPCCardProps {
  campaignId: string
}

/**
 * DMPCCard - Shows the GM's character in the current campaign (if any).
 *
 * For GMs who also play a character in their own campaign (DMPC),
 * this provides quick access to their character sheet without switching contexts.
 */
export default function DMPCCard({ campaignId }: DMPCCardProps) {
  const navigate = useNavigate()
  const { fetchCampaignCharacters } = useCampaignStore()
  const { characters, fetchCharacters } = useCharacterStore()

  const [campaignCharacterLinks, setCampaignCharacterLinks] = useState<CampaignCharacterLink[]>([])
  const [loading, setLoading] = useState(true)
  const [gmCharacter, setGmCharacter] = useState<Character | null>(null)

  // Fetch campaign characters and user's characters
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Fetch characters linked to this campaign
        const links = await fetchCampaignCharacters(campaignId)
        setCampaignCharacterLinks(links)

        // Fetch user's own characters
        await fetchCharacters()
      } catch {
        // Silently fail - no DMPC is fine
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [campaignId, fetchCampaignCharacters, fetchCharacters])

  // Find the GM's character in this campaign
  useEffect(() => {
    if (campaignCharacterLinks.length > 0 && characters.length > 0) {
      // Find characters that are both in the campaign AND owned by the user
      const linkedCharacterIds = new Set(campaignCharacterLinks.map((link) => link.character_id))
      const userCharacterInCampaign = characters.find((char) => linkedCharacterIds.has(char.id))
      setGmCharacter(userCharacterInCampaign || null)
    } else {
      setGmCharacter(null)
    }
  }, [campaignCharacterLinks, characters])

  // Don't render if loading or no DMPC
  if (loading || !gmCharacter) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="User" className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Your Character in This Campaign
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
          <Icon name="User" className="w-7 h-7 text-blue-400" />
        </div>

        {/* Character Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-text truncate">{gmCharacter.name}</h3>
          <p className="text-text-muted text-sm">
            Level {gmCharacter.level} {gmCharacter.race} {gmCharacter.class_info}
          </p>
          {/* Quick Stats */}
          <div className="flex items-center gap-3 mt-1">
            {gmCharacter.max_hp && (
              <span className="text-xs text-text-muted">
                HP:{' '}
                {gmCharacter.current_hp ??
                  getHPBreakdown(gmCharacter.max_hp, gmCharacter.level, gmCharacter.constitution)
                    .total}
                /
                {
                  getHPBreakdown(gmCharacter.max_hp, gmCharacter.level, gmCharacter.constitution)
                    .total
                }
              </span>
            )}
            {gmCharacter.armor_class && (
              <span className="text-xs text-text-muted">AC: {gmCharacter.armor_class}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/dashboard/gm/characters')}
            className="px-3 py-1.5 text-sm bg-background hover:bg-background-panel border border-border hover:border-blue-500/40 rounded-lg text-text-muted hover:text-text transition-colors"
          >
            Quick View
          </button>
          <button
            onClick={() => navigate('/dashboard/gm/characters')}
            className="px-3 py-1.5 text-sm bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 hover:border-blue-500/60 rounded-lg text-blue-400 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}
