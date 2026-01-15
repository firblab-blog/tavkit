import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon, { IconName } from '../../../common/Icon'
import { useGeneratorModalStore, GeneratorType } from '../../../../store/generatorModalStore'

type ColorVariant = 'emerald' | 'purple' | 'amber'

interface CategoryItem {
  label: string
  path: string
  icon: IconName
  description?: string
}

// Map generator paths to GeneratorType
const PATH_TO_GENERATOR: Record<string, GeneratorType> = {
  '/dashboard/gm/generator/npc': 'npc',
  '/dashboard/gm/generator/monster': 'monster',
  '/dashboard/gm/generator/encounter': 'encounter',
  '/dashboard/gm/generator/dialogue': 'dialogue',
  '/dashboard/gm/generator/location': 'location',
  '/dashboard/gm/generator/quest': 'quest',
  '/dashboard/gm/generator/item': 'item',
  '/dashboard/gm/generator/rumor': 'rumor',
  '/dashboard/gm/generator/tavern': 'tavern',
  '/dashboard/gm/generator/merchant': 'merchant',
  '/dashboard/gm/generator/trap': 'trap',
  '/dashboard/gm/generator/critter': 'critter',
  '/dashboard/gm/generator/chase': 'chase',
}

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle: string
  color: ColorVariant
  items: CategoryItem[]
}

/**
 * CategoryModal - Modal displaying items for a workflow category.
 *
 * Features:
 * - Backdrop blur with click-to-close
 * - Escape key handling
 * - Color-coded header gradient
 * - Grid of navigable items with hover effects
 */
export default function CategoryModal({
  isOpen,
  onClose,
  title,
  subtitle,
  color,
  items,
}: CategoryModalProps) {
  const navigate = useNavigate()
  const { openGenerator } = useGeneratorModalStore()

  // Color mappings for header gradient
  const colorClasses: Record<
    ColorVariant,
    {
      headerGradient: string
      subtitleText: string
    }
  > = {
    emerald: {
      headerGradient: 'from-emerald-500/10 to-transparent',
      subtitleText: 'text-emerald-400',
    },
    purple: {
      headerGradient: 'from-purple-500/10 to-transparent',
      subtitleText: 'text-purple-400',
    },
    amber: {
      headerGradient: 'from-amber-500/10 to-transparent',
      subtitleText: 'text-amber-400',
    },
  }

  const colors = colorClasses[color]

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Handle item click - check if it's a generator path
  const handleItemClick = (path: string) => {
    const generatorType = PATH_TO_GENERATOR[path]
    if (generatorType) {
      // Open generator modal instead of navigating
      openGenerator(generatorType)
    } else {
      // Regular navigation for non-generator items
      navigate(path)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-background-panel border border-primary/40 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`p-6 border-b border-border bg-gradient-to-r ${colors.headerGradient}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text">{title}</h2>
              <p className={`${colors.subtitleText} font-medium mt-1`}>{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <Icon name="X" className="w-6 h-6 text-text-muted hover:text-text" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <button
                key={item.path}
                onClick={() => handleItemClick(item.path)}
                className="group p-4 bg-background hover:bg-background-panel border border-border hover:border-primary/40 rounded-xl transition-all hover:scale-105 text-left"
              >
                <Icon
                  name={item.icon}
                  className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
                />
                <div className="font-bold text-text mb-1">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-text-muted">{item.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
