import { useState } from 'react'
import DOMPurify from 'dompurify'
import Icon from '../common/Icon'
import CharacterEditForm from './CharacterEditForm'
import { Character as StoreCharacter } from '@/store/characterStore'
import { apiClient } from '@/api/client'
import { getHPBreakdown } from '@/utils/characterStats'
import { logger } from '@/utils/logger'

// Skill data from D&D Beyond import
interface SkillData {
  bonus: number
  proficient: boolean
  expertise: boolean
}

// Saving throw data from D&D Beyond import
interface SavingThrowData {
  bonus: number
  proficient: boolean
}

// Action data from D&D Beyond import
interface ActionData {
  name: string
  description?: string
  attack_bonus?: number
  damage?: string
  range?: string
  uses?: { current: number; max: number }
}

interface Character {
  id: string
  name: string
  race: string
  subrace?: string
  class_info: string
  subclass?: string
  level: number
  background?: string
  alignment?: string
  experience?: number
  inspiration?: boolean
  // Ability Scores
  strength?: number
  dexterity?: number
  constitution?: number
  intelligence?: number
  wisdom?: number
  charisma?: number
  // Combat Stats
  armor_class?: number
  initiative?: number
  speed?: number
  speed_flying?: number
  speed_swimming?: number
  speed_climbing?: number
  speed_burrowing?: number
  size?: string
  max_hp?: number
  current_hp?: number
  temp_hp?: number
  // Hit Dice
  hit_dice?: string
  hit_dice_total?: number
  hit_dice_used?: number
  // Death Saves
  death_saves?: any
  death_save_successes?: number
  death_save_failures?: number
  exhaustion_level?: number
  // Proficiency & Skills
  proficiency_bonus?: number
  saving_throws?: Record<string, SavingThrowData>
  skills?: Record<string, SkillData>
  proficiencies?: any
  languages?: string[]
  // Senses
  senses?: any
  passive_perception?: number
  passive_insight?: number
  passive_investigation?: number
  // Features & Actions
  features?: any[]
  racial_traits?: any[]
  feats?: any[]
  traits?: any[]
  actions?: ActionData[]
  bonus_actions?: ActionData[]
  reactions?: ActionData[]
  // Equipment
  equipment?: any[]
  weapons?: any[]
  armor?: any[]
  currency?: any
  treasure?: any[]
  // Spellcasting
  spellcasting_ability?: string
  spell_save_dc?: number
  spell_attack_bonus?: number
  spell_slots?: any
  known_spells?: any[]
  prepared_spells?: any[]
  cantrips?: any[]
  // Personality
  personality_traits?: string
  ideals?: string
  bonds?: string
  flaws?: string
  backstory?: string
  allies_organizations?: string
  enemies?: string
  notes?: string
  appearance?: string
  avatar?: string
  // Physical Characteristics
  age?: string
  height?: string
  weight?: string
  eyes?: string
  skin?: string
  hair?: string
  gender?: string
  faith?: string
  // Lifestyle
  lifestyle?: string
  // D&D Beyond
  dndbeyond_id?: string
}

interface CharacterSheetProps {
  character: Character
  onUpdate?: () => void
  onClose: () => void
}

