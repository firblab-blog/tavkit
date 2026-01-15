import { useEffect, useCallback } from 'react'
import Icon, { IconName } from './Icon'

interface ContentDetailModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Header icon name */
  icon?: IconName
  /** Icon background color (tailwind color name) */
  iconColor?: string
  /** Modal title */
  title: string
  /** Modal subtitle (optional) */
  subtitle?: string
  /** Delete button handler (shows delete button if provided) */
  onDelete?: () => void
  /** Delete button label */
  deleteLabel?: string
  /** Primary action button label */
  primaryLabel?: string
  /** Primary action button handler */
  onPrimaryAction?: () => void
  /** Additional footer content (rendered before action buttons) */
  footerLeft?: React.ReactNode
  /** Additional header content (rendered after close button) */
  headerRight?: React.ReactNode
  /** Modal content */
  children: React.ReactNode
  /** Max width class (default: max-w-5xl) */
  maxWidth?: string
}

const iconColorClasses: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-400' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
}

/**
 * ContentDetailModal - A reusable modal for displaying content details.
 *
 * Provides:
 * - Backdrop with click-outside-to-close
 * - Escape key handler
 * - Header with icon, title, subtitle, close button
 * - Scrollable content area
 * - Footer with delete button and action buttons
 * - Responsive sizing (95vh mobile, 90vh desktop)
 */
export default function ContentDetailModal({
  isOpen,
  onClose,
  icon,
  iconColor = 'blue',
  title,
  subtitle,
  onDelete,
  deleteLabel = 'Delete',
  primaryLabel = 'Close',
  onPrimaryAction,
  footerLeft,
  headerRight,
  children,
  maxWidth = 'max-w-5xl',
}: ContentDetailModalProps) {
  const colors = iconColorClasses[iconColor] || iconColorClasses.blue

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handlePrimaryClick = () => {
    if (onPrimaryAction) {
      onPrimaryAction()
    } else {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-background-panel border border-border rounded-xl w-full ${maxWidth} h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div
                className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}
              >
                <Icon name={icon} className={`w-5 h-5 ${colors.text}`} />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-text truncate">{title}</h3>
              {subtitle && <p className="text-sm text-text-muted truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerRight}
            <button
              onClick={onClose}
              className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-text"
            >
              <Icon name="X" className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</div>

        {/* Footer */}
        <div className="border-t border-border px-4 sm:px-6 py-4 flex justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <Icon name="Trash2" className="w-4 h-4" />
                {deleteLabel}
              </button>
            )}
            {footerLeft}
          </div>
          <button
            onClick={handlePrimaryClick}
            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
