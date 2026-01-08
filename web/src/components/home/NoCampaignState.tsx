import { useContainerStore } from '../../store/containerStore'
import Icon from '../common/Icon'

export default function NoCampaignState() {
  const { openContainer } = useContainerStore()

  const createCampaign = () => {
    openContainer({
      type: 'internal',
      tool: 'campaign',
      title: 'Campaign Ledger',
    })
  }

  return (
    <div className="bg-background-panel border border-border rounded-lg p-12 text-center">
      <div className="max-w-2xl mx-auto">
        <Icon name="BookOpen" className="w-20 h-20 text-primary mx-auto mb-6 opacity-50" />
        <h2 className="text-3xl font-bold text-text mb-4">Welcome to TavKit!</h2>
        <p className="text-text-muted text-lg mb-8">
          Get started by creating your first campaign. All your generated content, session runners,
          and campaign management will be organized here.
        </p>
        <button
          onClick={createCampaign}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 text-white rounded-lg font-semibold transition-colors shadow-lg"
        >
          <Icon name="Plus" className="w-5 h-5" />
          Create Your First Campaign
        </button>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-4 bg-background rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="Sparkles" className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-text">Prep Sessions</h3>
            </div>
            <p className="text-sm text-text-muted">
              Use AI generators to create NPCs, locations, quests, and more for your campaigns
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="Swords" className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-text">Run Sessions</h3>
            </div>
            <p className="text-sm text-text-muted">
              Track combat, chases, social encounters, and more with interactive session runners
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="BookMarked" className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-text">Organize Content</h3>
            </div>
            <p className="text-sm text-text-muted">
              Keep all your campaign notes, generated content, and session history in one place
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
