// Monster Generator
// Rebuilt using the generator framework pattern

import { useState, useCallback } from 'react'
import { useGenerator, type GeneratorConfig } from '../hooks/useGenerator'
import { GeneratorLayout, EntryModeToggle, ManualEntryPreview, SaveModal } from '../components'
import { MonsterRenderer, formatMonsterForClipboard } from '../renderers/MonsterRenderer'
import {
  normalizeMonsterResponse,
  hasValidMonsterContent,
  type GeneratedMonsterData,
} from '../normalizers/monster'
import { defaultMonsterData, type ManualMonsterData } from '../schemas/monster'
import { MonsterAIForm } from './MonsterAIForm'
import { MonsterManualForm } from './MonsterManualForm'
import { generateMonster, saveMonster, type MonsterGenerationRequest } from '@/api/generators'

// ============================================================================
// Configuration
// ============================================================================

type MonsterParams = MonsterGenerationRequest

const monsterConfig: GeneratorConfig<GeneratedMonsterData, ManualMonsterData, MonsterParams> = {
  generateApi: generateMonster as unknown as (
    params: MonsterParams,
    timeout: number
  ) => Promise<Record<string, unknown>>,
  saveApi: (data) => saveMonster(data as Record<string, unknown>),
  normalizeResponse: normalizeMonsterResponse,
  hasValidContent: hasValidMonsterContent,
  entityKey: 'monster',
  defaultManualData: defaultMonsterData,

  buildSavePayload: (monster, campaignId) => ({
    name: monster.name,
    cr: monster.challenge_rating,
    stats: {
      type: monster.type,
      size: monster.size,
      alignment: monster.alignment,
      armor_class: monster.armor_class,
      hit_points: monster.hit_points,
      speed: monster.speed,
      abilities: monster.abilities,
      saving_throws: monster.saving_throws,
      skills: monster.skills,
      damage_resistances: monster.damage_resistances,
      damage_immunities: monster.damage_immunities,
      condition_immunities: monster.condition_immunities,
      senses: monster.senses,
      languages: monster.languages,
      challenge_rating: monster.challenge_rating,
      xp: monster.xp,
      traits: monster.traits,
      actions: monster.actions,
      legendary_actions: monster.legendary_actions,
      lair_actions: monster.lair_actions,
    },
    lore: monster.lore,
    tactics: `${monster.traits?.map((t) => t.name).join(', ') || ''} - ${monster.actions?.map((a) => a.name).join(', ') || ''}`,
    campaign_id: campaignId || undefined,
    ai_generated: true,
  }),

  buildManualSavePayload: (data, campaignId) => {
    const crValue = parseFloat(data.challenge_rating) || 1
    return {
      campaign_id: campaignId || undefined,
      name: data.name.trim(),
      cr: crValue,
      stats: {
        type: data.creature_type,
        size: data.size,
        alignment: data.alignment,
        armor_class: data.stats.ac || 10,
        hit_points: { average: data.stats.hp || 1, dice: '' },
        speed: data.stats.speed ? { walk: parseInt(data.stats.speed) || 30 } : { walk: 30 },
        abilities: {
          STR: data.stats.str || 10,
          DEX: data.stats.dex || 10,
          CON: data.stats.con || 10,
          INT: data.stats.int || 10,
          WIS: data.stats.wis || 10,
          CHA: data.stats.cha || 10,
        },
        damage_resistances: data.damage_resistances.filter((r) => r.trim()),
        damage_immunities: data.damage_immunities.filter((i) => i.trim()),
        condition_immunities: data.condition_immunities.filter((c) => c.trim()),
        senses: {},
        languages: data.languages.filter((l) => l.trim()),
        challenge_rating: crValue,
        xp: 0,
        traits: data.traits.filter((t) => t.name.trim()),
        actions: data.actions.filter((a) => a.name.trim()),
        legendary_actions: data.legendary_actions.filter((a) => a.name.trim()),
      },
      lore: data.lore.trim() || '',
      tactics: data.tactics.trim() || '',
      ai_generated: false,
    }
  },
}

// ============================================================================
// Component
// ============================================================================

export function MonsterGenerator() {
  const state = useGenerator(monsterConfig)

  // AI form state
  const [formData, setFormData] = useState({
    monster_type: 'aberration',
    size: 'medium',
    challenge_rating: 5,
    environment: 'dungeon',
    special_requests: '',
  })

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate(formData)
  }, [state, formData])

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(formatMonsterForClipboard(state.generatedData))
    }
  }, [state.generatedData])

  // Build form content based on entry mode
  const formContent =
    state.entryMode === 'ai' ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <MonsterAIForm
          campaignId={state.campaignId}
          onCampaignSelect={state.handleCampaignSelect}
          formData={formData}
          setFormData={setFormData}
          aiSettings={state.aiSettings}
          setAiSettings={state.setAiSettings}
        />
      </>
    ) : (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <MonsterManualForm
          campaignId={state.campaignId}
          onCampaignSelect={state.handleCampaignSelect}
          manualData={state.manualData}
          setManualData={state.setManualData}
          onSave={state.saveManual}
          saving={state.manualSaving}
          saved={state.manualSaved}
          error={state.error}
        />
      </>
    )

  // Build result content
  const resultContent = state.generatedData ? (
    <MonsterRenderer
      monster={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : state.entryMode === 'manual' ? (
    <ManualEntryPreview entityType="Monster" />
  ) : null

  return (
    <>
      <GeneratorLayout
        title="Monster Generator"
        description="Create custom monsters with complete stat blocks and lore"
        icon="Skull"
        formTitle={state.entryMode === 'ai' ? 'Monster Details' : 'Manual Entry'}
        formIcon={state.entryMode === 'ai' ? 'Sparkles' : 'Edit'}
        resultsTitle={state.entryMode === 'ai' ? 'Generated Monster' : 'Preview'}
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Monster"
        generateButtonIcon="Sparkles"
        error={state.entryMode === 'ai' ? state.error ?? undefined : undefined}
        hideGenerateButton={state.entryMode === 'manual'}
      />

      {/* Save Modal */}
      {state.generatedData && (
        <SaveModal
          isOpen={state.showSaveModal}
          onClose={() => state.setShowSaveModal(false)}
          onSave={state.saveGenerated}
          entityName={state.generatedData.name}
          campaignId={state.campaignId}
        />
      )}
    </>
  )
}

export default MonsterGenerator
