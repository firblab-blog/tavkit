import { useState } from 'react'
import { Campaign } from '../../../store/campaignStore'
import PrepMenuModal from './PrepMenuModal'
import RunMenuModal from './RunMenuModal'

interface WorkflowButtonsProps {
  campaign: Campaign
}

export default function WorkflowButtons({ campaign }: WorkflowButtonsProps) {
  const [showPrepMenu, setShowPrepMenu] = useState(false)
  const [showRunMenu, setShowRunMenu] = useState(false)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Prep Session Button */}
        <button
          onClick={() => setShowPrepMenu(true)}
          className="group relative p-8 bg-gradient-to-br from-background to-background-panel border-2 border-primary hover:border-primary/80 rounded-2xl text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20 overflow-hidden"
        >
          {/* Decorative background glow */}
          <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-text mb-2 tracking-wide">PREP SESSION</h3>
            <p className="text-[#B87333] font-semibold mb-3">Artificer's Toolkit</p>
            <p className="text-text-muted text-sm leading-relaxed">
              Generate content for upcoming sessions with AI-powered generators
            </p>
          </div>
        </button>

        {/* Run Session Button */}
        <button
          onClick={() => setShowRunMenu(true)}
          className="group relative p-8 bg-gradient-to-br from-background to-background-panel border-2 border-primary hover:border-primary/80 rounded-2xl text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20 overflow-hidden"
        >
          {/* Decorative background glow */}
          <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-text mb-2 tracking-wide">RUN SESSION</h3>
            <p className="text-primary font-semibold mb-3">Tavern Toolkit</p>
            <p className="text-text-muted text-sm leading-relaxed">
              Track live sessions with interactive managers for combat, chases, and more
            </p>
          </div>
        </button>
      </div>

      {/* Modals */}
      {showPrepMenu && <PrepMenuModal campaign={campaign} onClose={() => setShowPrepMenu(false)} />}
      {showRunMenu && <RunMenuModal campaign={campaign} onClose={() => setShowRunMenu(false)} />}
    </>
  )
}
