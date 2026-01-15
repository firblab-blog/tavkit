import { useState } from 'react'
import { useCampaignStore } from '../../../../store/campaignStore'
import { useGeneratorModalStore, GeneratorType } from '../../../../store/generatorModalStore'
import Icon from '../../../common/Icon'
import { LibraryContentTab } from './library'

/**
 * LibraryTab - Saved content library view.
 *
 * Shows the full content library with sub-tabs for each content type.
 * Quick create actions are available in a collapsible section.
 */
export default function LibraryTab() {
  const { activeCampaignId } = useCampaignStore()
  const { openGenerator } = useGeneratorModalStore()
  const [showQuickCreate, setShowQuickCreate] = useState(false)

  return (
    <div className="space-y-6">
      {/* Quick Create Actions (Collapsible) */}
      <div className="bg-background-panel border border-border rounded-xl">
        <button
          onClick={() => setShowQuickCreate(!showQuickCreate)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            <div>
              <h4 className="text-sm font-medium text-text">Quick Create</h4>
              <p className="text-xs text-text-muted">Generate new content with AI</p>
            </div>
          </div>
          <Icon
            name={showQuickCreate ? 'ChevronUp' : 'ChevronDown'}
            className="w-5 h-5 text-text-muted"
          />
        </button>
        {showQuickCreate && (
          <div className="px-4 pb-4 border-t border-border pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'NPC', icon: 'Users', type: 'npc' as GeneratorType, color: 'emerald' },
                { label: 'Monster', icon: 'Skull', type: 'monster' as GeneratorType, color: 'orange' },
                { label: 'Location', icon: 'MapPin', type: 'location' as GeneratorType, color: 'cyan' },
                { label: 'Quest', icon: 'Scroll', type: 'quest' as GeneratorType, color: 'amber' },
                { label: 'Item', icon: 'Package', type: 'item' as GeneratorType, color: 'purple' },
                { label: 'Encounter', icon: 'Swords', type: 'encounter' as GeneratorType, color: 'red' },
                { label: 'Tavern', icon: 'Beer', type: 'tavern' as GeneratorType, color: 'yellow' },
                { label: 'Merchant', icon: 'Store', type: 'merchant' as GeneratorType, color: 'teal' },
              ].map((gen) => (
                <button
                  key={gen.label}
                  onClick={() => openGenerator(gen.type)}
                  className="p-3 bg-background border border-border rounded-lg hover:border-primary/40 transition-colors flex items-center gap-2"
                >
                  <Icon name={gen.icon as any} className={`w-4 h-4 text-${gen.color}-400`} />
                  <span className="text-sm font-medium text-text">{gen.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full Library Content Tab - no filter in campaign context, only shows this campaign's content */}
      <LibraryContentTab campaignId={activeCampaignId || undefined} showCampaignFilter={false} />
    </div>
  )
}
