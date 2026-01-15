// Content editor modal for creating/editing entries

import { useRef } from 'react'
import Icon from '@/components/common/Icon'
import MarkdownToolbar from '@/components/common/MarkdownToolbar'

interface ContentEditorProps {
  isOpen: boolean
  isEditing: boolean
  title: string
  content: string
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  onSave: () => void
  onClose: () => void
}

export function ContentEditor({
  isOpen,
  isEditing,
  title,
  content,
  onTitleChange,
  onContentChange,
  onSave,
  onClose,
}: ContentEditorProps) {
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-text">
            {isEditing ? 'Edit Entry' : 'New Entry'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded transition-colors"
          >
            <Icon name="X" className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              placeholder="Enter a title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Content</label>
            <MarkdownToolbar
              textareaRef={contentTextareaRef}
              value={content}
              onChange={onContentChange}
            />
            <textarea
              ref={contentTextareaRef}
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-b-lg text-text focus:outline-none focus:border-primary h-96 resize-none font-mono text-sm"
              placeholder="Enter your content here... (supports markdown)"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface border-t border-border p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-background hover:bg-surface-hover text-text font-medium rounded-lg transition-colors border border-border"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!title.trim()}
            className="px-6 py-2 bg-primary hover:bg-primary-dark text-background font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
