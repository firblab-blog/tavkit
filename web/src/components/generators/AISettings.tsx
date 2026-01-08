import { useState, useEffect } from 'react'
import Icon from '../common/Icon'
import { logger } from '@/utils/logger'

export interface AIGenerationSettings {
  detailLevel: 'low' | 'medium' | 'high' | 'very-high'
  timeout: number
}

interface AISettingsProps {
  generatorType: string
  onSettingsChange?: (settings: AIGenerationSettings) => void
}

const DETAIL_LEVELS = {
  low: {
    label: 'Low',
    tokens: 1024,
    description: 'Quick, concise responses',
    warning: 'May truncate complex content',
  },
  medium: {
    label: 'Medium',
    tokens: 2048,
    description: 'Balanced detail',
    warning: 'Suitable for most content',
  },
  high: {
    label: 'High',
    tokens: 4096,
    description: 'Detailed responses',
    warning: 'Recommended for most content',
  },
  'very-high': {
    label: 'Very High',
    tokens: 8192,
    description: 'Maximum detail',
    warning: 'Best for complex content',
  },
} as const

// Default detail level for ALL generators
const DEFAULT_DETAIL_LEVEL: AIGenerationSettings['detailLevel'] = 'high'

export default function AISettings({ generatorType, onSettingsChange }: AISettingsProps) {
  const [expanded, setExpanded] = useState(false)
  const [detailLevel, setDetailLevel] =
    useState<AIGenerationSettings['detailLevel']>(DEFAULT_DETAIL_LEVEL)
  const [timeoutValue, setTimeoutValue] = useState(120)

  // Load settings from localStorage on mount
  useEffect(() => {
    const storageKey = `ai-settings-${generatorType}`
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const settings = JSON.parse(stored) as AIGenerationSettings
        setDetailLevel(settings.detailLevel)
        setTimeoutValue(settings.timeout)
      } catch (e) {
        logger.error('Failed to load AI settings:', e)
      }
    }
  }, [generatorType])

  // Save settings to localStorage and notify parent
  useEffect(() => {
    const settings: AIGenerationSettings = { detailLevel, timeout: timeoutValue }
    const storageKey = `ai-settings-${generatorType}`
    localStorage.setItem(storageKey, JSON.stringify(settings))
    onSettingsChange?.(settings)
  }, [detailLevel, timeoutValue, generatorType, onSettingsChange])

  const getTokenCount = () => DETAIL_LEVELS[detailLevel].tokens

  return (
    <div className="border border-border rounded-lg bg-background-panel">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-background-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon name="Settings" className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">Generation Settings</span>
          <span className="text-xs text-text-secondary">
            ({DETAIL_LEVELS[detailLevel].label}, {getTokenCount()} tokens)
          </span>
        </div>
        <Icon
          name="ChevronRight"
          className={`w-4 h-4 text-text-secondary transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* Detail Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-text-primary">Detail Level</label>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(DETAIL_LEVELS).map(([key, { label, description }]) => (
                <button
                  key={key}
                  onClick={() => setDetailLevel(key as AIGenerationSettings['detailLevel'])}
                  className={`px-3 py-2 text-xs rounded border transition-colors ${
                    detailLevel === key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border text-text-secondary hover:bg-background-hover hover:border-primary'
                  }`}
                  title={description}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-2">
              {DETAIL_LEVELS[detailLevel].description} • {getTokenCount()} tokens
              <span className="text-amber-500 ml-2">{DETAIL_LEVELS[detailLevel].warning}</span>
            </p>
          </div>

          {/* Timeout */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Timeout: {timeoutValue}s
            </label>
            <input
              type="range"
              min={30}
              max={300}
              value={timeoutValue}
              onChange={(e) => setTimeoutValue(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>30s</span>
              <span>5min</span>
            </div>
          </div>

          {/* Info */}
          <div className="bg-background border border-border rounded p-3 text-xs text-text-secondary">
            <div className="flex items-start gap-2">
              <Icon name="AlertCircle" className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-text-primary">About these settings:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Higher detail levels generate more comprehensive content</li>
                  <li>Too low settings may cause incomplete/truncated results</li>
                  <li>Increased timeout allows for more complex generations</li>
                  <li>Settings are saved per generator type</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Export utility function to get token count from settings
export function getMaxTokensFromSettings(settings: AIGenerationSettings): number {
  return DETAIL_LEVELS[settings.detailLevel].tokens
}
