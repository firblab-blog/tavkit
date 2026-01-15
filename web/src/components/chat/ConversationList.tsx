import React, { useState } from 'react'
import Icon from '../common/Icon'

export interface ChatConversation {
  id: string
  campaign_id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

interface ConversationListProps {
  conversations: ChatConversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onCreateConversation: () => void
  onDeleteConversation: (id: string) => void
  onRenameConversation: (id: string, newTitle: string) => void
  loading?: boolean
  compact?: boolean
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

interface ConversationItemProps {
  conversation: ChatConversation
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (newTitle: string) => void
  compact?: boolean
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
  compact,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conversation.title)
  const [showMenu, setShowMenu] = useState(false)

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      onRename(editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setEditTitle(conversation.title)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={`group relative rounded-lg cursor-pointer transition-colors ${
        compact ? 'px-2 py-1.5' : 'px-3 py-2'
      } ${
        isActive
          ? 'bg-primary/20 border border-primary/30'
          : 'hover:bg-tavern-dark border border-transparent'
      }`}
      onClick={() => !isEditing && onSelect()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full px-2 py-1 text-sm bg-background border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-primary"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Icon
                  name="MessageSquare"
                  className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`}
                />
                <span className="text-sm font-medium text-text truncate">{conversation.title}</span>
              </div>
              <span className="text-xs text-text-muted ml-6">
                {formatRelativeTime(conversation.updated_at)}
              </span>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-background rounded transition-all"
            >
              <Icon name="MoreVertical" className="w-4 h-4 text-text-muted" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-background-panel border border-border rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      setIsEditing(true)
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-text hover:bg-tavern-dark flex items-center gap-2"
                  >
                    <Icon name="Pencil" className="w-3.5 h-3.5" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      onDelete()
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-tavern-dark flex items-center gap-2"
                  >
                    <Icon name="Trash2" className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onRenameConversation,
  loading,
  compact,
}: ConversationListProps) {
  return (
    <div className={compact ? 'space-y-1' : 'flex flex-col h-full'}>
      {/* New conversation button */}
      <button
        onClick={onCreateConversation}
        className={`flex items-center gap-2 border border-dashed border-border hover:border-primary hover:bg-primary/10 rounded-lg transition-colors text-text-muted hover:text-primary ${
          compact ? 'px-2 py-1.5 text-xs mb-2' : 'px-3 py-2 mb-3'
        }`}
      >
        <Icon name="Plus" className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        <span className={compact ? 'text-xs font-medium' : 'text-sm font-medium'}>New Conversation</span>
      </button>

      {/* Conversation list */}
      <div className={compact ? 'space-y-1' : 'flex-1 overflow-y-auto space-y-1'}>
        {loading ? (
          <div className={compact ? 'flex items-center justify-center py-4' : 'flex items-center justify-center py-8'}>
            <Icon name="Loader2" className={compact ? 'w-4 h-4 animate-spin text-text-muted' : 'w-5 h-5 animate-spin text-text-muted'} />
          </div>
        ) : conversations.length === 0 ? (
          <div className={compact ? 'text-center py-4' : 'text-center py-8'}>
            <Icon
              name="MessageSquare"
              className={compact ? 'w-6 h-6 text-text-muted mx-auto mb-1 opacity-50' : 'w-8 h-8 text-text-muted mx-auto mb-2 opacity-50'}
            />
            <p className="text-sm text-text-muted">No conversations yet</p>
            {!compact && <p className="text-xs text-text-muted mt-1">Start a new chat to begin</p>}
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              onSelect={() => onSelectConversation(conv.id)}
              onDelete={() => onDeleteConversation(conv.id)}
              onRename={(newTitle) => onRenameConversation(conv.id, newTitle)}
              compact={compact}
            />
          ))
        )}
      </div>
    </div>
  )
}