export default function CharacterSheet({
  character,
  onUpdate,
  onClose: _onClose,
}: CharacterSheetProps) {
  const [editMode, setEditMode] = useState(false)
  const [selectedSpell, setSelectedSpell] = useState<any>(null)
  const [deathSaveSuccesses, setDeathSaveSuccesses] = useState(character.death_save_successes || 0)
  const [deathSaveFailures, setDeathSaveFailures] = useState(character.death_save_failures || 0)
  const [savingDeathSaves, setSavingDeathSaves] = useState(false)

  // Calculate ability modifiers
  const getModifier = (score?: number): string => {
    if (!score) return '+0'
    const mod = Math.floor((score - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  // Handle successful edit
  const handleEditSuccess = () => {
    setEditMode(false)
    if (onUpdate) {
      onUpdate()
    }
  }

  // Handle death save toggle
  const handleDeathSaveToggle = async (type: 'successes' | 'failures', index: number) => {
    if (savingDeathSaves) return

    const currentValue = type === 'successes' ? deathSaveSuccesses : deathSaveFailures
    // If clicking on a filled circle at or before current value, unfill from that point
    // If clicking on an unfilled circle, fill up to that point
    const newValue = currentValue >= index ? index - 1 : index

    // Optimistically update UI
    if (type === 'successes') {
      setDeathSaveSuccesses(newValue)
    } else {
      setDeathSaveFailures(newValue)
    }

    setSavingDeathSaves(true)
    try {
      await apiClient.put(`/characters/${character.id}`, {
        name: character.name,
        level: character.level,
        race: character.race,
        class_info: character.class_info,
        death_save_successes: type === 'successes' ? newValue : deathSaveSuccesses,
        death_save_failures: type === 'failures' ? newValue : deathSaveFailures,
      })
      // Notify parent to refresh if needed
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      // Revert on error
      if (type === 'successes') {
        setDeathSaveSuccesses(currentValue)
      } else {
        setDeathSaveFailures(currentValue)
      }
      logger.error('Failed to update death saves:', error)
    } finally {
      setSavingDeathSaves(false)
    }
  }

  // Convert local Character interface to store Character type for the edit form
  const storeCharacter: StoreCharacter = {
    id: character.id,
    user_id: '',
    name: character.name,
    race: character.race,
    class_info: character.class_info,
    level: character.level,
    background: character.background,
    alignment: character.alignment,
    experience: character.experience,
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
    armor_class: character.armor_class,
    initiative: character.initiative,
    speed: character.speed,
    max_hp: character.max_hp,
    current_hp: character.current_hp,
    temp_hp: character.temp_hp,
    hit_dice: character.hit_dice,
    proficiency_bonus: character.proficiency_bonus,
    personality_traits: character.personality_traits,
    ideals: character.ideals,
    bonds: character.bonds,
    flaws: character.flaws,
    backstory: character.backstory,
    notes: character.notes,
    appearance: character.appearance,
    avatar: character.avatar,
    languages: character.languages,
    currency: character.currency,
    created_at: '',
    updated_at: '',
  }

  // If in edit mode, show the edit form
  if (editMode) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <div className="border-b border-border bg-background-panel p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text">Edit Character: {character.name}</h2>
            <button
              onClick={() => setEditMode(false)}
              className="text-text-muted hover:text-text transition-colors"
            >
              <Icon name="X" className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <CharacterEditForm
            character={storeCharacter}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditMode(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Character Header */}
      <div className="border-b border-border bg-background-panel p-6 sticky top-0 z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center flex-shrink-0">
              {character.avatar ? (
                <img
                  src={character.avatar}
                  alt={character.name}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                <Icon name="UserCircle" className="w-12 h-12 text-primary" />
              )}
            </div>

            {/* Basic Info */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-text">{character.name}</h2>
                {character.inspiration && (
                  <span className="text-yellow-500" title="Inspired">
                    <Icon name="Sparkles" className="w-5 h-5" />
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-text-muted">
                <span>
                  Level {character.level} {character.subrace ? `${character.subrace} ` : ''}
                  {character.race} {character.class_info}
                  {character.subclass && ` (${character.subclass})`}
                </span>
                {character.background && <span>• {character.background}</span>}
                {character.alignment && <span>• {character.alignment}</span>}
                {character.lifestyle && <span>• {character.lifestyle}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {character.experience !== undefined && (
                  <span className="text-xs text-text-muted">
                    XP: {character.experience.toLocaleString()}
                  </span>
                )}
                {character.dndbeyond_id && (
                  <a
                    href={`https://www.dndbeyond.com/characters/${character.dndbeyond_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Icon name="ExternalLink" className="w-3 h-3" />
                    D&D Beyond
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded transition-colors text-sm flex items-center gap-1"
            >
              <Icon name="Edit" className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content - Card Based Layout */}
      <div className="p-6 space-y-6">
        {/* Combat Stats */}
        <div className="bg-background-panel border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
            <Icon name="Swords" className="w-5 h-5 text-primary" />
            Combat Stats
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-sm text-text-muted mb-1">Armor Class</div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {character.armor_class || 10}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-text-muted mb-1">Initiative</div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {character.initiative !== undefined
                  ? character.initiative >= 0
                    ? `+${character.initiative}`
                    : character.initiative
                  : getModifier(character.dexterity)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-text-muted mb-1">Speed</div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {character.speed || 30}ft
              </div>
              {/* Alternate speeds */}
              {(character.speed_flying ||
                character.speed_swimming ||
                character.speed_climbing ||
                character.speed_burrowing) && (
                <div className="text-xs text-text-muted mt-1 space-x-2">
                  {character.speed_flying && <span>Fly {character.speed_flying}ft</span>}
                  {character.speed_swimming && <span>Swim {character.speed_swimming}ft</span>}
                  {character.speed_climbing && <span>Climb {character.speed_climbing}ft</span>}
                  {character.speed_burrowing && <span>Burrow {character.speed_burrowing}ft</span>}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-sm text-text-muted mb-1">Hit Points</div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {character.current_hp ?? character.max_hp ?? 0}
              </div>
              <div className="text-xs text-text-muted">
                /{' '}
                {(() => {
                  const hpBreakdown = getHPBreakdown(
                    character.max_hp,
                    character.level,
                    character.constitution
                  )
                  return hpBreakdown.conBonus > 0
                    ? `${hpBreakdown.base} +${hpBreakdown.conBonus}`
                    : hpBreakdown.conBonus < 0
                      ? `${hpBreakdown.base} ${hpBreakdown.conBonus}`
                      : character.max_hp || 0
                })()}
              </div>
              {character.temp_hp !== undefined && character.temp_hp > 0 && (
                <div className="text-xs text-primary mt-1">+{character.temp_hp} temp</div>
              )}
            </div>
            <div className="text-center">
              <div className="text-sm text-text-muted mb-1">Hit Dice</div>
              <div className="text-lg font-semibold text-text">
                {character.hit_dice || `${character.level}d8`}
              </div>
              {character.hit_dice_total !== undefined && (
                <div className="text-xs text-text-muted">
                  {(character.hit_dice_total || 0) - (character.hit_dice_used || 0)} /{' '}
                  {character.hit_dice_total}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-sm text-text-muted mb-1">Proficiency</div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                +{character.proficiency_bonus || Math.floor((character.level - 1) / 4) + 2}
              </div>
            </div>
          </div>

          {/* Size indicator */}
          {character.size && (
            <div className="mt-4 pt-4 border-t border-border">
              <span className="text-sm text-text-muted">Size: </span>
              <span className="text-sm font-semibold text-text">{character.size}</span>
            </div>
          )}

          {/* Death Saves */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">Successes:</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <button
                      key={`success-${i}`}
                      onClick={() => handleDeathSaveToggle('successes', i)}
                      disabled={savingDeathSaves}
                      className={`w-4 h-4 rounded-full border-2 transition-colors cursor-pointer hover:border-green-400 disabled:cursor-wait ${
                        deathSaveSuccesses >= i
                          ? 'bg-green-500 border-green-500'
                          : 'border-text-muted hover:bg-green-500/20'
                      }`}
                      title={`${deathSaveSuccesses >= i ? 'Remove' : 'Add'} success ${i}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">Failures:</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <button
                      key={`failure-${i}`}
                      onClick={() => handleDeathSaveToggle('failures', i)}
                      disabled={savingDeathSaves}
                      className={`w-4 h-4 rounded-full border-2 transition-colors cursor-pointer hover:border-red-400 disabled:cursor-wait ${
                        deathSaveFailures >= i
                          ? 'bg-red-500 border-red-500'
                          : 'border-text-muted hover:bg-red-500/20'
                      }`}
                      title={`${deathSaveFailures >= i ? 'Remove' : 'Add'} failure ${i}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ability Scores */}
        <div className="bg-background-panel border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
            <Icon name="Dices" className="w-5 h-5 text-primary" />
            Ability Scores
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4">
            {[
              { name: 'STR', value: character.strength, full: 'Strength' },
              { name: 'DEX', value: character.dexterity, full: 'Dexterity' },
              { name: 'CON', value: character.constitution, full: 'Constitution' },
              { name: 'INT', value: character.intelligence, full: 'Intelligence' },
              { name: 'WIS', value: character.wisdom, full: 'Wisdom' },
              { name: 'CHA', value: character.charisma, full: 'Charisma' },
            ].map((ability) => (
              <div
                key={ability.name}
                className="flex flex-col items-center bg-background rounded-lg p-2 sm:p-4"
              >
                <div className="text-xs text-text-muted mb-1 hidden sm:block">{ability.full}</div>
                <div className="text-base sm:text-lg font-bold text-text mb-1">{ability.name}</div>
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                  {ability.value || 10}
                </div>
                <div className="text-sm text-text-muted">{getModifier(ability.value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Saving Throws */}
        <div className="bg-background-panel border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-text mb-4">Saving Throws</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {[
              { name: 'Strength', short: 'STR', value: character.strength },
              { name: 'Dexterity', short: 'DEX', value: character.dexterity },
              { name: 'Constitution', short: 'CON', value: character.constitution },
              { name: 'Intelligence', short: 'INT', value: character.intelligence },
              { name: 'Wisdom', short: 'WIS', value: character.wisdom },
              { name: 'Charisma', short: 'CHA', value: character.charisma },
            ].map((save) => {
              // New format: saving_throws = { "STR": { bonus: number, proficient: boolean }, ... }
              const saveData = character.saving_throws?.[save.short]
              const proficient = saveData?.proficient || false
              // Use pre-calculated bonus if available, otherwise calculate
              const total =
                saveData?.bonus !== undefined
                  ? saveData.bonus
                  : (() => {
                      const modifier = save.value ? Math.floor((save.value - 10) / 2) : 0
                      const profBonus =
                        character.proficiency_bonus || Math.floor((character.level - 1) / 4) + 2
                      return modifier + (proficient ? profBonus : 0)
                    })()

              return (
                <div
                  key={save.short}
                  className="flex items-center gap-2 bg-background rounded p-2 sm:p-3"
                >
                  <input
                    type="checkbox"
                    checked={proficient}
                    readOnly
                    className="w-4 h-4 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text block truncate">
                      <span className="sm:hidden">{save.short}</span>
                      <span className="hidden sm:inline">{save.name}</span>
                    </span>
                  </div>
                  <span className="font-semibold text-text">
                    {total >= 0 ? `+${total}` : total}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Skills */}
        <div className="bg-background-panel border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-text mb-4">Skills</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {[
              { name: 'Acrobatics', ability: 'dexterity' },
              { name: 'Animal Handling', ability: 'wisdom' },
              { name: 'Arcana', ability: 'intelligence' },
              { name: 'Athletics', ability: 'strength' },
              { name: 'Deception', ability: 'charisma' },
              { name: 'History', ability: 'intelligence' },
              { name: 'Insight', ability: 'wisdom' },
              { name: 'Intimidation', ability: 'charisma' },
              { name: 'Investigation', ability: 'intelligence' },
              { name: 'Medicine', ability: 'wisdom' },
              { name: 'Nature', ability: 'intelligence' },
              { name: 'Perception', ability: 'wisdom' },
              { name: 'Performance', ability: 'charisma' },
              { name: 'Persuasion', ability: 'charisma' },
              { name: 'Religion', ability: 'intelligence' },
              { name: 'Sleight of Hand', ability: 'dexterity' },
              { name: 'Stealth', ability: 'dexterity' },
              { name: 'Survival', ability: 'wisdom' },
            ].map((skill) => {
              // New format: skills = { "Skill Name": { bonus: number, proficient: boolean, expertise: boolean }, ... }
              const skillData = character.skills?.[skill.name]
              const proficient = skillData?.proficient || false
              const expertise = skillData?.expertise || false
              // Use pre-calculated bonus if available, otherwise calculate
              const total =
                skillData?.bonus !== undefined
                  ? skillData.bonus
                  : (() => {
                      const abilityScore =
                        (character[skill.ability as keyof Character] as number) || 10
                      const modifier = Math.floor((abilityScore - 10) / 2)
                      const profBonus =
                        character.proficiency_bonus || Math.floor((character.level - 1) / 4) + 2
                      return modifier + (proficient ? profBonus : 0) + (expertise ? profBonus : 0)
                    })()

              return (
                <div key={skill.name} className="flex items-center gap-2 bg-background rounded p-3">
                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                    {expertise ? (
                      <div className="w-3 h-3 bg-primary rounded-full" title="Expertise" />
                    ) : (
                      <input type="checkbox" checked={proficient} readOnly className="w-4 h-4" />
                    )}
                  </div>
                  <span className="flex-1 text-sm text-text">{skill.name}</span>
                  <span className="font-semibold text-text text-sm">
                    {total >= 0 ? `+${total}` : total}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Senses & Passive Scores */}
        {(character.senses ||
          character.passive_perception ||
          character.passive_insight ||
          character.passive_investigation) && (
          <div className="bg-background-panel border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
              <Icon name="Eye" className="w-5 h-5 text-primary" />
              Senses
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Senses */}
              <div>
                <h4 className="text-sm font-semibold text-text mb-2">Special Senses</h4>
                {character.senses && Object.keys(character.senses).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(character.senses).map(([sense, value]) => (
                      <div key={sense} className="text-sm text-text-muted">
                        <span className="capitalize">{sense}</span>: {String(value)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted italic">None</p>
                )}
              </div>

              {/* Passive Scores */}
              <div>
                <h4 className="text-sm font-semibold text-text mb-2">Passive Scores</h4>
                <div className="space-y-1">
                  {character.passive_perception !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Passive Perception</span>
                      <span className="font-semibold text-text">
                        {character.passive_perception}
                      </span>
                    </div>
                  )}
                  {character.passive_insight !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Passive Insight</span>
                      <span className="font-semibold text-text">{character.passive_insight}</span>
                    </div>
                  )}
                  {character.passive_investigation !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Passive Investigation</span>
                      <span className="font-semibold text-text">
                        {character.passive_investigation}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Proficiencies & Languages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-background-panel border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-text mb-4">Proficiencies</h3>
            <div className="space-y-2">
              {character.proficiencies && Object.keys(character.proficiencies).length > 0 ? (
                Object.entries(character.proficiencies).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <div className="font-semibold text-text capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-text-muted">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted italic">None listed</p>
              )}
            </div>
          </div>

          <div className="bg-background-panel border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-text mb-4">Languages</h3>
            <div className="text-sm text-text">
              {character.languages && character.languages.length > 0 ? (
                character.languages.join(', ')
              ) : (
                <span className="text-text-muted italic">None listed</span>
              )}
            </div>
          </div>
        </div>

        {/* Spellcasting */}
        {character.spellcasting_ability && (
          <>
            <div className="bg-background-panel border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                <Icon name="Sparkles" className="w-5 h-5 text-primary" />
                Spellcasting
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-text-muted mb-1">Spellcasting Ability</div>
                  <div className="text-xl font-bold text-primary uppercase">
                    {character.spellcasting_ability || 'None'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-muted mb-1">Spell Save DC</div>
                  <div className="text-xl font-bold text-primary">
                    {character.spell_save_dc || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-muted mb-1">Spell Attack Bonus</div>
                  <div className="text-xl font-bold text-primary">
                    {character.spell_attack_bonus ? `+${character.spell_attack_bonus}` : '—'}
                  </div>
                </div>
              </div>

              {/* Spell Slots */}
              {character.spell_slots && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-text mb-3">Spell Slots</h4>
                  <div className="grid grid-cols-9 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
                      const slots = character.spell_slots?.[`level_${level}`]
                      if (!slots || slots.total === 0) return null

                      return (
                        <div key={level} className="text-center">
                          <div className="text-xs text-text-muted mb-1">L{level}</div>
                          <div className="text-lg font-bold text-primary">
                            {slots.used || 0} / {slots.total}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Prepared Spells */}
            {character.prepared_spells && character.prepared_spells.length > 0 && (
              <div className="bg-background-panel border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-text mb-4">Prepared Spells</h3>
                <div className="grid grid-cols-3 gap-3">
                  {character.prepared_spells.map((spell, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSpell(spell)}
                      className="bg-background border border-border rounded-lg p-3 hover:border-primary/50 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold text-text text-sm">{spell.name}</h4>
                        <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded flex-shrink-0 ml-2">
                          {spell.level === 0 ? 'C' : `L${spell.level}`}
                        </span>
                      </div>
                      {spell.school && <p className="text-xs text-text-muted">{spell.school}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Equipment */}
        {(character.weapons?.length ||
          character.armor?.length ||
          character.equipment?.length ||
          character.currency) && (
          <>
            {/* Currency */}
            {character.currency && (
              <div className="bg-background-panel border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-text mb-4">Currency</h3>
                <div className="flex gap-6">
                  {['cp', 'sp', 'ep', 'gp', 'pp'].map((coin) => (
                    <div key={coin} className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {character.currency?.[coin] || 0}
                      </div>
                      <div className="text-xs text-text-muted uppercase mt-1">{coin}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weapons & Armor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-background-panel border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <Icon name="Swords" className="w-5 h-5 text-primary" />
                  Weapons
                </h3>
                <div className="space-y-3">
                  {character.weapons && character.weapons.length > 0 ? (
                    character.weapons.map((weapon, idx) => (
                      <div key={idx} className="bg-background rounded p-3">
                        <div className="font-semibold text-text">{weapon.name}</div>
                        <div className="text-sm text-text-muted mt-1">
                          {weapon.attack_bonus && <span>+{weapon.attack_bonus} to hit</span>}
                          {weapon.damage && <span> • {weapon.damage} damage</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-muted italic">No weapons</p>
                  )}
                </div>
              </div>

              <div className="bg-background-panel border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <Icon name="Shield" className="w-5 h-5 text-primary" />
                  Armor
                </h3>
                <div className="space-y-3">
                  {character.armor && character.armor.length > 0 ? (
                    character.armor.map((armor, idx) => (
                      <div key={idx} className="bg-background rounded p-3">
                        <div className="font-semibold text-text">{armor.name}</div>
                        <div className="text-sm text-text-muted mt-1">
                          {armor.ac && <span>AC {armor.ac}</span>}
                          {armor.type && <span> • {armor.type}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-muted italic">No armor</p>
                  )}
                </div>
              </div>
            </div>

            {/* Other Equipment */}
            {character.equipment && character.equipment.length > 0 && (
              <div className="bg-background-panel border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <Icon name="Package" className="w-5 h-5 text-primary" />
                  Equipment & Items
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {character.equipment.map((item, idx) => (
                    <div key={idx} className="bg-background rounded p-3">
                      <div className="font-semibold text-text">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-text-muted mt-1">{item.description}</div>
                      )}
                      {item.quantity && item.quantity > 1 && (
                        <div className="text-xs text-text-muted mt-1">Qty: {item.quantity}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Features & Traits */}
        {(character.features?.length || character.racial_traits?.length) && (
          <>
            {character.features && character.features.length > 0 && (
              <div className="bg-background-panel border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <Icon name="BookOpen" className="w-5 h-5 text-primary" />
                  Features & Traits
                </h3>
                <div className="space-y-4">
                  {character.features.map((feature, idx) => (
                    <div key={idx} className="bg-background rounded p-4">
                      <h4 className="font-semibold text-text mb-2">{feature.name}</h4>
                      <p className="text-sm text-text-muted">{feature.description}</p>
                      {feature.uses && (
                        <div className="text-xs text-primary mt-2">
                          Uses: {feature.uses.current} / {feature.uses.max}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {character.racial_traits && character.racial_traits.length > 0 && (
              <div className="bg-background-panel border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-text mb-4">Racial Traits</h3>
                <div className="space-y-4">
                  {character.racial_traits.map((trait, idx) => (
                    <div key={idx} className="bg-background rounded p-4">
                      <h4 className="font-semibold text-text mb-2">{trait.name}</h4>
                      <p className="text-sm text-text-muted">{trait.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feats */}
            {character.feats && character.feats.length > 0 && (
              <div className="bg-background-panel border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <Icon name="Scroll" className="w-5 h-5 text-primary" />
                  Feats
                </h3>
                <div className="space-y-4">
                  {character.feats.map((feat, idx) => (
                    <div key={idx} className="bg-background rounded p-4">
                      <h4 className="font-semibold text-text mb-2">{feat.name}</h4>
                      {feat.description && (
                        <p className="text-sm text-text-muted">{feat.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions, Bonus Actions, Reactions */}
        {(character.actions?.length ||
          character.bonus_actions?.length ||
          character.reactions?.length) && (
          <div className="bg-background-panel border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
              <Icon name="Swords" className="w-5 h-5 text-primary" />
              Actions
            </h3>
            <div className="space-y-6">
              {/* Actions */}
              {character.actions && character.actions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    Actions
                  </h4>
                  <div className="space-y-3">
                    {character.actions.map((action, idx) => (
                      <div key={idx} className="bg-background rounded p-3">
                        <div className="font-semibold text-text">{action.name}</div>
                        {action.description && (
                          <p className="text-sm text-text-muted mt-1">{action.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-text-muted">
                          {action.attack_bonus !== undefined && (
                            <span>+{action.attack_bonus} to hit</span>
                          )}
                          {action.damage && <span>{action.damage} damage</span>}
                          {action.range && <span>Range: {action.range}</span>}
                        </div>
                        {action.uses && (
                          <div className="text-xs text-primary mt-2">
                            Uses: {action.uses.current} / {action.uses.max}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bonus Actions */}
              {character.bonus_actions && character.bonus_actions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                    Bonus Actions
                  </h4>
                  <div className="space-y-3">
                    {character.bonus_actions.map((action, idx) => (
                      <div key={idx} className="bg-background rounded p-3">
                        <div className="font-semibold text-text">{action.name}</div>
                        {action.description && (
                          <p className="text-sm text-text-muted mt-1">{action.description}</p>
                        )}
                        {action.uses && (
                          <div className="text-xs text-primary mt-2">
                            Uses: {action.uses.current} / {action.uses.max}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reactions */}
              {character.reactions && character.reactions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    Reactions
                  </h4>
                  <div className="space-y-3">
                    {character.reactions.map((action, idx) => (
                      <div key={idx} className="bg-background rounded p-3">
                        <div className="font-semibold text-text">{action.name}</div>
                        {action.description && (
                          <p className="text-sm text-text-muted mt-1">{action.description}</p>
                        )}
                        {action.uses && (
                          <div className="text-xs text-primary mt-2">
                            Uses: {action.uses.current} / {action.uses.max}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Personality & Biography */}
        {(character.personality_traits ||
          character.ideals ||
          character.bonds ||
          character.flaws) && (
          <div className="bg-background-panel border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
              <Icon name="User" className="w-5 h-5 text-primary" />
              Personality
            </h3>
            <div className="space-y-4">
              {character.personality_traits && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-2">Personality Traits</h4>
                  <p className="text-text-muted">{character.personality_traits}</p>
                </div>
              )}
              {character.ideals && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-2">Ideals</h4>
                  <p className="text-text-muted">{character.ideals}</p>
                </div>
              )}
              {character.bonds && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-2">Bonds</h4>
                  <p className="text-text-muted">{character.bonds}</p>
                </div>
              )}
              {character.flaws && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-2">Flaws</h4>
                  <p className="text-text-muted">{character.flaws}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Physical Characteristics & Appearance */}
        {(character.age ||
          character.height ||
          character.weight ||
          character.eyes ||
          character.skin ||
          character.hair ||
          character.gender ||
          character.faith ||
          character.appearance) && (
          <div className="bg-background-panel border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
              <Icon name="User" className="w-5 h-5 text-primary" />
              Physical Description
            </h3>

            {/* Physical Stats Grid */}
            {(character.age ||
              character.height ||
              character.weight ||
              character.eyes ||
              character.skin ||
              character.hair ||
              character.gender ||
              character.faith) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                {character.age && (
                  <div className="bg-background rounded p-3">
                    <div className="text-xs text-text-muted mb-1">Age</div>
                    <div className="text-sm font-semibold text-text">{character.age}</div>
                  </div>
                )}
                {character.gender && (
                  <div className="bg-background rounded p-3">
                    <div className="text-xs text-text-muted mb-1">Gender</div>
                    <div className="text-sm font-semibold text-text">{character.gender}</div>
                  </div>
                )}
                {character.height && (
                  <div className="bg-background rounded p-3">
                    <div className="text-xs text-text-muted mb-1">Height</div>
                    <div className="text-sm font-semibold text-text">{character.height}</div>
                  </div>
                )}
                {character.weight && (
                  <div className="bg-background rounded p-3">
                    <div className="text-xs text-text-muted mb-1">Weight</div>
                    <div className="text-sm font-semibold text-text">{character.weight}</div>
                  </div>
                )}
                {character.eyes && (
                  <div className="bg-background rounded p-3">
                    <div className="text-xs text-text-muted mb-1">Eyes</div>
                    <div className="text-sm font-semibold text-text">{character.eyes}</div>
                  </div>
                )}
                {character.skin && (
                  <div className="bg-background rounded p-3">
                    <div className="text-xs text-text-muted mb-1">Skin</div>
                    <div className="text-sm font-semibold text-text">{character.skin}</div>
                  </div>
                )}
                {character.hair && (
                  <div className="bg-background rounded p-3">
                    <div className="text-xs text-text-muted mb-1">Hair</div>
                    <div className="text-sm font-semibold text-text">{character.hair}</div>
                  </div>
                )}
                {character.faith && (
                  <div className="bg-background rounded p-3">
                    <div className="text-xs text-text-muted mb-1">Faith</div>
                    <div className="text-sm font-semibold text-text">{character.faith}</div>
                  </div>
                )}
              </div>
            )}

            {/* Appearance Description */}
            {character.appearance && (
              <div>
                <h4 className="text-sm font-semibold text-text mb-2">Description</h4>
                <p className="text-text-muted whitespace-pre-wrap">{character.appearance}</p>
              </div>
            )}
          </div>
        )}

        {character.backstory && (
          <div className="bg-background-panel border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-text mb-4">Backstory</h3>
            <p className="text-text-muted whitespace-pre-wrap">{character.backstory}</p>
          </div>
        )}

        {/* Relationships */}
        {(character.allies_organizations || character.enemies) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {character.allies_organizations && (
              <div className="bg-background-panel border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <Icon name="Users" className="w-5 h-5 text-primary" />
                  Allies & Organizations
                </h3>
                <p className="text-text-muted whitespace-pre-wrap">
                  {character.allies_organizations}
                </p>
              </div>
            )}

            {character.enemies && (
              <div className="bg-background-panel border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
                  Enemies
                </h3>
                <p className="text-text-muted whitespace-pre-wrap">{character.enemies}</p>
              </div>
            )}
          </div>
        )}

        {character.notes && (
          <div className="bg-background-panel border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-text mb-4">Notes</h3>
            <p className="text-text-muted whitespace-pre-wrap">{character.notes}</p>
          </div>
        )}
      </div>

      {/* Spell Detail Modal */}
      {selectedSpell && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSpell(null)}
        >
          <div
            className="bg-background-panel border border-border rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-text">{selectedSpell.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-text-muted">
                  <span>
                    {selectedSpell.level === 0 ? 'Cantrip' : `Level ${selectedSpell.level}`}
                  </span>
                  {selectedSpell.school && (
                    <>
                      <span>•</span>
                      <span>{selectedSpell.school}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedSpell(null)}
                className="text-text-muted hover:text-text"
              >
                <Icon name="X" className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedSpell.casting_time !== undefined && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-1">Casting Time</h4>
                  <p className="text-sm text-text-muted">
                    {selectedSpell.casting_time === 1
                      ? '1 action'
                      : selectedSpell.casting_time === 2
                        ? '1 bonus action'
                        : selectedSpell.casting_time === 3
                          ? '1 reaction'
                          : `${selectedSpell.casting_time} actions`}
                  </p>
                </div>
              )}

              {selectedSpell.range !== undefined && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-1">Range</h4>
                  <p className="text-sm text-text-muted">
                    {selectedSpell.range === 0 ? 'Self' : `${selectedSpell.range} feet`}
                  </p>
                </div>
              )}

              {selectedSpell.description && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-1">Description</h4>
                  <div
                    className="text-sm text-text-muted prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(selectedSpell.description),
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
