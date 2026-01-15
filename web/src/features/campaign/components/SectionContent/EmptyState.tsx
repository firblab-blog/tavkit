// Empty state when no entries exist

import Icon from '@/components/common/Icon'

interface EmptyStateProps {
  sectionId: string
  onImportFromRoster?: () => void
}

export function EmptyState({ sectionId, onImportFromRoster }: EmptyStateProps) {
  const isPCs = sectionId === 'pcs'

  return (
    <div className="text-center py-12 bg-surface border border-dashed border-border rounded-lg">
      <Icon name="FileText" className="w-16 h-16 text-text-muted mx-auto mb-3 opacity-50" />
      <p className="text-text-muted mb-4">No entries yet for this section</p>
      <p className="text-sm text-text-muted">
        {isPCs
          ? 'Import characters from the Guild Roster to get started'
          : 'Create a new entry or import a file to get started'}
      </p>
      {isPCs && onImportFromRoster && (
        <button
          onClick={onImportFromRoster}
          className="mt-4 px-4 py-2 bg-primary hover:bg-primary-dark text-background font-medium rounded-lg transition-colors"
        >
          Import from Guild Roster
        </button>
      )}
    </div>
  )
}
