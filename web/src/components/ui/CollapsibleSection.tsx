import { useState } from 'react'
import Icon from '../common/Icon'

interface CollapsibleSectionProps {
  title: string
  icon?: any // Support any icon name
  defaultExpanded?: boolean
  isExpanded?: boolean // Controlled mode
  onToggle?: (expanded: boolean) => void // Controlled mode
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
  forceExpanded?: boolean // Desktop: always expanded
}

export const CollapsibleSection = ({
  title,
  icon,
  defaultExpanded = true,
  isExpanded: controlledExpanded,
  onToggle,
  children,
  className = '',
  headerClassName = '',
  contentClassName = '',
  forceExpanded = false,
}: CollapsibleSectionProps) => {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)

  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded

  const handleToggle = () => {
    if (forceExpanded) return // Don't allow collapse on desktop

    const newExpanded = !isExpanded
    setInternalExpanded(newExpanded)
    onToggle?.(newExpanded)
  }

  return (
    <div
      className={`bg-background-panel border border-border rounded-lg overflow-hidden ${className}`}
    >
      {/* Header - Always visible */}
      <button
        onClick={handleToggle}
        className={`
          w-full flex items-center justify-between p-4
          ${!forceExpanded ? 'hover:bg-background/30 cursor-pointer' : 'cursor-default'}
          transition-colors
          ${headerClassName}
        `}
        disabled={forceExpanded}
        aria-expanded={isExpanded}
        type="button"
      >
        <div className="flex items-center gap-3">
          {icon && <Icon name={icon} className="w-5 h-5 text-text-muted" />}
          <h3 className="text-lg font-semibold text-text">{title}</h3>
        </div>

        {!forceExpanded && (
          <Icon
            name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
            className="w-5 h-5 text-text-muted transition-transform duration-300"
          />
        )}
      </button>

      {/* Content - Collapsible on mobile, always visible on desktop */}
      <div
        className={`
          transition-all duration-300 ease-in-out overflow-hidden
          ${isExpanded || forceExpanded ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className={`p-4 pt-0 ${contentClassName}`}>{children}</div>
      </div>
    </div>
  )
}
