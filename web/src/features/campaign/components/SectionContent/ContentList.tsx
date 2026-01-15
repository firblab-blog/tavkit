// Content list grid display

import Icon from '@/components/common/Icon'
import type { CampaignContent } from '../../types'

interface ContentListProps {
  entries: CampaignContent[]
  searchQuery: string
  onSelectEntry: (entryId: string) => void
  onClearSearch: () => void
}

export function ContentList({
  entries,
  searchQuery,
  onSelectEntry,
  onClearSearch,
}: ContentListProps) {
  // Filter entries based on search query
  const filteredEntries = searchQuery.trim()
    ? entries.filter((entry) => {
        const query = searchQuery.toLowerCase()
        const titleMatch = entry.title?.toLowerCase().includes(query)
        const contentMatch = entry.content?.toLowerCase().includes(query)
        const subsectionMatch = entry.subsection?.toLowerCase().includes(query)
        return titleMatch || contentMatch || subsectionMatch
      })
    : entries

  // No results found
  if (filteredEntries.length === 0 && searchQuery) {
    return (
      <div className="text-center py-12 bg-surface border border-dashed border-border rounded-lg">
        <Icon name="Search" className="w-16 h-16 text-text-muted mx-auto mb-3 opacity-50" />
        <p className="text-text-muted mb-2">No results found for "{searchQuery}"</p>
        <p className="text-sm text-text-muted">Try adjusting your search terms</p>
        <button
          onClick={onClearSearch}
          className="mt-4 px-4 py-2 bg-surface hover:bg-surface-hover text-text rounded-lg transition-colors border border-border"
        >
          Clear Search
        </button>
      </div>
    )
  }

  return (
    <>
      {searchQuery && (
        <p className="text-sm text-text-muted mb-4">
          Showing {filteredEntries.length} of {entries.length} entries
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelectEntry(entry.id)}
            className="bg-surface border border-border hover:border-primary/50 rounded-lg p-4 transition-all hover:shadow-lg text-left group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-text group-hover:text-primary transition-colors line-clamp-1">
                {entry.title}
              </h4>
              <Icon
                name="ChevronRight"
                className="w-4 h-4 text-text-muted flex-shrink-0 group-hover:text-primary transition-colors"
              />
            </div>
            {entry.subsection && (
              <span className="inline-block px-2 py-0.5 text-xs bg-background text-text-muted rounded mb-2">
                {entry.subsection}
              </span>
            )}
            <p className="text-sm text-text-muted line-clamp-2">
              {entry.content?.replace(/[#*_`]/g, '').substring(0, 120)}...
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-text-muted">
              <Icon
                name={entry.type === 'imported' ? 'Sparkles' : 'FileText'}
                className="w-3 h-3"
              />
              <span>{entry.type === 'imported' ? 'AI Generated' : 'Manual'}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
