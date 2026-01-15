import { useSearchParams } from 'react-router-dom'
import Icon, { IconName } from '../../../../common/Icon'
import NPCsContent from './NPCsContent'
import MonstersContent from './MonstersContent'
import EncountersContent from './EncountersContent'
import DialoguesContent from './DialoguesContent'
import LocationsContent from './LocationsContent'
import QuestsContent from './QuestsContent'
import ItemsContent from './ItemsContent'
import RumorsContent from './RumorsContent'
import TavernsContent from './TavernsContent'
import MerchantsContent from './MerchantsContent'
import TrapsContent from './TrapsContent'
import CrittersContent from './CrittersContent'
import ChasesContent from './ChasesContent'

export type LibrarySubTab =
  | 'npcs'
  | 'monsters'
  | 'encounters'
  | 'dialogues'
  | 'locations'
  | 'quests'
  | 'items'
  | 'rumors'
  | 'taverns'
  | 'merchants'
  | 'traps'
  | 'critters'
  | 'chases'

interface SubTabConfig {
  id: LibrarySubTab
  label: string
  icon: IconName
  color: string
}

const SUB_TABS: SubTabConfig[] = [
  { id: 'npcs', label: 'NPCs', icon: 'Users', color: 'emerald' },
  { id: 'monsters', label: 'Monsters', icon: 'Skull', color: 'orange' },
  { id: 'encounters', label: 'Encounters', icon: 'Swords', color: 'red' },
  { id: 'dialogues', label: 'Dialogues', icon: 'MessageSquare', color: 'blue' },
  { id: 'locations', label: 'Locations', icon: 'MapPin', color: 'cyan' },
  { id: 'quests', label: 'Quests', icon: 'Scroll', color: 'amber' },
  { id: 'items', label: 'Items', icon: 'Package', color: 'purple' },
  { id: 'rumors', label: 'Rumors', icon: 'Quote', color: 'rose' },
  { id: 'taverns', label: 'Taverns', icon: 'Beer', color: 'yellow' },
  { id: 'merchants', label: 'Merchants', icon: 'Store', color: 'teal' },
  { id: 'traps', label: 'Traps', icon: 'AlertTriangle', color: 'red' },
  { id: 'critters', label: 'Critters', icon: 'PawPrint', color: 'green' },
  { id: 'chases', label: 'Chases', icon: 'Zap', color: 'indigo' },
]

const VALID_SUB_TABS: LibrarySubTab[] = SUB_TABS.map((t) => t.id)

const tabColors: Record<string, string> = {
  emerald: 'text-emerald-400 border-emerald-400',
  orange: 'text-orange-400 border-orange-400',
  red: 'text-red-400 border-red-400',
  blue: 'text-blue-400 border-blue-400',
  cyan: 'text-cyan-400 border-cyan-400',
  amber: 'text-amber-400 border-amber-400',
  purple: 'text-purple-400 border-purple-400',
  rose: 'text-rose-400 border-rose-400',
  yellow: 'text-yellow-400 border-yellow-400',
  teal: 'text-teal-400 border-teal-400',
  green: 'text-green-400 border-green-400',
  indigo: 'text-indigo-400 border-indigo-400',
}

interface LibraryContentTabProps {
  /** Campaign ID to filter content (optional) */
  campaignId?: string
  /** Show campaign filter dropdown */
  showCampaignFilter?: boolean
}

/**
 * LibraryContentTab - Browse saved content library with sub-tabs.
 *
 * Shows 13 content types: NPCs, Monsters, Encounters, Dialogues, Locations,
 * Quests, Items, Rumors, Taverns, Merchants, Traps, Critters, Chases.
 *
 * URL state: ?tab=library&subtab=npcs
 */
export default function LibraryContentTab({
  campaignId,
  showCampaignFilter = true,
}: LibraryContentTabProps) {
  const [searchParams, setSearchParams] = useSearchParams()

  // Get sub-tab from URL, default to 'npcs'
  const subTabParam = searchParams.get('subtab')
  const activeSubTab: LibrarySubTab = VALID_SUB_TABS.includes(subTabParam as LibrarySubTab)
    ? (subTabParam as LibrarySubTab)
    : 'npcs'

  const setActiveSubTab = (tab: LibrarySubTab) => {
    setSearchParams(
      (prev) => {
        prev.set('subtab', tab)
        return prev
      },
      { replace: true, preventScrollReset: true }
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text flex items-center gap-2">
          <Icon name="Library" className="w-5 h-5 text-primary" />
          Content Library
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Browse all your saved NPCs, monsters, locations, and more.
        </p>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex gap-1 border-b border-border pb-1 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap
              ${
                activeSubTab === tab.id
                  ? `${tabColors[tab.color]} border-b-2 -mb-[3px]`
                  : 'text-text-muted hover:text-text'
              }`}
          >
            <Icon name={tab.icon} className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[300px]">
        {activeSubTab === 'npcs' && (
          <NPCsContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'monsters' && (
          <MonstersContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'encounters' && (
          <EncountersContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'dialogues' && (
          <DialoguesContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'locations' && (
          <LocationsContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'quests' && (
          <QuestsContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'items' && (
          <ItemsContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'rumors' && (
          <RumorsContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'taverns' && (
          <TavernsContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'merchants' && (
          <MerchantsContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'traps' && (
          <TrapsContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'critters' && (
          <CrittersContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
        {activeSubTab === 'chases' && (
          <ChasesContent campaignId={campaignId} showCampaignFilter={showCampaignFilter} />
        )}
      </div>
    </div>
  )
}
