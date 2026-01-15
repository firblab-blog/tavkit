import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import Icon from '../common/Icon'
import MarkdownToolbar from '../common/MarkdownToolbar'
import { useCampaignStore, type CampaignContent } from '../../store/campaignStore'
import type { Campaign } from '../../store/campaignStore'
import type { IconName } from '../common/Icon'
import { getApiUrl } from '@/config/api'
import ImportCharacterModal from './ImportCharacterModal'
import CharacterSheet from '../character/CharacterSheet'
import NPCInventory from '../npcs/NPCInventory'
import LocationTreasure from '../locations/LocationTreasure'
import { logger } from '@/utils/logger'
import { useAuthStore } from '../../store/authStore'
import { authFetch } from '@/utils/authFetch'

interface CampaignSection {
  id: string
  name: string
  icon: IconName
  description: string
  subsections?: string[]
}

interface SectionContentProps {
  campaign: Campaign
  section: CampaignSection
  subsection: string | null
  selectedEntryId: string | null
  onEntriesLoad: (entries: CampaignContent[]) => void
  onSelectEntry: (entryId: string | null) => void
}

export default function SectionContent({
  campaign,
  section,
  subsection,
  selectedEntryId,
  onEntriesLoad,
  onSelectEntry,
}: SectionContentProps) {
  const {
    fetchCampaignContent,
    createCampaignContent,
    updateCampaignContent,
    deleteCampaignContent,
    fetchCampaignCharacters,
    unlinkCharacterFromCampaign,
  } = useCampaignStore()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [entries, setEntries] = useState<CampaignContent[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CampaignContent | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportCharacterModal, setShowImportCharacterModal] = useState(false)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Load content when section/subsection changes
  useEffect(() => {
    // Clear entries immediately when section changes to prevent stale data from showing
    setEntries([])
    onEntriesLoad([])
    loadContent()
    setSearchQuery('') // Clear search when changing sections
  }, [campaign.id, section.id, subsection])

  const loadContent = async () => {
    try {
      setLoading(true)

      // Fetch from appropriate endpoint based on section type
      let content: CampaignContent[] = []

      // When viewing Artificer's Toolkit, use subsection as the effective section
      const effectiveSection =
        section.id === 'artificers-toolkit' && subsection ? subsection : section.id

      if (effectiveSection === 'pcs') {
        // Fetch characters linked to this campaign via campaign_characters table
        const characters = await fetchCampaignCharacters(campaign.id)
        const characterEntries = characters.map((char: any) => {
          // Format character class info for list preview
          const classDisplay = char.class_info || 'Unknown Class'

          return {
            id: char.id,
            campaign_id: campaign.id,
            user_id: char.user_id || '',
            section: 'pcs',
            subsection: null,
            title: char.name,
            // Brief summary for list view
            content: `Level ${char.level || 1} ${char.race || 'Unknown'} ${classDisplay}`,
            type: 'imported' as 'manual' | 'imported',
            created_at: char.created_at,
            updated_at: char.updated_at,
            // Store full character data for CharacterSheet component
            characterData: char,
          }
        })

        // Also fetch any campaign_content entries for the PCs section (imported files, notes, etc.)
        const contentEntries = await fetchCampaignContent(campaign.id, 'pcs', null)

        // Combine both sources - characters first, then content entries
        content = [...characterEntries, ...contentEntries]
      } else if (effectiveSection === 'npcs') {
        const response = await authFetch(getApiUrl(`/npcs?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const npcs = Array.isArray(data) ? data : data?.npcs || []
          content = npcs.map((npc: any) => {
            let statsDisplay = ''
            if (npc.stats) {
              try {
                const stats = typeof npc.stats === 'string' ? JSON.parse(npc.stats) : npc.stats

                // Format abilities
                if (stats.abilities) {
                  const abs = stats.abilities
                  const mod = (score: number) => Math.floor((score - 10) / 2)
                  const sign = (val: number) => (val >= 0 ? `+${val}` : val)
                  statsDisplay += `\n\n**Ability Scores:**\n`
                  statsDisplay += `STR ${abs.STR || 10} (${sign(mod(abs.STR || 10))}) | `
                  statsDisplay += `DEX ${abs.DEX || 10} (${sign(mod(abs.DEX || 10))}) | `
                  statsDisplay += `CON ${abs.CON || 10} (${sign(mod(abs.CON || 10))})\n`
                  statsDisplay += `INT ${abs.INT || 10} (${sign(mod(abs.INT || 10))}) | `
                  statsDisplay += `WIS ${abs.WIS || 10} (${sign(mod(abs.WIS || 10))}) | `
                  statsDisplay += `CHA ${abs.CHA || 10} (${sign(mod(abs.CHA || 10))})`
                }

                if (stats.level) statsDisplay += `\n\n**Level:** ${stats.level}`
                if (stats.alignment) statsDisplay += ` | **Alignment:** ${stats.alignment}`
                if (stats.role) statsDisplay += `\n\n**Role:** ${stats.role}`

                if (stats.skills && stats.skills.length > 0) {
                  statsDisplay += `\n\n**Skills:** ${stats.skills.join(', ')}`
                }

                if (stats.equipment && stats.equipment.length > 0) {
                  statsDisplay += `\n\n**Equipment:**\n${stats.equipment.map((e: string) => `- ${e}`).join('\n')}`
                }

                if (stats.plot_hooks && stats.plot_hooks.length > 0) {
                  statsDisplay += `\n\n**Plot Hooks:**\n${stats.plot_hooks.map((h: string) => `- ${h}`).join('\n')}`
                }
              } catch (e) {
                statsDisplay = `\n\n**Stats:**\n${npc.stats}`
              }
            }

            // Format personality with line breaks
            let personalityFormatted = npc.personality || 'N/A'
            if (npc.personality) {
              personalityFormatted = npc.personality
                .replace(/^Traits:\s*/g, '**Traits:** ')
                .replace(/\s+Ideals:\s*/g, '\n\n**Ideals:** ')
                .replace(/\s+Bonds:\s*/g, '\n\n**Bonds:** ')
                .replace(/\s+Flaws:\s*/g, '\n\n**Flaws:** ')
            }

            // Format backstory to make Motivation bold
            let backstoryFormatted = npc.backstory || 'N/A'
            if (npc.backstory) {
              backstoryFormatted = npc.backstory.replace(
                /\s*Motivation:\s*/g,
                '\n\n**Motivation:** '
              )
            }

            return {
              id: npc.id,
              campaign_id: campaign.id,
              user_id: npc.user_id || '',
              section: 'npcs',
              subsection: null,
              title: npc.name,
              content: `**Race:** ${npc.race || 'N/A'} | **Class:** ${npc.class || 'N/A'}${statsDisplay}\n\n${personalityFormatted}\n\n**Backstory:**\n${backstoryFormatted}`,
              type: (npc.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
              created_at: npc.created_at,
              updated_at: npc.created_at,
              // Store full NPC data for inventory display
              npcData: npc,
            }
          })
        }
      } else if (effectiveSection === 'items') {
        const response = await authFetch(getApiUrl(`/items?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const items = Array.isArray(data) ? data : data?.items || []
          content = items.map((item: any) => {
            let propsDisplay = ''
            if (item.properties) {
              try {
                const props =
                  typeof item.properties === 'string'
                    ? JSON.parse(item.properties)
                    : item.properties

                if (typeof props === 'object' && !Array.isArray(props)) {
                  propsDisplay = Object.entries(props)
                    .map(([key, value]) => `- **${key}:** ${value}`)
                    .join('\n')
                } else if (Array.isArray(props)) {
                  propsDisplay = props.map((prop: string) => `- ${prop}`).join('\n')
                } else {
                  propsDisplay = String(props)
                }
              } catch (e) {
                propsDisplay = String(item.properties)
              }
            }

            return {
              id: item.id,
              campaign_id: campaign.id,
              user_id: item.user_id || '',
              section: 'items',
              subsection: null,
              title: item.name,
              content: `**Rarity:** ${item.rarity || 'N/A'}\n**Type:** ${item.type || 'N/A'}\n${item.value ? `**Value:** ${item.value} gp\n` : ''}${item.weight ? `**Weight:** ${item.weight} lbs\n` : ''}${item.attunement ? '**Requires Attunement**\n' : ''}\n**Description:**\n${item.description || 'N/A'}${propsDisplay ? `\n\n**Properties:**\n${propsDisplay}` : ''}${item.origin ? `\n\n**Origin:**\n${item.origin}` : ''}${item.previous_owner ? `\n\n**Previous Owner:**\n${item.previous_owner}` : ''}${item.complication ? `\n\n**Complication:**\n${item.complication}` : ''}`,
              type: (item.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
              created_at: item.created_at,
              updated_at: item.created_at,
            }
          })
        }
      } else if (effectiveSection === 'monsters') {
        const response = await authFetch(getApiUrl(`/monsters?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const monsters = Array.isArray(data) ? data : data?.monsters || []
          if (Array.isArray(monsters)) {
            content = monsters.map((monster: any) => {
              // Parse stats if it's a JSON string
              let statsDisplay = ''
              if (monster.stats) {
                try {
                  const stats =
                    typeof monster.stats === 'string' ? JSON.parse(monster.stats) : monster.stats

                  // Format monster stat block
                  if (stats.size && stats.type) {
                    statsDisplay += `\n\n*${stats.size} ${stats.type}*\n`
                  }

                  if (stats.armor_class) statsDisplay += `\n**Armor Class:** ${stats.armor_class}`
                  if (stats.hit_points) statsDisplay += `\n**Hit Points:** ${stats.hit_points}`

                  if (stats.speed) {
                    const speeds = Object.entries(stats.speed)
                      .map(([type, val]) => `${type} ${val} ft.`)
                      .join(', ')
                    statsDisplay += `\n**Speed:** ${speeds}`
                  }

                  // Format abilities
                  if (stats.abilities) {
                    const abs = stats.abilities
                    const mod = (score: number) => Math.floor((score - 10) / 2)
                    const sign = (val: number) => (val >= 0 ? `+${val}` : val)
                    statsDisplay += `\n\n**Ability Scores:**\n`
                    statsDisplay += `STR ${abs.STR || 10} (${sign(mod(abs.STR || 10))}) | `
                    statsDisplay += `DEX ${abs.DEX || 10} (${sign(mod(abs.DEX || 10))}) | `
                    statsDisplay += `CON ${abs.CON || 10} (${sign(mod(abs.CON || 10))})\n`
                    statsDisplay += `INT ${abs.INT || 10} (${sign(mod(abs.INT || 10))}) | `
                    statsDisplay += `WIS ${abs.WIS || 10} (${sign(mod(abs.WIS || 10))}) | `
                    statsDisplay += `CHA ${abs.CHA || 10} (${sign(mod(abs.CHA || 10))})`
                  }

                  if (stats.traits && stats.traits.length > 0) {
                    statsDisplay += `\n\n**Traits:**\n`
                    stats.traits.forEach((trait: any, idx: number) => {
                      if (idx > 0) statsDisplay += `\n`
                      statsDisplay += `\n&nbsp;&nbsp;*${trait.name}.* ${trait.description}`
                    })
                  }

                  if (stats.actions && stats.actions.length > 0) {
                    statsDisplay += `\n\n**Actions:**\n`
                    stats.actions.forEach((action: any, idx: number) => {
                      if (idx > 0) statsDisplay += `\n`
                      statsDisplay += `\n&nbsp;&nbsp;*${action.name}.* ${action.description}`
                    })
                  }

                  if (stats.legendary_actions && stats.legendary_actions.length > 0) {
                    statsDisplay += `\n\n**Legendary Actions:**\n`
                    stats.legendary_actions.forEach((action: any, idx: number) => {
                      if (idx > 0) statsDisplay += `\n`
                      statsDisplay += `\n&nbsp;&nbsp;*${action.name}.* ${action.description}`
                    })
                  }
                } catch (e) {
                  statsDisplay = `\n\n**Stats:**\n${monster.stats}`
                }
              }

              return {
                id: monster.id,
                campaign_id: campaign.id,
                user_id: monster.user_id || '',
                section: 'monsters',
                subsection: null,
                title: monster.name,
                content: `**Challenge Rating:** ${monster.cr || 'N/A'}${statsDisplay}\n\n**Lore:**\n${monster.lore || 'N/A'}${monster.tactics ? `\n\n**Tactics:**\n${monster.tactics}` : ''}`,
                type: (monster.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
                created_at: monster.created_at,
                updated_at: monster.created_at,
              }
            })
          } else {
            logger.error('[CampaignToolkit] Monsters API returned non-array:', data)
            logger.error('[CampaignToolkit] monsters value:', monsters)
            content = []
          }
        }
      } else if (effectiveSection === 'encounters') {
        const response = await authFetch(getApiUrl(`/encounters?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const encounters = Array.isArray(data) ? data : data?.encounters || []
          content = encounters.map((encounter: any) => {
            // Format Creatures
            let creaturesDisplay = ''
            if (encounter.creatures) {
              try {
                const creatures =
                  typeof encounter.creatures === 'string'
                    ? JSON.parse(encounter.creatures)
                    : encounter.creatures
                if (Array.isArray(creatures)) {
                  creaturesDisplay = creatures
                    .map(
                      (c: any) =>
                        `- **${c.count}x ${c.name}** (CR ${c.cr}${c.role ? `, ${c.role}` : ''})${c.tactics ? `\n  _Tactics:_ ${c.tactics}` : ''}`
                    )
                    .join('\n')
                } else {
                  creaturesDisplay = JSON.stringify(creatures, null, 2)
                }
              } catch (e) {
                creaturesDisplay = String(encounter.creatures)
              }
            }

            // Format Environment (multi-line, indented, each bullet on its own line)
            let environmentDisplay = ''
            if (encounter.environment) {
              try {
                const env =
                  typeof encounter.environment === 'string'
                    ? JSON.parse(encounter.environment)
                    : encounter.environment
                let envLines = []
                if (env.setting) envLines.push(`- **Setting:** ${env.setting}`)
                if (env.features && Array.isArray(env.features) && env.features.length > 0)
                  envLines.push(`- **Features:** ${env.features.join(', ')}`)
                if (env.lighting) envLines.push(`- **Lighting:** ${env.lighting}`)
                environmentDisplay = envLines.length > 0 ? envLines.join('\n') : ''
              } catch (e) {
                environmentDisplay = String(encounter.environment)
              }
            }

            // Format Treasure
            let treasureDisplay = ''
            if (encounter.treasure) {
              try {
                const treasure =
                  typeof encounter.treasure === 'string'
                    ? JSON.parse(encounter.treasure)
                    : encounter.treasure
                let treasureParts = []
                if (treasure.coins && typeof treasure.coins === 'object') {
                  const coins = Object.entries(treasure.coins)
                    .map(([k, v]) => `${v} ${k}`)
                    .join(', ')
                  if (coins) treasureParts.push(`_Coins:_ ${coins}`)
                }
                if (treasure.items && Array.isArray(treasure.items) && treasure.items.length > 0) {
                  treasureParts.push(`_Items:_ ${treasure.items.join(', ')}`)
                }
                treasureDisplay = treasureParts.join(' | ')
              } catch (e) {
                treasureDisplay = String(encounter.treasure)
              }
            }

            return {
              id: encounter.id,
              campaign_id: campaign.id,
              user_id: encounter.user_id || '',
              section: 'encounters',
              subsection: null,
              title: encounter.name,
              content: `**Difficulty:** ${encounter.difficulty || 'N/A'}  \\n**Party Level:** ${encounter.party_level || 'N/A'}  \\n**Party Size:** ${encounter.party_size || 'N/A'}  \\n${encounter.xp_total !== undefined ? `**XP Total:** ${encounter.xp_total}  \\n` : ''}${encounter.xp_per_player !== undefined ? `**XP per Player:** ${encounter.xp_per_player}  \\n` : ''}\\n**Description:**\n${encounter.description || 'N/A'}${creaturesDisplay ? `\n\n**Creatures:**\n${creaturesDisplay}` : ''}${environmentDisplay ? `\n\n**Environment:**\n${environmentDisplay}` : ''}${treasureDisplay ? `\n\n**Treasure:**\n${treasureDisplay}` : ''}${encounter.notes ? `\n\n**Notes:**\n${encounter.notes}` : ''}`,
              type: (encounter.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
              created_at: encounter.created_at,
              updated_at: encounter.created_at,
            }
          })
        }
      } else if (effectiveSection === 'dialogues') {
        const response = await authFetch(getApiUrl(`/dialogues?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const dialogues = Array.isArray(data) ? data : data?.dialogues || []
          content = dialogues.map((dialogue: any) => {
            let treeDisplay = ''
            let checksDisplay = ''
            let infoDisplay = ''

            // Format dialogue tree
            if (dialogue.dialogue_tree) {
              try {
                const tree =
                  typeof dialogue.dialogue_tree === 'string'
                    ? JSON.parse(dialogue.dialogue_tree)
                    : dialogue.dialogue_tree

                // Format dialogue options
                const options = ['friendly', 'neutral', 'hostile']
                const optionLines = options
                  .filter((opt) => tree[opt])
                  .map((opt) => {
                    const option = tree[opt]
                    return `**${opt.charAt(0).toUpperCase() + opt.slice(1)}:**\n- *Player:* ${option.player_option || 'N/A'}\n- *NPC Response:* ${option.npc_response || 'N/A'}\n- *Outcome:* ${option.outcome || 'N/A'}`
                  })
                treeDisplay = optionLines.join('\n\n')
              } catch (e) {
                treeDisplay = String(dialogue.dialogue_tree)
              }
            }

            // Format skill checks
            if (dialogue.skill_checks) {
              try {
                const checks =
                  typeof dialogue.skill_checks === 'string'
                    ? JSON.parse(dialogue.skill_checks)
                    : dialogue.skill_checks

                if (Array.isArray(checks)) {
                  checksDisplay = checks
                    .map(
                      (check: any) =>
                        `- **${check.skill}** (DC ${check.dc})\n  - *Success:* ${check.success}\n  - *Failure:* ${check.failure}`
                    )
                    .join('\n')
                } else {
                  checksDisplay = String(checks)
                }
              } catch (e) {
                checksDisplay = String(dialogue.skill_checks)
              }
            }

            // Format information revealed
            if (dialogue.information) {
              try {
                const info =
                  typeof dialogue.information === 'string'
                    ? JSON.parse(dialogue.information)
                    : dialogue.information

                if (Array.isArray(info)) {
                  infoDisplay = info.map((item: string) => `- ${item}`).join('\n')
                } else {
                  infoDisplay = String(info)
                }
              } catch (e) {
                infoDisplay = String(dialogue.information)
              }
            }

            return {
              id: dialogue.id,
              campaign_id: campaign.id,
              user_id: dialogue.user_id || '',
              section: 'dialogues',
              subsection: null,
              title: dialogue.scene_setting || dialogue.character_name || 'Dialogue',
              content: `**Character:** ${dialogue.character_name || 'N/A'}${dialogue.scene_setting ? `\n**Scene:** ${dialogue.scene_setting}` : ''}${dialogue.mood ? `\n**Mood:** ${dialogue.mood}` : ''}${treeDisplay ? `\n\n**Dialogue Options:**\n${treeDisplay}` : ''}${checksDisplay ? `\n\n**Skill Checks:**\n${checksDisplay}` : ''}${infoDisplay ? `\n\n**Information Revealed:**\n${infoDisplay}` : ''}`,
              type: (dialogue.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
              created_at: dialogue.created_at,
              updated_at: dialogue.created_at,
            }
          })
        }
      } else if (effectiveSection === 'rumors') {
        const response = await authFetch(getApiUrl(`/rumors?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const rumors = Array.isArray(data) ? data : data?.rumors || []
          content = rumors.map((rumor: any) => ({
            id: rumor.id,
            campaign_id: campaign.id,
            user_id: rumor.user_id || '',
            section: 'rumors',
            subsection: null,
            title: rumor.source || 'Rumor',
            content:
              `${rumor.source ? `**Source:** ${rumor.source}  \n` : ''}` +
              `${rumor.veracity ? `**Veracity:** ${rumor.veracity}  \n` : ''}` +
              `${rumor.context ? `**Context:** ${rumor.context}  \n` : ''}` +
              (rumor.leads_to ? `**Leads To:** ${rumor.leads_to}  \n` : '') +
              `\n**Text:** ${rumor.text || rumor.content || ''}`,
            type: (rumor.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
            created_at: rumor.created_at,
            updated_at: rumor.created_at,
          }))
        }
      } else if (effectiveSection === 'locations') {
        const response = await authFetch(getApiUrl(`/locations?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const locations = Array.isArray(data) ? data : data?.locations || []
          content = locations.map((location: any) => {
            const formatArrayField = (field: any) => {
              if (!field) return ''
              try {
                const parsed = typeof field === 'string' ? JSON.parse(field) : field
                if (Array.isArray(parsed)) {
                  return parsed.map((item: string) => `- ${item}`).join('\n')
                }
                return String(parsed)
              } catch (e) {
                return String(field)
              }
            }

            const formatObjectField = (field: any) => {
              if (!field) return ''
              try {
                const parsed = typeof field === 'string' ? JSON.parse(field) : field
                if (Array.isArray(parsed)) {
                  return parsed.map((item: string) => `- ${item}`).join('\n')
                } else if (typeof parsed === 'object') {
                  return Object.entries(parsed)
                    .map(([key, value]) => `- **${key}:** ${value}`)
                    .join('\n')
                }
                return String(parsed)
              } catch (e) {
                return String(field)
              }
            }

            return {
              id: location.id,
              campaign_id: campaign.id,
              user_id: location.user_id || '',
              section: 'locations',
              subsection: null,
              title: location.name,
              content: `**Type:** ${location.type || 'N/A'}${location.theme ? `\n**Theme:** ${location.theme}` : ''}\n\n**Description:**\n${location.description || 'N/A'}${location.features ? `\n\n**Features:**\n${formatArrayField(location.features)}` : ''}${location.secrets ? `\n\n**Secrets:**\n${formatArrayField(location.secrets)}` : ''}${location.factions ? `\n\n**Factions:**\n${formatObjectField(location.factions)}` : ''}${location.npcs ? `\n\n**NPCs:**\n${formatObjectField(location.npcs)}` : ''}${location.encounters ? `\n\n**Encounters:**\n${formatObjectField(location.encounters)}` : ''}${location.map ? `\n\n**Map:**\n${location.map}` : ''}`,
              type: (location.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
              created_at: location.created_at,
              updated_at: location.created_at,
              // Store full location data for treasure display
              locationData: location,
            }
          })
        }
      } else if (effectiveSection === 'quests') {
        const response = await authFetch(getApiUrl(`/quests?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const quests = Array.isArray(data) ? data : data?.quests || []
          content = quests.map((quest: any) => {
            const formatArrayOrObject = (field: any) => {
              if (!field) return ''
              try {
                const parsed = typeof field === 'string' ? JSON.parse(field) : field
                if (Array.isArray(parsed)) {
                  return parsed
                    .map((item: any) => {
                      if (typeof item === 'string') return `- ${item}`
                      if (typeof item === 'object') {
                        // Format objects within arrays
                        return Object.entries(item)
                          .map(([key, value]) => `- **${key}:** ${value}`)
                          .join('\n')
                      }
                      return `- ${String(item)}`
                    })
                    .join('\n')
                } else if (typeof parsed === 'object') {
                  return Object.entries(parsed)
                    .map(([key, value]) => `- **${key}:** ${value}`)
                    .join('\n')
                }
                return String(parsed)
              } catch (e) {
                return String(field)
              }
            }

            return {
              id: quest.id,
              campaign_id: campaign.id,
              user_id: quest.user_id || '',
              section: 'quests',
              subsection: null,
              title: quest.title || quest.name,
              content: `**Status:** ${quest.status || 'N/A'}\n**Type:** ${quest.type || 'N/A'}${quest.category ? `\n**Category:** ${quest.category}` : ''}${quest.party_level ? `\n**Party Level:** ${quest.party_level}` : ''}${quest.faction_alignment ? `\n**Faction:** ${quest.faction_alignment}` : ''}${quest.time_limit ? `\n**Time Limit:** ${quest.time_limit}` : ''}${quest.combat_intensity ? `\n**Combat Intensity:** ${quest.combat_intensity}` : ''}\n\n**Description:**\n${quest.description || 'N/A'}${quest.objectives ? `\n\n**Objectives:**\n${formatArrayOrObject(quest.objectives)}` : ''}${quest.rewards ? `\n\n**Rewards:**\n${formatArrayOrObject(quest.rewards)}` : ''}${quest.complications ? `\n\n**Complications:**\n${formatArrayOrObject(quest.complications)}` : ''}${quest.npcs_involved ? `\n\n**NPCs Involved:**\n${formatArrayOrObject(quest.npcs_involved)}` : ''}${quest.locations_involved ? `\n\n**Locations:**\n${formatArrayOrObject(quest.locations_involved)}` : ''}`,
              type: (quest.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
              created_at: quest.created_at,
              updated_at: quest.created_at,
            }
          })
        }
      } else if (effectiveSection === 'taverns') {
        const response = await authFetch(getApiUrl(`/taverns?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const taverns = Array.isArray(data) ? data : data?.taverns || []
          content = taverns.map((tavern: any) => {
            // Format menu food items
            let menuFoodDisplay = ''
            if (tavern.menu_food) {
              try {
                const food =
                  typeof tavern.menu_food === 'string'
                    ? JSON.parse(tavern.menu_food)
                    : tavern.menu_food
                if (Array.isArray(food)) {
                  menuFoodDisplay = food
                    .map((item: any) => {
                      if (typeof item === 'string') return `- ${item}`
                      return `- **${item.name}** (${item.price})${item.description ? `: ${item.description}` : ''}`
                    })
                    .join('\n')
                }
              } catch (e) {
                menuFoodDisplay = String(tavern.menu_food)
              }
            }

            // Format menu drinks items
            let menuDrinksDisplay = ''
            if (tavern.menu_drinks) {
              try {
                const drinks =
                  typeof tavern.menu_drinks === 'string'
                    ? JSON.parse(tavern.menu_drinks)
                    : tavern.menu_drinks
                if (Array.isArray(drinks)) {
                  menuDrinksDisplay = drinks
                    .map((item: any) => {
                      if (typeof item === 'string') return `- ${item}`
                      return `- **${item.name}** (${item.price})${item.description ? `: ${item.description}` : ''}`
                    })
                    .join('\n')
                }
              } catch (e) {
                menuDrinksDisplay = String(tavern.menu_drinks)
              }
            }

            // Format accommodations/rooms
            let accommodationsDisplay = ''
            if (tavern.rooms) {
              try {
                const accommodations =
                  typeof tavern.rooms === 'string' ? JSON.parse(tavern.rooms) : tavern.rooms
                if (Array.isArray(accommodations)) {
                  accommodationsDisplay = accommodations
                    .map((room: any) => {
                      if (typeof room === 'string') return `- ${room}`
                      return `- **${room.type || room.name}** (${room.price}${room.available ? `, ${room.available} available` : ''})${room.description || room.details ? `: ${room.description || room.details}` : ''}`
                    })
                    .join('\n')
                }
              } catch (e) {
                accommodationsDisplay = String(tavern.rooms)
              }
            }

            // Format patrons
            let patronsDisplay = ''
            if (tavern.patrons) {
              try {
                const patrons =
                  typeof tavern.patrons === 'string' ? JSON.parse(tavern.patrons) : tavern.patrons
                if (Array.isArray(patrons)) {
                  patronsDisplay = patrons
                    .map((patron: any) => {
                      if (typeof patron === 'string') return `- ${patron}`
                      let line = `- **${patron.name}**`
                      if (patron.race) line += ` (${patron.race})`
                      if (patron.description) line += `: ${patron.description}`
                      if (patron.hook) line += `\n  💡 ${patron.hook}`
                      return line
                    })
                    .join('\n')
                }
              } catch (e) {
                patronsDisplay = String(tavern.patrons)
              }
            }

            // Format events
            let eventsDisplay = ''
            if (tavern.events) {
              try {
                const events =
                  typeof tavern.events === 'string' ? JSON.parse(tavern.events) : tavern.events
                if (Array.isArray(events)) {
                  eventsDisplay = events
                    .map((event: any) => {
                      if (typeof event === 'string') return `- ${event}`
                      return `- ${event.description || event.name || event}`
                    })
                    .join('\n')
                }
              } catch (e) {
                eventsDisplay = String(tavern.events)
              }
            }

            // Format rumors
            let rumorsDisplay = ''
            if (tavern.rumors) {
              try {
                const rumors =
                  typeof tavern.rumors === 'string' ? JSON.parse(tavern.rumors) : tavern.rumors
                if (Array.isArray(rumors)) {
                  rumorsDisplay = rumors
                    .map((rumor: any) => {
                      if (typeof rumor === 'string') return `- ${rumor}`
                      return `- ${rumor.text || rumor.description || rumor}`
                    })
                    .join('\n')
                }
              } catch (e) {
                rumorsDisplay = String(tavern.rumors)
              }
            }

            // Build keeper section
            let keeperDisplay = ''
            if (tavern.keeper_name || tavern.keeper_personality || tavern.keeper_description) {
              keeperDisplay = '\n\n**The Keeper:**\n'
              if (tavern.keeper_name) keeperDisplay += `**${tavern.keeper_name}**\n`
              if (tavern.keeper_personality) keeperDisplay += `_${tavern.keeper_personality}_\n`
              if (tavern.keeper_description) keeperDisplay += `${tavern.keeper_description}\n`
            }

            return {
              id: tavern.id,
              campaign_id: campaign.id,
              user_id: tavern.user_id || '',
              section: 'taverns',
              subsection: null,
              title: tavern.name,
              content: `**Atmosphere:** ${tavern.atmosphere || 'N/A'}${tavern.description ? `\n${tavern.description}` : ''}${keeperDisplay}${menuFoodDisplay || menuDrinksDisplay ? `\n\n**Menu:**\n${menuFoodDisplay ? `\nFood:\n${menuFoodDisplay}` : ''}${menuDrinksDisplay ? `\n\nDrinks:\n${menuDrinksDisplay}` : ''}` : ''}${accommodationsDisplay ? `\n\n**Accommodations:**\n${accommodationsDisplay}` : ''}${patronsDisplay ? `\n\n**Notable Patrons:**\n${patronsDisplay}` : ''}${eventsDisplay ? `\n\n**Current Events:**\n${eventsDisplay}` : ''}${rumorsDisplay ? `\n\n**Rumors & Gossip:**\n${rumorsDisplay}` : ''}${tavern.special_notes ? `\n\n**Special Notes:**\n${tavern.special_notes}` : ''}`,
              type: (tavern.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
              created_at: tavern.created_at,
              updated_at: tavern.created_at,
            }
          })
        }
      } else if (effectiveSection === 'merchants') {
        const response = await authFetch(getApiUrl(`/merchants?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const merchants = Array.isArray(data) ? data : data?.merchants || []
          content = merchants.map((merchant: any) => {
            // Format inventory items
            let inventoryDisplay = ''
            if (merchant.inventory) {
              try {
                const inventory =
                  typeof merchant.inventory === 'string'
                    ? JSON.parse(merchant.inventory)
                    : merchant.inventory
                if (Array.isArray(inventory)) {
                  inventoryDisplay = inventory
                    .map((item: any) => {
                      if (typeof item === 'string') return `- ${item}`
                      return `- **${item.name}** (${item.price})${item.quantity ? ` - Stock: ${item.quantity}` : ''}${item.description ? `: ${item.description}` : ''}`
                    })
                    .join('\n')
                }
              } catch (e) {
                inventoryDisplay = String(merchant.inventory)
              }
            }

            // Format services
            let servicesDisplay = ''
            if (merchant.services) {
              try {
                const services =
                  typeof merchant.services === 'string'
                    ? JSON.parse(merchant.services)
                    : merchant.services
                if (Array.isArray(services)) {
                  servicesDisplay = services
                    .map((service: any) => {
                      if (typeof service === 'string') return `- ${service}`
                      return `- **${service.name}** (${service.price})${service.description ? `: ${service.description}` : ''}`
                    })
                    .join('\n')
                }
              } catch (e) {
                servicesDisplay = String(merchant.services)
              }
            }

            // Format special items
            let specialItemsDisplay = ''
            if (merchant.special_items) {
              try {
                const specialItems =
                  typeof merchant.special_items === 'string'
                    ? JSON.parse(merchant.special_items)
                    : merchant.special_items
                if (Array.isArray(specialItems)) {
                  specialItemsDisplay = specialItems
                    .map((item: any) => {
                      if (typeof item === 'string') return `- ${item}`
                      return `- **${item.name}** (${item.price})${item.description ? `: ${item.description}` : ''}`
                    })
                    .join('\n')
                }
              } catch (e) {
                specialItemsDisplay = String(merchant.special_items)
              }
            }

            // Format rumors
            let rumorsDisplay = ''
            if (merchant.rumors) {
              try {
                const rumors =
                  typeof merchant.rumors === 'string'
                    ? JSON.parse(merchant.rumors)
                    : merchant.rumors
                if (Array.isArray(rumors)) {
                  rumorsDisplay = rumors
                    .map((r: any) => `- ${typeof r === 'string' ? r : r.text || r.rumor || r}`)
                    .join('\n')
                }
              } catch (e) {
                rumorsDisplay = String(merchant.rumors)
              }
            }

            // Format recently sold
            let recentlySoldDisplay = ''
            if (merchant.recently_sold) {
              try {
                const recentlySold =
                  typeof merchant.recently_sold === 'string'
                    ? JSON.parse(merchant.recently_sold)
                    : merchant.recently_sold
                if (Array.isArray(recentlySold)) {
                  recentlySoldDisplay = recentlySold
                    .map(
                      (item: any) =>
                        `- ${typeof item === 'string' ? item : item.description || item}`
                    )
                    .join('\n')
                }
              } catch (e) {
                recentlySoldDisplay = String(merchant.recently_sold)
              }
            }

            // Owner display
            const ownerDisplay = merchant.owner_name
              ? `\n\n**Owner:** ${merchant.owner_name}${merchant.owner_personality ? ` (${merchant.owner_personality})` : ''}${merchant.owner_description ? `\n${merchant.owner_description}` : ''}${merchant.haggle_willingness ? `\nHaggling: ${merchant.haggle_willingness}` : ''}`
              : ''

            return {
              id: merchant.id,
              campaign_id: campaign.id,
              user_id: merchant.user_id || '',
              section: 'merchants',
              subsection: null,
              title: merchant.name,
              content: `**Type:** ${merchant.shop_type || 'N/A'}${merchant.location ? `\n**Location:** ${merchant.location}` : ''}\n\n**Atmosphere:** ${merchant.atmosphere || 'N/A'}${merchant.description ? `\n${merchant.description}` : ''}${ownerDisplay}${inventoryDisplay ? `\n\n**Inventory:**\n${inventoryDisplay}` : ''}${servicesDisplay ? `\n\n**Services:**\n${servicesDisplay}` : ''}${specialItemsDisplay ? `\n\n**Special Items:**\n${specialItemsDisplay}` : ''}${recentlySoldDisplay ? `\n\n**Recently Sold:**\n${recentlySoldDisplay}` : ''}${rumorsDisplay ? `\n\n**Rumors:**\n${rumorsDisplay}` : ''}${merchant.special_notes ? `\n\n**Special Notes:**\n${merchant.special_notes}` : ''}`,
              type: (merchant.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
              created_at: merchant.created_at,
              updated_at: merchant.created_at,
            }
          })
        }
      } else if (effectiveSection === 'traps') {
        const response = await authFetch(getApiUrl(`/traps?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const traps = Array.isArray(data) ? data : data?.traps || []
          content = traps.map((trap: any) => {
            // Format detection
            let detectionDisplay = ''
            if (trap.detection) {
              try {
                const detection =
                  typeof trap.detection === 'string' ? JSON.parse(trap.detection) : trap.detection
                if (detection.passive_perception_dc || detection.investigation_dc) {
                  detectionDisplay = `\n\n**Detection:**\n${detection.passive_perception_dc ? `- Passive Perception DC: ${detection.passive_perception_dc}\n` : ''}${detection.investigation_dc ? `- Investigation DC: ${detection.investigation_dc}\n` : ''}`
                  if (detection.clues && Array.isArray(detection.clues)) {
                    detectionDisplay += `**Clues:**\n${detection.clues.map((clue: string) => `- ${clue}`).join('\n')}`
                  }
                }
              } catch (e) {
                detectionDisplay = ''
              }
            }

            // Format solution paths
            let solutionPathsDisplay = ''
            if (trap.solution_paths) {
              try {
                const paths =
                  typeof trap.solution_paths === 'string'
                    ? JSON.parse(trap.solution_paths)
                    : trap.solution_paths
                if (Array.isArray(paths)) {
                  solutionPathsDisplay = paths
                    .map(
                      (path: any) =>
                        `- **${path.approach}** (${path.skill} DC ${path.dc}): ${path.description}${path.time ? `\n  Time: ${path.time}` : ''}${path.failure ? `\n  On Failure: ${path.failure}` : ''}`
                    )
                    .join('\n')
                }
              } catch (e) {
                solutionPathsDisplay = ''
              }
            }

            // Format complications
            let complicationsDisplay = ''
            if (trap.complications) {
              try {
                const complications =
                  typeof trap.complications === 'string'
                    ? JSON.parse(trap.complications)
                    : trap.complications
                if (Array.isArray(complications)) {
                  complicationsDisplay = complications.map((comp: string) => `- ${comp}`).join('\n')
                }
              } catch (e) {
                complicationsDisplay = ''
              }
            }

            // Format rewards
            let rewardsDisplay = ''
            if (trap.rewards) {
              try {
                const rewards =
                  typeof trap.rewards === 'string' ? JSON.parse(trap.rewards) : trap.rewards
                if (Array.isArray(rewards)) {
                  rewardsDisplay = rewards.map((reward: string) => `- ${reward}`).join('\n')
                }
              } catch (e) {
                rewardsDisplay = ''
              }
            }

            // Format scaling
            let scalingDisplay = ''
            if (trap.scaling) {
              try {
                const scaling =
                  typeof trap.scaling === 'string' ? JSON.parse(trap.scaling) : trap.scaling
                if (scaling.easier || scaling.harder) {
                  scalingDisplay = `\n\n**Scaling:**${scaling.easier ? `\n- Easier: ${scaling.easier}` : ''}${scaling.harder ? `\n- Harder: ${scaling.harder}` : ''}`
                }
              } catch (e) {
                scalingDisplay = ''
              }
            }

            return {
              id: trap.id,
              campaign_id: campaign.id,
              user_id: trap.user_id || '',
              section: 'traps',
              subsection: null,
              title: trap.name,
              content: `**Type:** ${trap.trap_type || 'N/A'}${trap.difficulty ? ` | **Difficulty:** ${trap.difficulty}` : ''}${trap.environment ? ` | **Environment:** ${trap.environment}` : ''}\n\n${trap.description ? `**Description:**\n${trap.description}\n\n` : ''}${trap.trigger ? `**Trigger:**\n${trap.trigger}\n\n` : ''}${trap.effect ? `**Effect:** ${trap.effect}` : ''}${trap.damage ? ` | **Damage:** ${trap.damage}` : ''}${detectionDisplay}${solutionPathsDisplay ? `\n\n**Solution Paths:**\n${solutionPathsDisplay}` : ''}${complicationsDisplay ? `\n\n**Complications:**\n${complicationsDisplay}` : ''}${rewardsDisplay ? `\n\n**Rewards:**\n${rewardsDisplay}` : ''}${scalingDisplay}${trap.dm_notes ? `\n\n**DM Notes:**\n${trap.dm_notes}` : ''}`,
              type: (trap.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
              created_at: trap.created_at,
              updated_at: trap.created_at,
            }
          })
        }
      } else if (effectiveSection === 'critters') {
        const response = await authFetch(getApiUrl(`/critters?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const critters = Array.isArray(data) ? data : data?.critters || []
          content = critters.map((critter: any) => {
            // Parse JSON fields
            let statsDisplay = ''
            if (critter.stats) {
              try {
                const stats =
                  typeof critter.stats === 'string' ? JSON.parse(critter.stats) : critter.stats
                const statParts = []
                if (stats.ac !== undefined) statParts.push(`**AC:** ${stats.ac}`)
                if (stats.hp !== undefined) statParts.push(`**HP:** ${stats.hp}`)
                if (stats.speed) statParts.push(`**Speed:** ${stats.speed}`)
                if (statParts.length > 0) {
                  statsDisplay = `\n\n${statParts.join(' | ')}`
                }

                // Ability scores
                const abilities = []
                if (stats.str !== undefined) abilities.push(`STR ${stats.str}`)
                if (stats.dex !== undefined) abilities.push(`DEX ${stats.dex}`)
                if (stats.con !== undefined) abilities.push(`CON ${stats.con}`)
                if (stats.int !== undefined) abilities.push(`INT ${stats.int}`)
                if (stats.wis !== undefined) abilities.push(`WIS ${stats.wis}`)
                if (stats.cha !== undefined) abilities.push(`CHA ${stats.cha}`)
                if (abilities.length > 0) {
                  statsDisplay += `\n${abilities.join(' | ')}`
                }
              } catch (e) {
                statsDisplay = ''
              }
            }

            // Format special abilities
            let abilitiesDisplay = ''
            if (critter.special_abilities) {
              try {
                const abilities =
                  typeof critter.special_abilities === 'string'
                    ? JSON.parse(critter.special_abilities)
                    : critter.special_abilities
                if (Array.isArray(abilities) && abilities.length > 0) {
                  abilitiesDisplay =
                    '\n\n**Special Abilities:**\n' +
                    abilities
                      .map((ability: any) => `- **${ability.name}:** ${ability.description}`)
                      .join('\n')
                }
              } catch (e) {
                abilitiesDisplay = ''
              }
            }

            // Format uses
            let usesDisplay = ''
            if (critter.uses) {
              try {
                const uses =
                  typeof critter.uses === 'string' ? JSON.parse(critter.uses) : critter.uses
                if (Array.isArray(uses) && uses.length > 0) {
                  usesDisplay =
                    '\n\n**Potential Uses:**\n' + uses.map((use: string) => `- ${use}`).join('\n')
                }
              } catch (e) {
                usesDisplay = ''
              }
            }

            // Format interesting facts
            let factsDisplay = ''
            if (critter.interesting_facts) {
              try {
                const facts =
                  typeof critter.interesting_facts === 'string'
                    ? JSON.parse(critter.interesting_facts)
                    : critter.interesting_facts
                if (Array.isArray(facts) && facts.length > 0) {
                  factsDisplay =
                    '\n\n**Interesting Facts:**\n' +
                    facts.map((fact: string) => `- ${fact}`).join('\n')
                }
              } catch (e) {
                factsDisplay = ''
              }
            }

            return {
              id: critter.id,
              campaign_id: campaign.id,
              user_id: critter.user_id || '',
              section: 'critters',
              subsection: null,
              title: critter.name,
              content: `${critter.species ? `_${critter.species}_\n\n` : ''}**Type:** ${critter.critter_type || 'N/A'} | **Size:** ${critter.size}${critter.temperament ? ` | **Temperament:** ${critter.temperament}` : ''}${critter.habitat ? ` | **Habitat:** ${critter.habitat}` : ''}\n\n${critter.description ? `**Description:**\n${critter.description}\n\n` : ''}${critter.behavior ? `**Behavior:**\n${critter.behavior}\n\n` : ''}${statsDisplay}${abilitiesDisplay}${usesDisplay}${critter.training_difficulty ? `\n\n**Training Difficulty:** ${critter.training_difficulty}` : ''}${critter.diet ? ` | **Diet:** ${critter.diet}` : ''}${critter.lifespan ? ` | **Lifespan:** ${critter.lifespan}` : ''}${factsDisplay}${critter.encounter_notes ? `\n\n**Encounter Notes:**\n${critter.encounter_notes}` : ''}`,
              type: (critter.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
              created_at: critter.created_at,
              updated_at: critter.created_at,
            }
          })
        }
      } else if (effectiveSection === 'chases') {
        const response = await authFetch(getApiUrl(`/chases?campaign_id=${campaign.id}`))
        if (response.ok) {
          const data = await response.json()
          const chases = Array.isArray(data) ? data : data?.chases || []
          content = chases.map((chase: any) => {
            // Format obstacles
            let obstaclesDisplay = ''
            if (chase.obstacles) {
              try {
                const obstacles =
                  typeof chase.obstacles === 'string'
                    ? JSON.parse(chase.obstacles)
                    : chase.obstacles
                if (Array.isArray(obstacles) && obstacles.length > 0) {
                  obstaclesDisplay =
                    '\n\n**Obstacles:**\n' +
                    obstacles
                      .map(
                        (o: any) =>
                          `- **${o.name}:** ${o.description}\n  - **Check:** ${o.check || o.skill_check || 'N/A'}\n  - **Failure:** ${o.failure || o.failure_consequence || 'N/A'}`
                      )
                      .join('\n')
                }
              } catch (e) {
                obstaclesDisplay = ''
              }
            }

            // Format participants
            let participantsDisplay = ''
            if (chase.participants) {
              try {
                const participants =
                  typeof chase.participants === 'string'
                    ? JSON.parse(chase.participants)
                    : chase.participants
                if (participants.quarry) {
                  participantsDisplay += `\n\n**Quarry:** ${participants.quarry}`
                }
                if (participants.pursuers) {
                  participantsDisplay += `\n**Pursuers:** ${participants.pursuers}`
                }
              } catch (e) {
                participantsDisplay = ''
              }
            }

            // Format shortcuts
            let shortcutsDisplay = ''
            if (chase.shortcuts) {
              try {
                const shortcuts =
                  typeof chase.shortcuts === 'string'
                    ? JSON.parse(chase.shortcuts)
                    : chase.shortcuts
                if (Array.isArray(shortcuts) && shortcuts.length > 0) {
                  shortcutsDisplay =
                    '\n\n**Shortcuts & Alternate Routes:**\n' +
                    shortcuts
                      .map(
                        (s: any) =>
                          `- **${s.name}:** ${s.description}\n  - **Benefit:** ${s.benefit || 'N/A'}`
                      )
                      .join('\n')
                }
              } catch (e) {
                shortcutsDisplay = ''
              }
            }

            // Format chase phases
            let phasesDisplay = ''
            if (chase.chase_phases) {
              try {
                const phases =
                  typeof chase.chase_phases === 'string'
                    ? JSON.parse(chase.chase_phases)
                    : chase.chase_phases
                if (Array.isArray(phases) && phases.length > 0) {
                  phasesDisplay =
                    '\n\n**Chase Phases:**\n' +
                    phases
                      .map((p: any) => `- **${p.round}** (${p.difficulty}): ${p.description}`)
                      .join('\n')
                }
              } catch (e) {
                phasesDisplay = ''
              }
            }

            // Format environmental factors
            let environmentalDisplay = ''
            if (chase.environmental_factors) {
              try {
                const factors =
                  typeof chase.environmental_factors === 'string'
                    ? JSON.parse(chase.environmental_factors)
                    : chase.environmental_factors
                if (Array.isArray(factors) && factors.length > 0) {
                  environmentalDisplay =
                    '\n\n**Environmental Factors:**\n' +
                    factors.map((f: string) => `- ${f}`).join('\n')
                }
              } catch (e) {
                environmentalDisplay = ''
              }
            }

            // Format complications
            let complicationsDisplay = ''
            if (chase.complications) {
              try {
                const complications =
                  typeof chase.complications === 'string'
                    ? JSON.parse(chase.complications)
                    : chase.complications
                if (Array.isArray(complications) && complications.length > 0) {
                  complicationsDisplay =
                    '\n\n**Complications:**\n' +
                    complications.map((c: string) => `- ${c}`).join('\n')
                }
              } catch (e) {
                complicationsDisplay = ''
              }
            }

            // Format ending conditions
            let endingDisplay = ''
            if (chase.ending_conditions) {
              try {
                const ending =
                  typeof chase.ending_conditions === 'string'
                    ? JSON.parse(chase.ending_conditions)
                    : chase.ending_conditions
                if (ending.success || ending.failure || ending.alternative) {
                  endingDisplay += '\n\n**Ending Conditions:**'
                  if (ending.success) endingDisplay += `\n- **Success:** ${ending.success}`
                  if (ending.failure) endingDisplay += `\n- **Failure:** ${ending.failure}`
                  if (ending.alternative)
                    endingDisplay += `\n- **Alternative:** ${ending.alternative}`
                }
              } catch (e) {
                endingDisplay = ''
              }
            }

            // Format rewards
            let rewardsDisplay = ''
            if (chase.rewards) {
              try {
                const rewards =
                  typeof chase.rewards === 'string' ? JSON.parse(chase.rewards) : chase.rewards
                if (rewards.success || rewards.partial || rewards.failure) {
                  rewardsDisplay += '\n\n**Rewards:**'
                  if (rewards.success) rewardsDisplay += `\n- **Success:** ${rewards.success}`
                  if (rewards.partial) rewardsDisplay += `\n- **Partial:** ${rewards.partial}`
                  if (rewards.failure) rewardsDisplay += `\n- **Failure:** ${rewards.failure}`
                }
              } catch (e) {
                rewardsDisplay = ''
              }
            }

            return {
              id: chase.id,
              campaign_id: campaign.id,
              user_id: chase.user_id || '',
              section: 'chases',
              subsection: null,
              title: chase.name,
              content: `**Type:** ${chase.chase_type?.replace(/_/g, ' ') || 'N/A'} | **Terrain:** ${chase.terrain} | **Difficulty:** ${chase.difficulty}\n\n${chase.description ? `**Description:**\n${chase.description}\n\n` : ''}${chase.setting ? `**Setting:**\n${chase.setting}\n\n` : ''}${participantsDisplay}${chase.starting_conditions ? `\n\n**Starting Conditions:**\n${chase.starting_conditions}` : ''}${obstaclesDisplay}${shortcutsDisplay}${phasesDisplay}${complicationsDisplay}${environmentalDisplay}${endingDisplay}${rewardsDisplay}${chase.special_rules ? `\n\n**Special Rules:**\n${typeof chase.special_rules === 'string' ? chase.special_rules : JSON.stringify(chase.special_rules)}` : ''}`,
              type: (chase.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
              created_at: chase.created_at,
              updated_at: chase.created_at,
            }
          })
        }
      } else {
        // Fall back to generic campaign_content for other sections
        content = await fetchCampaignContent(campaign.id, section.id, subsection)
      }

      // Convert any literal "\\n" sequences (backslash + n) into real newlines
      // This handles cases where content strings contain escaped newline sequences
      // so ReactMarkdown renders them as actual line breaks.
      const normalized = content.map((e: any) => ({
        ...e,
        content: typeof e.content === 'string' ? e.content.replace(/\\n/g, '\n') : e.content,
      }))

      // Sort entries according to saved order in campaign.setting.entries_order
      let sortedEntries = normalized
      try {
        if (campaign.setting) {
          const settingObj =
            typeof campaign.setting === 'string' ? JSON.parse(campaign.setting) : campaign.setting

          // Get the appropriate key for entries_order (section or section:subsection)
          const orderKey = subsection ? `${section.id}:${subsection}` : section.id

          if (settingObj.entries_order && settingObj.entries_order[orderKey]) {
            const savedOrder: string[] = settingObj.entries_order[orderKey]

            // Sort entries according to the saved order
            const orderedEntries: CampaignContent[] = []
            const entriesById = new Map(normalized.map((e: CampaignContent) => [String(e.id), e]))

            // First, add entries in saved order
            for (const id of savedOrder) {
              const entry = entriesById.get(String(id))
              if (entry) {
                orderedEntries.push(entry)
                entriesById.delete(String(id))
              }
            }

            // Then add any remaining entries that weren't in the saved order
            entriesById.forEach((entry) => orderedEntries.push(entry))

            sortedEntries = orderedEntries
          }
        }
      } catch (error) {
        logger.error('Error applying entries order:', error)
        // Fall back to unsorted entries
      }

      setEntries(sortedEntries)
      onEntriesLoad(sortedEntries)
    } catch (error) {
      logger.error('Failed to load content:', error)
      // Ensure entries are cleared on error to prevent stale data
      setEntries([])
      onEntriesLoad([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingEntry(null)
    setTitle('')
    setContent('')
    setShowEditor(true)
  }

  const handleEditEntry = (entry: CampaignContent) => {
    setEditingEntry(entry)
    setTitle(entry.title)
    setContent(entry.content)
    setShowEditor(true)
  }

  const handleSaveEntry = async () => {
    if (!title.trim()) return

    if (!isAuthenticated) {
      alert('Not authenticated')
      return
    }

    logger.debug('[CampaignToolkit] handleSaveEntry called')
    logger.debug('[CampaignToolkit] section object:', section)
    logger.debug('[CampaignToolkit] section.id:', section.id)
    logger.debug('[CampaignToolkit] section.id type:', typeof section.id)

    try {
      // When viewing Artificer's Toolkit, use subsection as the effective section
      const effectiveSection =
        section.id === 'artificers-toolkit' && subsection ? subsection : section.id

      // Route to correct endpoint based on section type
      const isDedicatedType =
        effectiveSection === 'npcs' ||
        effectiveSection === 'items' ||
        effectiveSection === 'monsters' ||
        effectiveSection === 'encounters' ||
        effectiveSection === 'dialogues' ||
        effectiveSection === 'rumors' ||
        effectiveSection === 'locations' ||
        effectiveSection === 'quests' ||
        effectiveSection === 'taverns' ||
        effectiveSection === 'merchants' ||
        effectiveSection === 'traps' ||
        effectiveSection === 'critters'

      logger.debug('[CampaignToolkit] isDedicatedType:', isDedicatedType)

      if (isDedicatedType) {
        logger.debug('[CampaignToolkit] Routing to dedicated endpoint for:', effectiveSection)

        // For dedicated content types, create directly via their endpoints
        if (editingEntry) {
          // TODO: Implement update for dedicated types
          alert('Editing not yet supported for this content type. Please delete and recreate.')
          return
        } else {
          // Create new in dedicated table
          const endpoint = getApiUrl(`/${effectiveSection}`)
          logger.debug('[CampaignToolkit] POSTing to:', endpoint)
          const body: any = {
            name: title,
            campaign_id: campaign.id,
            ai_generated: false,
          }

          // Add content type-specific fields
          if (effectiveSection === 'npcs') {
            body.race = ''
            body.class = ''
            body.personality = ''
            body.backstory = content
          } else if (effectiveSection === 'items') {
            body.description = content
            body.type = 'Other'
            body.rarity = 'Common'
          } else if (effectiveSection === 'monsters') {
            body.lore = content
          } else if (effectiveSection === 'encounters') {
            body.description = content
            body.difficulty = 'Medium'
          } else if (effectiveSection === 'dialogues') {
            body.character_name = title
            body.scene_setting = ''
            body.mood = ''
            body.dialogue_tree = JSON.stringify([{ text: content }])
          } else if (effectiveSection === 'rumors') {
            body.text = content
            body.source = ''
            body.veracity = 'true'
          } else if (effectiveSection === 'locations') {
            body.description = content
            body.type = 'Other'
          } else if (effectiveSection === 'quests') {
            body.title = title
            body.type = 'side'
            body.description = content
            body.status = 'available'
          }

          const response = await authFetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
          })

          if (!response.ok) {
            throw new Error(`Failed to create ${section.id}`)
          }
        }

        await loadContent() // Refresh from server
      } else {
        // For generic sections, use campaign_content
        if (editingEntry) {
          await updateCampaignContent(campaign.id, editingEntry.id, { title, content })
          await loadContent() // Refresh from server
        } else {
          await createCampaignContent(campaign.id, {
            section: section.id,
            subsection,
            title,
            content,
            type: 'manual',
          })
          await loadContent() // Refresh from server
        }
      }

      setShowEditor(false)
      setTitle('')
      setContent('')
      setEditingEntry(null)
    } catch (error) {
      logger.error('Failed to save entry:', error)
      alert('Failed to save entry')
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    // When viewing Artificer's Toolkit, use subsection as the effective section
    const effectiveSection =
      section.id === 'artificers-toolkit' && subsection ? subsection : section.id

    // For PCs, check if it's a character (has characterData) or a content entry
    if (effectiveSection === 'pcs') {
      const entry = entries.find((e) => e.id === entryId)
      if (entry?.characterData) {
        // It's a character from Guild Roster - unlink it
        if (!confirm('Remove this character from the campaign?')) return
        try {
          await unlinkCharacterFromCampaign(campaign.id, entryId)
          await loadContent()
        } catch (error) {
          logger.error('Failed to unlink character:', error)
          alert('Failed to remove character from campaign')
        }
      } else {
        // It's a content entry (imported file) - delete it
        if (!confirm('Are you sure you want to delete this entry?')) return
        try {
          await deleteCampaignContent(campaign.id, entryId)
          await loadContent()
        } catch (error) {
          logger.error('Failed to delete entry:', error)
          alert('Failed to delete entry')
        }
      }
      return
    }

    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      // Delete from the appropriate endpoint based on section type
      let endpoint = ''
      if (effectiveSection === 'npcs') {
        endpoint = getApiUrl(`/npcs/${entryId}`)
      } else if (effectiveSection === 'items') {
        endpoint = getApiUrl(`/items/${entryId}`)
      } else if (effectiveSection === 'monsters') {
        endpoint = getApiUrl(`/monsters/${entryId}`)
      } else if (effectiveSection === 'encounters') {
        endpoint = getApiUrl(`/encounters/${entryId}`)
      } else if (effectiveSection === 'dialogues') {
        endpoint = getApiUrl(`/dialogues/${entryId}`)
      } else if (effectiveSection === 'rumors') {
        endpoint = getApiUrl(`/rumors/${entryId}`)
      } else if (effectiveSection === 'locations') {
        endpoint = getApiUrl(`/locations/${entryId}`)
      } else if (effectiveSection === 'quests') {
        endpoint = getApiUrl(`/quests/${entryId}`)
      } else if (effectiveSection === 'taverns') {
        endpoint = getApiUrl(`/taverns/${entryId}`)
      } else if (effectiveSection === 'merchants') {
        endpoint = getApiUrl(`/merchants/${entryId}`)
      } else if (effectiveSection === 'traps') {
        endpoint = getApiUrl(`/traps/${entryId}`)
      } else if (effectiveSection === 'critters') {
        endpoint = getApiUrl(`/critters/${entryId}`)
      } else if (effectiveSection === 'chases') {
        endpoint = getApiUrl(`/chases/${entryId}`)
      } else {
        // Fall back to campaign_content for other sections
        await deleteCampaignContent(campaign.id, entryId)
        await loadContent()
        return
      }

      const response = await authFetch(endpoint, { method: 'DELETE' })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(`[CampaignToolkit] Delete failed (${response.status}):`, errorText)
        alert(`Failed to delete: ${response.status === 404 ? 'Entry not found' : 'Server error'}`)
        return
      }

      await loadContent() // Refresh from server
    } catch (error) {
      logger.error('Failed to delete entry:', error)
      alert('Failed to delete entry')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isAuthenticated) {
      alert('Not authenticated')
      return
    }

    setUploading(true)
    try {
      let content = ''
      const fileType = file.type

      // Handle different file types
      if (fileType.startsWith('image/')) {
        // Convert image to base64
        const reader = new FileReader()
        content = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      } else if (fileType.startsWith('audio/')) {
        // Convert audio to base64
        const reader = new FileReader()
        content = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      } else {
        // Read text files as text
        content = await file.text()
        // Remove null bytes (0x00) which PostgreSQL rejects in UTF-8 text fields
        // eslint-disable-next-line no-control-regex
        content = content.replace(/\x00/g, '')
      }

      // When viewing Artificer's Toolkit, use subsection as the effective section
      const effectiveSection =
        section.id === 'artificers-toolkit' && subsection ? subsection : section.id

      // Route to correct endpoint based on section type
      if (effectiveSection === 'pcs') {
        // For PCs section, handle different file types:
        // - JSON files: Try to parse as D&D Beyond export or structured character data
        // - Text/Markdown files: Store as campaign content (backstory, notes)
        // - Image files: Store as campaign content (character portraits)
        const fileName = file.name.replace(/\.[^/.]+$/, '') // Remove extension

        if (fileType === 'application/json' || file.name.endsWith('.json')) {
          // Try to parse as character data
          try {
            const jsonData = JSON.parse(content)
            // Check if it looks like a D&D Beyond character export
            if (jsonData.name && (jsonData.race || jsonData.classes || jsonData.stats)) {
              // Create a character via the characters endpoint
              const characterBody: any = {
                name: jsonData.name,
                race: jsonData.race || '',
                class_info: jsonData.classes?.[0]?.definition?.name || jsonData.class || '',
                level: jsonData.classes?.[0]?.level || jsonData.level || 1,
                background: jsonData.background?.definition?.name || jsonData.background || '',
                backstory: jsonData.notes?.backstory || jsonData.backstory || '',
              }

              // Try to extract stats if present
              if (jsonData.stats) {
                characterBody.stats = jsonData.stats
              }

              const response = await authFetch(getApiUrl('/characters'), {
                method: 'POST',
                body: JSON.stringify(characterBody),
              })

              if (response.ok) {
                const newChar = await response.json()
                // Link the character to this campaign
                await authFetch(getApiUrl(`/campaigns/${campaign.id}/characters/${newChar.id}`), {
                  method: 'POST',
                })
              } else {
                throw new Error('Failed to create character from JSON')
              }
            } else {
              // Not a recognized character format, store as content
              await createCampaignContent(campaign.id, {
                section: 'pcs',
                subsection: null,
                title: fileName,
                content: content,
                type: 'manual',
                file_name: file.name,
              })
            }
          } catch (parseError) {
            // JSON parsing failed, store as plain content
            logger.warn('Failed to parse JSON as character data, storing as content:', parseError)
            await createCampaignContent(campaign.id, {
              section: 'pcs',
              subsection: null,
              title: fileName,
              content: content,
              type: 'manual',
              file_name: file.name,
            })
          }
        } else {
          // Text, markdown, or image files - store as campaign content
          await createCampaignContent(campaign.id, {
            section: 'pcs',
            subsection: null,
            title: fileName,
            content: content,
            type: 'manual',
            file_name: file.name,
          })
        }
      } else if (
        effectiveSection === 'npcs' ||
        effectiveSection === 'items' ||
        effectiveSection === 'monsters' ||
        effectiveSection === 'encounters' ||
        effectiveSection === 'dialogues' ||
        effectiveSection === 'rumors' ||
        effectiveSection === 'locations' ||
        effectiveSection === 'quests'
      ) {
        // For dedicated content types, create directly via their endpoints
        const endpoint = getApiUrl(`/${effectiveSection}`)
        const fileName = file.name.replace(/\.[^/.]+$/, '') // Remove extension

        const body: any = {
          name: fileName,
          campaign_id: campaign.id,
          ai_generated: false,
        }

        // Add type-specific fields based on section
        if (effectiveSection === 'npcs') {
          body.race = ''
          body.class = ''
          body.personality = ''
          body.backstory = content
        } else if (effectiveSection === 'locations') {
          body.type = 'settlement'
          body.description = content
        } else if (effectiveSection === 'quests') {
          body.title = fileName
          body.type = 'side'
          body.description = content
          body.status = 'available'
        } else if (effectiveSection === 'items') {
          body.type = 'treasure'
          body.rarity = 'common'
          body.description = content
        } else if (effectiveSection === 'monsters') {
          body.cr = 1
          body.stats = {}
          body.lore = content
        } else if (effectiveSection === 'encounters') {
          body.party_level = 1
          body.party_size = 4
          body.difficulty = 'medium'
          body.description = content
          body.creatures = []
        } else if (effectiveSection === 'rumors') {
          body.text = content
          body.source = ''
          body.veracity = 'true'
        } else if (effectiveSection === 'dialogues') {
          body.character_name = fileName
          body.scene_setting = ''
          body.mood = ''
          body.dialogue_tree = [{ text: content }]
        }

        const response = await authFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          throw new Error(`Failed to import ${section.id}`)
        }
      } else {
        // For generic sections, use campaign_content
        await createCampaignContent(campaign.id, {
          section: section.id,
          subsection,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          content: content,
          type: 'manual',
          file_name: file.name,
        })
      }

      await loadContent() // Refresh from server
    } catch (error) {
      logger.error('File upload failed:', error)
    } finally {
      setUploading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  // Get accepted file types based on section
  const getAcceptedFileTypes = () => {
    switch (section.id) {
      case 'pcs':
        // Player Characters can accept text (backstory), JSON (D&D Beyond export), or images (portraits)
        return '.txt,.md,.markdown,.json,image/*,.jpg,.jpeg,.png,.gif,.webp'
      case 'maps':
      case 'art':
      case 'props':
      case 'handouts':
        return 'image/*,.jpg,.jpeg,.png,.gif,.webp,.svg'
      case 'soundscapes':
        return 'audio/*,.mp3,.wav,.ogg,.m4a,.flac'
      default:
        return '.txt,.md,.markdown,.pdf'
    }
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header and Import/New Entry buttons only if no entry is selected */}
      {!selectedEntryId && (
        <div className="flex flex-col gap-4">
          {/* Title and description row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Icon name={section.icon} className="w-6 h-6 text-primary flex-shrink-0" />
                <h2 className="text-xl sm:text-2xl font-bold text-tavern-light">{section.name}</h2>
              </div>
              {subsection && <p className="text-sm text-tavern-mauve ml-9">{subsection}</p>}
              <p className="text-sm text-tavern-mauve mt-2 ml-9 hidden sm:block">
                {section.description}
              </p>
            </div>
            {/* Action buttons - icons only on mobile */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Show Import from Guild Roster button for PCs section */}
              {section.id === 'pcs' && (
                <button
                  onClick={() => setShowImportCharacterModal(true)}
                  className="p-2 sm:px-4 sm:py-2 bg-primary hover:bg-primary-dark text-tavern-darkest font-medium rounded-lg transition-colors flex items-center gap-2"
                  title="Import from Guild Roster"
                >
                  <Icon name="Users" className="w-4 h-4" />
                  <span className="hidden sm:inline">Import from Guild Roster</span>
                </button>
              )}
              {/* Standard file import and new entry buttons for all sections */}
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
                accept={getAcceptedFileTypes()}
              />
              <label
                htmlFor="file-upload"
                className="p-2 sm:px-4 sm:py-2 bg-tavern-dark hover:bg-tavern-purple text-tavern-cream font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                title="Import File"
              >
                <Icon name="Upload" className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {uploading ? 'Importing...' : 'Import File'}
                </span>
              </label>
              <button
                onClick={handleCreateNew}
                className="p-2 sm:px-4 sm:py-2 bg-tavern-dark hover:bg-tavern-purple text-tavern-cream font-medium rounded-lg transition-colors flex items-center gap-2"
                title="New Entry"
              >
                <Icon name="Plus" className="w-4 h-4" />
                <span className="hidden sm:inline">New Entry</span>
              </button>
            </div>
          </div>
          {/* Search Input - full width on mobile */}
          <div className="relative">
            <Icon
              name="Globe"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tavern-mauve"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-lg text-tavern-light placeholder-tavern-mauve focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-tavern-dark rounded transition-colors"
              >
                <Icon name="X" className="w-3 h-3 text-tavern-mauve" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-background-panel border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background-panel border-b border-border p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-tavern-light">
                {editingEntry ? 'Edit Entry' : 'New Entry'}
              </h3>
              <button
                onClick={() => {
                  setShowEditor(false)
                  setTitle('')
                  setContent('')
                  setEditingEntry(null)
                }}
                className="p-2 hover:bg-tavern-dark rounded transition-colors"
              >
                <Icon name="X" className="w-5 h-5 text-tavern-mauve" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-tavern-light mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-tavern-light focus:outline-none focus:border-primary"
                  placeholder="Enter a title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tavern-light mb-2">Content</label>
                <MarkdownToolbar
                  textareaRef={contentTextareaRef}
                  value={content}
                  onChange={setContent}
                />
                <textarea
                  ref={contentTextareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-b-lg text-tavern-light focus:outline-none focus:border-primary h-96 resize-none font-mono text-sm"
                  placeholder="Enter your content here... (supports markdown)"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-background-panel border-t border-border p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditor(false)
                  setTitle('')
                  setContent('')
                  setEditingEntry(null)
                }}
                className="px-6 py-2 bg-tavern-dark hover:bg-tavern-purple text-tavern-cream font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEntry}
                disabled={!title.trim()}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-tavern-darkest font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingEntry ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : selectedEntryId ? (
        // Show selected entry
        (() => {
          const entry = entries.find((e) => e.id === selectedEntryId)
          if (!entry) return null

          // For PCs with character data, use the CharacterSheet component
          if (entry.section === 'pcs' && entry.characterData) {
            return (
              <div className="space-y-4">
                {/* Back Button */}
                <button
                  onClick={() => onSelectEntry(null)}
                  className="flex items-center gap-2 px-3 py-2 text-tavern-light hover:text-tavern-gold hover:bg-tavern-purple/50 rounded-lg transition-colors"
                >
                  <Icon name="ChevronLeft" className="w-4 h-4" />
                  <span className="text-sm font-medium">Back to {section.name}</span>
                </button>
                <CharacterSheet
                  character={entry.characterData}
                  onClose={() => onSelectEntry(null)}
                />
              </div>
            )
          }

          // Default view for other content types
          return (
            <div className="space-y-4">
              {/* Back Button */}
              <button
                onClick={() => onSelectEntry(null)}
                className="flex items-center gap-2 px-3 py-2 text-tavern-light hover:text-tavern-gold hover:bg-tavern-purple/50 rounded-lg transition-colors mb-4"
              >
                <Icon name="ChevronLeft" className="w-4 h-4" />
                <span className="text-sm font-medium">Back to {section.name}</span>
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold text-tavern-light">{entry.title}</h3>
                    {entry.type === 'imported' && (
                      <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                        Imported
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-tavern-mauve">
                    {entry.type === 'imported' && entry.file_name
                      ? `From: ${entry.file_name} • `
                      : ''}
                    Updated {new Date(entry.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditEntry(entry)}
                    className="px-4 py-2 bg-tavern-dark hover:bg-tavern-purple text-tavern-cream font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Icon name="Edit" className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Icon name="Trash2" className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                {(() => {
                  // Check if content is base64 data (starts with data:)
                  if (entry.content?.startsWith('data:image/')) {
                    // Display image
                    return (
                      <div className="flex justify-center">
                        <img
                          src={entry.content}
                          alt={entry.title}
                          className="max-w-full h-auto rounded-lg border border-border"
                        />
                      </div>
                    )
                  } else if (entry.content?.startsWith('data:audio/')) {
                    // Display audio player
                    return (
                      <div className="flex justify-center">
                        <audio controls className="w-full max-w-2xl" src={entry.content}>
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )
                  } else {
                    // Display as markdown text
                    return (
                      <div className="prose prose-invert prose-tavern max-w-none">
                        <ReactMarkdown>{entry.content || 'No content'}</ReactMarkdown>
                      </div>
                    )
                  }
                })()}

                {/* NPC Inventory Section */}
                {entry.npcData && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Icon name="Package" className="w-4 h-4" />
                      Inventory
                    </h3>
                    <NPCInventory
                      inventory={(() => {
                        try {
                          const inv = entry.npcData.inventory
                          if (!inv) return []
                          return typeof inv === 'string' ? JSON.parse(inv) : inv
                        } catch {
                          return []
                        }
                      })()}
                      onChange={() => {}}
                      isEditing={false}
                    />
                  </div>
                )}

                {/* Location Treasure Section */}
                {entry.locationData && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Icon name="Gem" className="w-4 h-4" />
                      Treasure
                    </h3>
                    <LocationTreasure
                      treasure={(() => {
                        try {
                          const tr = entry.locationData.treasure
                          if (!tr) return []
                          return typeof tr === 'string' ? JSON.parse(tr) : tr
                        } catch {
                          return []
                        }
                      })()}
                      onChange={() => {}}
                      isEditing={false}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })()
      ) : entries.length > 0 ? (
        // Show list of entries when entries exist but none selected
        (() => {
          // Filter entries based on search query
          const filteredEntries = searchQuery.trim()
            ? entries.filter((entry) => {
                const query = searchQuery.toLowerCase()
                const titleMatch = entry.title?.toLowerCase().includes(query)
                const contentMatch = entry.content?.toLowerCase().includes(query)
                const subsectionMatch = entry.subsection?.toLowerCase().includes(query)
                return titleMatch || contentMatch || subsectionMatch
              })
            : entries

          if (filteredEntries.length === 0) {
            return (
              <div className="text-center py-12 bg-background-panel border border-dashed border-border rounded-lg">
                <Icon
                  name="Globe"
                  className="w-16 h-16 text-tavern-mauve mx-auto mb-3 opacity-50"
                />
                <p className="text-tavern-mauve mb-2">No results found for "{searchQuery}"</p>
                <p className="text-sm text-tavern-mauve">Try adjusting your search terms</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-tavern-dark hover:bg-tavern-purple text-tavern-cream rounded-lg transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )
          }

          return (
            <>
              {searchQuery && (
                <p className="text-sm text-tavern-mauve mb-4">
                  Showing {filteredEntries.length} of {entries.length} entries
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => onSelectEntry(entry.id)}
                    className="bg-background-panel border border-border hover:border-primary/50 rounded-lg p-4 transition-all hover:shadow-lg text-left group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-tavern-light group-hover:text-primary transition-colors line-clamp-1">
                        {entry.title}
                      </h4>
                      <Icon
                        name="ChevronRight"
                        className="w-4 h-4 text-tavern-mauve flex-shrink-0 group-hover:text-primary transition-colors"
                      />
                    </div>
                    {entry.subsection && (
                      <span className="inline-block px-2 py-0.5 text-xs bg-tavern-dark text-tavern-mauve rounded mb-2">
                        {entry.subsection}
                      </span>
                    )}
                    <p className="text-sm text-tavern-mauve line-clamp-2">
                      {entry.content?.replace(/[#*_`]/g, '').substring(0, 120)}...
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-tavern-mauve">
                      <Icon
                        name={entry.type === 'imported' ? 'Sparkles' : 'FileText'}
                        className="w-3 h-3"
                      />
                      <span>{entry.type === 'imported' ? 'AI Generated' : 'Manual'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )
        })()
      ) : (
        // Show empty state when no entries exist
        <div className="text-center py-12 bg-background-panel border border-dashed border-border rounded-lg">
          <Icon name="FileText" className="w-16 h-16 text-tavern-mauve mx-auto mb-3 opacity-50" />
          <p className="text-tavern-mauve mb-4">No entries yet for this section</p>
          <p className="text-sm text-tavern-mauve">
            {section.id === 'pcs'
              ? 'Import characters from the Guild Roster to get started'
              : 'Create a new entry or import a file to get started'}
          </p>
          {section.id === 'pcs' && (
            <button
              onClick={() => setShowImportCharacterModal(true)}
              className="mt-4 px-4 py-2 bg-primary hover:bg-primary-dark text-tavern-darkest font-medium rounded-lg transition-colors"
            >
              Import from Guild Roster
            </button>
          )}
        </div>
      )}

      {/* Import Character Modal for PCs section */}
      {showImportCharacterModal && (
        <ImportCharacterModal
          campaignId={campaign.id}
          existingCharacterIds={entries.map((e) => e.id)}
          onClose={() => setShowImportCharacterModal(false)}
          onImportComplete={() => {
            setShowImportCharacterModal(false)
            loadContent()
          }}
        />
      )}
    </div>
  )
}
