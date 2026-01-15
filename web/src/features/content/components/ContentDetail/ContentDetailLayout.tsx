// Shared layout/modal wrapper for content detail views

import Icon, { type IconName } from '@/components/common/Icon'

export type ContentType =
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

interface ContentDetailLayoutProps {
  type: ContentType
  createdAt: string
  aiGenerated?: boolean
  onClose: () => void
  children: React.ReactNode
}

const typeIcons: Record<ContentType, IconName> = {
  npcs: 'Users',
  monsters: 'Shield',
  encounters: 'Swords',
  dialogues: 'MessageSquare',
  locations: 'Map',
  quests: 'Scroll',
  items: 'Package',
  rumors: 'Quote',
  taverns: 'Beer',
  merchants: 'Package',
  traps: 'AlertCircle',
  critters: 'Shield',
  chases: 'ArrowRight',
}

function formatTypeName(type: ContentType): string {
  // Remove trailing 's' and capitalize
  const singular = type.slice(0, -1)
  return singular.charAt(0).toUpperCase() + singular.slice(1)
}

export function ContentDetailLayout({
  type,
  createdAt,
  aiGenerated,
  onClose,
  children,
}: ContentDetailLayoutProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl border border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Icon name={typeIcons[type]} className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-text">{formatTypeName(type)} Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
            aria-label="Close"
          >
            <Icon name="X" className="w-5 h-5 text-text-muted hover:text-text" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Icon name="Calendar" className="w-4 h-4" />
            <span>Created {new Date(createdAt).toLocaleDateString()}</span>
          </div>
          {aiGenerated && (
            <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">
              AI Generated
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
