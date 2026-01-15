import { memo } from 'react'
import Icon, { IconName } from '../../../common/Icon'

type ColorVariant = 'emerald' | 'purple' | 'amber'

interface WorkflowButtonProps {
  title: string
  subtitle: string
  description: string
  icon: IconName
  color: ColorVariant
  onClick: () => void
}

/**
 * WorkflowButton - Large, polished button for workflow categories.
 *
 * Features:
 * - Gradient background with hover effects
 * - Scale and shadow animations
 * - Color-coded by category (emerald, purple, amber)
 * - Radial glow on hover
 */
const WorkflowButton = memo(function WorkflowButton({
  title,
  subtitle,
  description,
  icon,
  color,
  onClick,
}: WorkflowButtonProps) {
  // Color mappings for different variants
  const colorClasses: Record<
    ColorVariant,
    {
      border: string
      hoverBorder: string
      hoverShadow: string
      subtitleText: string
      glowFrom: string
    }
  > = {
    emerald: {
      border: 'border-emerald-500/50',
      hoverBorder: 'hover:border-emerald-400',
      hoverShadow: 'hover:shadow-emerald-500/20',
      subtitleText: 'text-emerald-400',
      glowFrom: 'from-emerald-500/10',
    },
    purple: {
      border: 'border-purple-500/50',
      hoverBorder: 'hover:border-purple-400',
      hoverShadow: 'hover:shadow-purple-500/20',
      subtitleText: 'text-purple-400',
      glowFrom: 'from-purple-500/10',
    },
    amber: {
      border: 'border-amber-500/50',
      hoverBorder: 'hover:border-amber-400',
      hoverShadow: 'hover:shadow-amber-500/20',
      subtitleText: 'text-amber-400',
      glowFrom: 'from-amber-500/10',
    },
  }

  const colors = colorClasses[color]

  return (
    <button
      onClick={onClick}
      className={`
        group relative p-6 sm:p-8
        bg-gradient-to-br from-background to-background-panel
        border-2 ${colors.border} ${colors.hoverBorder}
        rounded-2xl text-left
        transition-all duration-300
        hover:scale-105 hover:shadow-2xl ${colors.hoverShadow}
        overflow-hidden
        w-full
      `}
    >
      {/* Decorative background glow on hover */}
      <div
        className={`absolute inset-0 bg-gradient-radial ${colors.glowFrom} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <Icon name={icon} className={`w-6 h-6 ${colors.subtitleText}`} />
          <h3 className="text-xl sm:text-2xl font-bold text-text tracking-wide">{title}</h3>
        </div>
        <p className={`${colors.subtitleText} font-semibold mb-2 sm:mb-3`}>{subtitle}</p>
        <p className="text-text-muted text-sm leading-relaxed">{description}</p>
      </div>
    </button>
  )
})

export default WorkflowButton
