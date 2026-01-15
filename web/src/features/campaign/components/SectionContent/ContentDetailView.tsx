// Content detail view for a selected entry

import ReactMarkdown from 'react-markdown'
import Icon from '@/components/common/Icon'
import type { CampaignContent } from '../../types'

interface ContentDetailViewProps {
  entry: CampaignContent
  sectionName: string
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  renderExtras?: React.ReactNode
}

export function ContentDetailView({
  entry,
  sectionName,
  onBack,
  onEdit,
  onDelete,
  renderExtras,
}: ContentDetailViewProps) {
  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-3 py-2 text-text hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
      >
        <Icon name="ChevronLeft" className="w-4 h-4" />
        <span className="text-sm font-medium">Back to {sectionName}</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-2xl font-bold text-text">{entry.title}</h3>
            {entry.type === 'imported' && (
              <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                AI Generated
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted">
            {entry.type === 'imported' && entry.file_name ? `From: ${entry.file_name} • ` : ''}
            Updated {new Date(entry.updated_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-surface hover:bg-surface-hover text-text font-medium rounded-lg transition-colors flex items-center gap-2 border border-border"
          >
            <Icon name="Edit" className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Icon name="Trash2" className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-border pt-4">
        {renderContent(entry.content)}
        {renderExtras}
      </div>
    </div>
  )
}

function renderContent(content: string | undefined) {
  if (!content) {
    return <p className="text-text-muted">No content</p>
  }

  // Check if content is base64 image
  if (content.startsWith('data:image/')) {
    return (
      <div className="flex justify-center">
        <img
          src={content}
          alt="Content"
          className="max-w-full h-auto rounded-lg border border-border"
        />
      </div>
    )
  }

  // Check if content is base64 audio
  if (content.startsWith('data:audio/')) {
    return (
      <div className="flex justify-center">
        <audio controls className="w-full max-w-2xl" src={content}>
          Your browser does not support the audio element.
        </audio>
      </div>
    )
  }

  // Default: render as markdown
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
