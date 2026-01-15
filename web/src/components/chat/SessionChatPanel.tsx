import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import Icon from '../common/Icon'
import { useSessionChat, type ChatMessage } from '../../hooks/useSessionChat'
import ConversationList from './ConversationList'
import ChatSourceModal from './ChatSourceModal'

interface SessionChatPanelProps {
  isExpanded?: boolean
  onToggleExpand?: () => void
  maxHeight?: string
}

export default function SessionChatPanel({
  isExpanded = true,
  onToggleExpand,
  maxHeight = '500px',
}: SessionChatPanelProps) {
  const {
    activeCampaign,
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isLoadingHistory,
    error,
    messagesEndRef,
    inputRef,
    conversations,
    activeConversationId,
    loadingConversations,
    sourcePreferences,
    sendMessage,
    handleKeyDown,
    createConversation,
    deleteConversation,
    renameConversation,
    savePreferences,
    selectConversation,
  } = useSessionChat()

  const [showConversations, setShowConversations] = useState(false)
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false)

  if (!activeCampaign) {
    return (
      <div className="bg-background-panel rounded-xl border border-border p-6 text-center">
        <Icon name="MessageSquare" className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-text mb-1">No Campaign Selected</h3>
        <p className="text-sm text-text-muted">Select a campaign to start chatting.</p>
      </div>
    )
  }

  if (!isExpanded) {
    return (
      <button
        onClick={onToggleExpand}
        className="w-full bg-background-panel rounded-xl border border-primary/30 p-4 hover:border-primary/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Icon name="MessageSquare" className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-text">Session Chat</h3>
            <p className="text-xs text-text-muted">
              {messages.length > 0 ? `${messages.length} messages` : 'Ask about your campaign'}
            </p>
          </div>
        </div>
        <Icon name="ChevronDown" className="w-5 h-5 text-text-muted" />
      </button>
    )
  }

  return (
    <div
      className="bg-background-panel rounded-xl border border-primary/30 overflow-hidden flex flex-col"
      style={{ maxHeight }}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Icon name="MessageSquare" className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text text-sm">Session Chat</h3>
              <p className="text-xs text-text-muted">{activeCampaign.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowConversations(!showConversations)}
              className={`p-1.5 rounded transition-colors ${
                showConversations
                  ? 'bg-primary/20 text-primary'
                  : 'hover:bg-tavern-dark text-text-muted hover:text-text'
              }`}
              title="Conversation history"
            >
              <Icon name="History" className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSourceModalOpen(true)}
              className="p-1.5 hover:bg-tavern-dark rounded transition-colors text-text-muted hover:text-text"
              title="Chat settings"
            >
              <Icon name="Settings" className="w-4 h-4" />
            </button>
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="p-1.5 hover:bg-tavern-dark rounded transition-colors text-text-muted hover:text-text"
                title="Collapse chat"
              >
                <Icon name="ChevronUp" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conversations Panel (slides in) */}
      {showConversations && (
        <div className="flex-shrink-0 border-b border-border p-3 bg-background max-h-48 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => {
              selectConversation(id)
              setShowConversations(false)
            }}
            onCreateConversation={createConversation}
            onDeleteConversation={deleteConversation}
            onRenameConversation={renameConversation}
            loading={loadingConversations}
            compact
          />
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xs">
              <Icon name="Sparkles" className="w-8 h-8 text-primary mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-text mb-1">Start a Conversation</h4>
              <p className="text-xs text-text-muted">
                Ask questions about your campaign setting or brainstorm ideas.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-background border border-border rounded-xl rounded-bl-sm p-3">
                  <div className="flex items-center gap-2 text-text-muted text-sm">
                    <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex-none px-3 py-2 bg-red-900/20 border-t border-red-900/50">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input area */}
      <div className="flex-none p-3 border-t border-border bg-background">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your campaign..."
            className="flex-1 px-3 py-2 bg-background-panel border border-border rounded-lg text-text text-sm placeholder-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
            rows={1}
            disabled={isLoading}
            style={{
              minHeight: '38px',
              maxHeight: '100px',
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 100) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="ArrowRight" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Source Preferences Modal */}
      <ChatSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        campaignId={activeCampaign.id}
        preferences={sourcePreferences}
        onSave={savePreferences}
      />
    </div>
  )
}

interface ChatMessageBubbleProps {
  message: ChatMessage
}

function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-xl rounded-br-sm'
            : 'bg-background border border-border rounded-xl rounded-bl-sm'
        } p-3`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none text-tavern-cream">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* RAG Sources */}
        {!isUser && message.rag_sources && message.rag_sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
              <Icon name="BookOpen" className="w-3 h-3" />
              <span>Sources</span>
            </div>
            <div className="space-y-0.5">
              {message.rag_sources.slice(0, 3).map((source, idx) => (
                <a
                  key={idx}
                  href={source.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-primary hover:underline truncate"
                >
                  {source.page_title}
                </a>
              ))}
              {message.rag_sources.length > 3 && (
                <span className="text-xs text-text-muted">
                  +{message.rag_sources.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
