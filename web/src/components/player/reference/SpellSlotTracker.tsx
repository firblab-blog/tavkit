import { useEffect, useState } from 'react'
import Icon from '../../common/Icon'
import { useAbilityTrackingStore, SpellSlotConfig } from '../../../store/abilityTrackingStore'

interface SpellSlotTrackerProps {
  characterId?: string
}

// Ordinal suffix helper
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// Default spell slots for quick setup (standard 5e progression)
const SPELL_SLOT_TEMPLATES: Record<string, SpellSlotConfig[]> = {
  'Level 1': [{ level: 1, max: 2, used: 0 }],
  'Level 3': [
    { level: 1, max: 4, used: 0 },
    { level: 2, max: 2, used: 0 },
  ],
  'Level 5': [
    { level: 1, max: 4, used: 0 },
    { level: 2, max: 3, used: 0 },
    { level: 3, max: 2, used: 0 },
  ],
  'Level 9': [
    { level: 1, max: 4, used: 0 },
    { level: 2, max: 3, used: 0 },
    { level: 3, max: 3, used: 0 },
    { level: 4, max: 3, used: 0 },
    { level: 5, max: 1, used: 0 },
  ],
}

export default function SpellSlotTracker({ characterId }: SpellSlotTrackerProps) {
  const { spellSlots, loading, fetchSpellSlots, useSpellSlot, restoreSpellSlot, setSpellSlots } =
    useAbilityTrackingStore()

  const [showSetup, setShowSetup] = useState(false)
  const [customSlots, setCustomSlots] = useState<SpellSlotConfig[]>([])

  useEffect(() => {
    if (characterId) {
      fetchSpellSlots(characterId)
    }
  }, [characterId, fetchSpellSlots])

  useEffect(() => {
    setCustomSlots(spellSlots.length > 0 ? spellSlots : [{ level: 1, max: 2, used: 0 }])
  }, [spellSlots])

  const handleUseSlot = (level: number) => {
    if (characterId) {
      useSpellSlot(characterId, level)
    }
  }

  const handleRestoreSlot = (level: number) => {
    if (characterId) {
      restoreSpellSlot(characterId, level)
    }
  }

  const handleApplyTemplate = (templateName: string) => {
    if (characterId) {
      const template = SPELL_SLOT_TEMPLATES[templateName]
      if (template) {
        setSpellSlots(characterId, template)
      }
    }
  }

  const handleSaveCustom = () => {
    if (characterId && customSlots.length > 0) {
      setSpellSlots(
        characterId,
        customSlots.filter((s) => s.max > 0)
      )
      setShowSetup(false)
    }
  }

  const addSlotLevel = () => {
    const nextLevel = customSlots.length > 0 ? Math.max(...customSlots.map((s) => s.level)) + 1 : 1
    if (nextLevel <= 9) {
      setCustomSlots([...customSlots, { level: nextLevel, max: 1, used: 0 }])
    }
  }

  const removeSlotLevel = (level: number) => {
    setCustomSlots(customSlots.filter((s) => s.level !== level))
  }

  const updateSlotMax = (level: number, max: number) => {
    setCustomSlots(
      customSlots.map((s) => (s.level === level ? { ...s, max: Math.max(0, max) } : s))
    )
  }

  if (!characterId) {
    return (
      <div className="text-center py-8 text-text-muted">
        Select a character to track spell slots.
      </div>
    )
  }

  // Setup view
  if (showSetup || spellSlots.length === 0) {
    return (
      <div className="bg-background-panel border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-purple-400" />
            Set Up Spell Slots
          </h3>
          {spellSlots.length > 0 && (
            <button onClick={() => setShowSetup(false)} className="text-text-muted hover:text-text">
              <Icon name="X" className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Templates */}
        <div className="mb-4">
          <p className="text-sm text-text-muted mb-2">Quick setup by caster level:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(SPELL_SLOT_TEMPLATES).map((name) => (
              <button
                key={name}
                onClick={() => handleApplyTemplate(name)}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Setup */}
        <div className="border-t border-border pt-4">
          <p className="text-sm text-text-muted mb-3">Or customize your slots:</p>
          <div className="space-y-2 mb-4">
            {customSlots.map((slot) => (
              <div key={slot.level} className="flex items-center gap-3">
                <span className="text-text w-20">{getOrdinal(slot.level)} Level</span>
                <input
                  type="number"
                  value={slot.max}
                  onChange={(e) => updateSlotMax(slot.level, parseInt(e.target.value) || 0)}
                  min="0"
                  max="10"
                  className="w-16 px-2 py-1 bg-background border border-border rounded text-text text-center"
                />
                <span className="text-text-muted text-sm">slots</span>
                <button
                  onClick={() => removeSlotLevel(slot.level)}
                  className="ml-auto p-1 text-red-400 hover:text-red-300"
                >
                  <Icon name="Trash2" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {customSlots.length < 9 && (
              <button
                onClick={addSlotLevel}
                className="px-3 py-1.5 bg-background hover:bg-background-panel border border-border rounded-lg text-text-muted hover:text-text text-sm flex items-center gap-1"
              >
                <Icon name="Plus" className="w-4 h-4" />
                Add Level
              </button>
            )}
            <button
              onClick={handleSaveCustom}
              className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium"
            >
              Save Slots
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Normal tracking view
  return (
    <div className="bg-background-panel border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <Icon name="Sparkles" className="w-5 h-5 text-purple-400" />
          Spell Slots
        </h3>
        <button
          onClick={() => setShowSetup(true)}
          className="p-1.5 text-text-muted hover:text-text hover:bg-background rounded transition-colors"
          title="Configure spell slots"
        >
          <Icon name="Settings" className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {spellSlots.map((slot) => {
          const available = slot.max - slot.used

          return (
            <div key={slot.level} className="flex items-center gap-3">
              {/* Level label */}
              <div className="w-16 text-sm font-medium text-text">{getOrdinal(slot.level)}</div>

              {/* Slot indicators */}
              <div className="flex-1 flex items-center gap-1">
                {Array.from({ length: slot.max }).map((_, idx) => {
                  const isUsed = idx < slot.used
                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        isUsed ? handleRestoreSlot(slot.level) : handleUseSlot(slot.level)
                      }
                      disabled={loading}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        isUsed
                          ? 'bg-gray-600/30 border-gray-500/50 hover:border-purple-400'
                          : 'bg-purple-500/20 border-purple-500/50 hover:border-purple-400 hover:bg-purple-500/30'
                      }`}
                      title={isUsed ? 'Click to restore' : 'Click to use'}
                    >
                      {!isUsed && (
                        <Icon name="Sparkles" className="w-4 h-4 text-purple-400 mx-auto" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Counter */}
              <div className="w-12 text-right text-sm">
                <span className={available > 0 ? 'text-purple-400' : 'text-gray-500'}>
                  {available}
                </span>
                <span className="text-text-muted">/{slot.max}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Usage bar */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-text-muted">Total Usage</span>
          <span className="text-text">
            {spellSlots.reduce((sum, s) => sum + (s.max - s.used), 0)} available
          </span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all"
            style={{
              width: `${
                spellSlots.length > 0
                  ? (spellSlots.reduce((sum, s) => sum + (s.max - s.used), 0) /
                      spellSlots.reduce((sum, s) => sum + s.max, 0)) *
                    100
                  : 0
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
