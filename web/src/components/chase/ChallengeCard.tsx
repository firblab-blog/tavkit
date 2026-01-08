import { useState } from 'react'
import Icon from '../common/Icon'
import type { ChaseChallenge } from '../../types/chase'
import { SKILLS, ABILITIES } from '../../types/chase'

interface ChallengeCardProps {
  challenge: ChaseChallenge
  onRollSubmit?: (participantId: string, roll: number, modifier: number, skill: string) => void
  participants?: Array<{ id: string; name: string }>
}

export default function ChallengeCard({
  challenge,
  onRollSubmit,
  participants = [],
}: ChallengeCardProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<string>('')
  const [rollValue, setRollValue] = useState<string>('')
  const [modifierValue, setModifierValue] = useState<string>('')
  const [selectedSkill, setSelectedSkill] = useState<string>(challenge.skill)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedParticipant && rollValue && onRollSubmit) {
      const roll = parseInt(rollValue)
      const modifier = parseInt(modifierValue || '0')
      onRollSubmit(selectedParticipant, roll, modifier, selectedSkill)

      // Reset form
      setRollValue('')
      setModifierValue('')
      setSelectedSkill(challenge.skill)
    }
  }

  // Get skill's ability
  const getSkillAbility = (skill: string): string => {
    const skillData = SKILLS.find((s) => s.value === skill)
    return skillData?.ability || 'dex'
  }

  // Get ability name
  const getAbilityName = (abilityKey: string): string => {
    const ability = ABILITIES.find((a) => a.value === abilityKey)
    return ability?.label || abilityKey.toUpperCase()
  }

  // Parse alternate skills from challenge
  const alternateSkills = challenge.alternate_skills || []

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-950/50 to-purple-950/50 rounded-lg border-2 border-indigo-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <Icon name="Swords" size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-stone-400">Round {challenge.round}</div>
            <div className="text-lg font-bold text-indigo-300">Skill Challenge</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-stone-400">DC</div>
          <div className="text-2xl font-bold text-indigo-300">{challenge.dc}</div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4 p-3 bg-stone-900/50 rounded border border-stone-700">
        <p className="text-stone-200 text-sm leading-relaxed">{challenge.description}</p>
      </div>

      {/* Primary skill */}
      <div className="mb-3 flex items-center gap-2 text-sm">
        <div className="text-stone-400">Primary Skill:</div>
        <div className="px-2 py-1 bg-indigo-900/30 border border-indigo-700 rounded text-indigo-300 font-medium">
          {SKILLS.find((s) => s.value === challenge.skill)?.label || challenge.skill}
          <span className="text-xs text-stone-400 ml-1">
            ({getAbilityName(getSkillAbility(challenge.skill))})
          </span>
        </div>
      </div>

      {/* Alternate skills */}
      {alternateSkills.length > 0 && (
        <div className="mb-4 text-sm">
          <div className="text-stone-400 mb-1">Alternate Skills:</div>
          <div className="flex flex-wrap gap-1">
            {alternateSkills.map((skill) => (
              <div
                key={skill}
                className="px-2 py-1 bg-stone-800/50 border border-stone-700 rounded text-stone-300 text-xs"
              >
                {SKILLS.find((s) => s.value === skill)?.label || skill}
                <span className="text-stone-500 ml-1">
                  ({getAbilityName(getSkillAbility(skill))})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success/Failure effects */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 bg-green-950/30 border border-green-800 rounded">
          <div className="text-xs font-medium text-green-400 mb-1 flex items-center gap-1">
            <Icon name="Check" size={12} />
            Success
          </div>
          <div className="text-xs text-stone-300">{challenge.success_effect}</div>
        </div>
        <div className="p-2 bg-red-950/30 border border-red-800 rounded">
          <div className="text-xs font-medium text-red-400 mb-1 flex items-center gap-1">
            <Icon name="X" size={12} />
            Failure
          </div>
          <div className="text-xs text-stone-300">{challenge.failure_effect}</div>
        </div>
      </div>

      {/* Roll submission form */}
      {onRollSubmit && participants.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-stone-900/50 rounded border border-stone-700 space-y-3"
        >
          <div className="text-sm font-medium text-stone-300 mb-2">Submit Roll</div>

          {/* Participant selector */}
          <div>
            <label className="block text-xs text-stone-400 mb-1">Participant</label>
            <select
              value={selectedParticipant}
              onChange={(e) => setSelectedParticipant(e.target.value)}
              required
              className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select participant...</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Skill selector */}
          <div>
            <label className="block text-xs text-stone-400 mb-1">Skill Used</label>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              required
              className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={challenge.skill}>
                {SKILLS.find((s) => s.value === challenge.skill)?.label || challenge.skill}
              </option>
              {alternateSkills.map((skill) => (
                <option key={skill} value={skill}>
                  {SKILLS.find((s) => s.value === skill)?.label || skill}
                </option>
              ))}
            </select>
          </div>

          {/* Roll inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-stone-400 mb-1">d20 Roll</label>
              <input
                type="number"
                min="1"
                max="20"
                value={rollValue}
                onChange={(e) => setRollValue(e.target.value)}
                required
                placeholder="1-20"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Modifier</label>
              <input
                type="number"
                value={modifierValue}
                onChange={(e) => setModifierValue(e.target.value)}
                placeholder="+0"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Total preview */}
          {rollValue && (
            <div className="text-center p-2 bg-indigo-900/30 border border-indigo-700 rounded">
              <div className="text-xs text-stone-400">Total</div>
              <div className="text-2xl font-bold text-indigo-300">
                {parseInt(rollValue) + parseInt(modifierValue || '0')}
              </div>
              <div
                className={`text-xs font-medium mt-1 ${
                  parseInt(rollValue) + parseInt(modifierValue || '0') >= challenge.dc
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {parseInt(rollValue) + parseInt(modifierValue || '0') >= challenge.dc
                  ? 'Success!'
                  : 'Failure'}
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!selectedParticipant || !rollValue}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-stone-700 disabled:text-stone-500 disabled:cursor-not-allowed text-white font-medium rounded transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="Check" size={16} />
            Submit Roll
          </button>
        </form>
      )}
    </div>
  )
}
