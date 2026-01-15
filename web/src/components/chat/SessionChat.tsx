import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import Icon from '../common/Icon'
import { useSessionChat, type ChatMessage } from '../../hooks/useSessionChat'
import ConversationList from './ConversationList'
import ChatSourceModal from './ChatSourceModal'

type SidebarTab = 'history' | 'options'

export default function SessionChat() {
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

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Sidebar tab state
  const [activeTab, setActiveTab] = useState<SidebarTab>('history')

  // Source preferences modal state
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close drawer when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsDrawerOpen(false)
    }
  }, [isMobile])

  // Prevent body scroll when drawer open on mobile
  useEffect(() => {
    if (isMobile && isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobile, isDrawerOpen])

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isDrawerOpen])

  if (!activeCampaign) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <Icon name="MessageSquare" className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text mb-2">No Campaign Selected</h2>
          <p className="text-text-muted">Select or create a campaign to start chatting.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-x-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background-panel px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="p-2 hover:bg-tavern-dark rounded transition-colors lg:hidden"
                aria-label="Open navigation menu"
                aria-expanded={isDrawerOpen}
              >
                <svg
                  className="w-6 h-6 text-text"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                <Icon name="MessageSquare" className="w-8 h-8 text-primary" />
                Session Chat
              </h1>
              <p className="text-sm text-text-muted mt-1">{activeCampaign.name}</p>
            </div>
          </div>
          <button
            onClick={() => setIsSourceModalOpen(true)}
            className="p-2 hover:bg-tavern-dark rounded-lg transition-colors text-text-muted hover:text-text"
            title="Chat source preferences"
          >
            <Icon name="Settings" className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Backdrop - Mobile only */}
        {isMobile && isDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close navigation"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            ${isMobile ? 'fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out' : 'w-64 flex-shrink-0'}
            ${isMobile && !isDrawerOpen ? '-translate-x-full' : 'translate-x-0'}
            border-r border-border bg-background-panel overflow-hidden flex flex-col
          `}
          role="navigation"
          aria-label="Chat options"
        >
          {/* Tab bar */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-text-muted hover:text-text hover:bg-tavern-dark'
              }`}
            >
              <Icon name="History" className="w-4 h-4 inline mr-1.5" />
              History
            </button>
            <button
              onClick={() => setActiveTab('options')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'options'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-text-muted hover:text-text hover:bg-tavern-dark'
              }`}
            >
              <Icon name="Info" className="w-4 h-4 inline mr-1.5" />
              Options
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'history' ? (
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={selectConversation}
                onCreateConversation={createConversation}
                onDeleteConversation={deleteConversation}
                onRenameConversation={renameConversation}
                loading={loadingConversations}
              />
            ) : (
              <div className="space-y-4">
                {/* Chat info */}
                <div className="bg-background rounded-lg p-4 border border-border">
                  <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
                    <Icon name="Info" className="w-4 h-4 text-primary" />
                    About Session Chat
                  </h3>
                  <p className="text-xs text-text-muted">
                    Ask questions about your campaign setting, get suggestions for encounters, or
                    brainstorm plot ideas. The AI uses knowledge from your campaign context.
                  </p>
                </div>

                {/* Message count */}
                <div className="bg-background rounded-lg p-4 border border-border">
                  <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
                    <Icon name="MessageCircle" className="w-4 h-4 text-primary" />
                    Conversation
                  </h3>
                  <p className="text-xs text-text-muted">
                    {messages.length} message{messages.length !== 1 ? 's' : ''} in this session
                  </p>
                </div>

                {/* Tips */}
                <div className="bg-background rounded-lg p-4 border border-border">
                  <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
                    <Icon name="Sparkles" className="w-4 h-4 text-primary" />
                    Tips
                  </h3>
                  <ul className="text-xs text-text-muted space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Ask about NPCs, locations, or lore from your campaign
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Get encounter ideas tailored to your setting
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Brainstorm plot hooks and quest ideas
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <Icon name="Loader2" className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <Icon name="Sparkles" className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-text mb-2">Start a Conversation</h3>
                  <p className="text-text-muted text-sm">
                    Ask questions about your campaign setting, get suggestions for encounters, or
                    brainstorm plot ideas. The AI will use knowledge from your campaign context.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-background-panel border border-border rounded-2xl rounded-bl-md p-4">
                      <div className="flex items-center gap-2 text-text-muted">
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
            <div className="flex-none px-4 py-2 bg-red-900/20 border-t border-red-900/50">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Input area */}
          <div className="flex-none p-4 border-t border-border bg-background-panel">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your campaign..."
                className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-text placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={1}
                disabled={isLoading}
                style={{
                  minHeight: '48px',
                  maxHeight: '200px',
                  height: 'auto',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 200) + 'px'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="ArrowRight" className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
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

interface MessageBubbleProps {
  message: ChatMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
            : 'bg-background-panel border border-border rounded-2xl rounded-bl-md'
        } p-4`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none text-tavern-cream">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* RAG Sources */}
        {!isUser && message.rag_sources && message.rag_sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1 text-xs text-text-muted mb-2">
              <Icon name="BookOpen" className="w-3 h-3" />
              <span>Sources</span>
            </div>
            <div className="space-y-1">
              {message.rag_sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-primary hover:underline"
                >
                  {source.page_title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
