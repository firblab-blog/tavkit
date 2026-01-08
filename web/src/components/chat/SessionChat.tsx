import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from '../common/Icon'
import { useCampaignStore } from '../../store/campaignStore'
import { authFetch } from '@/utils/authFetch'
import { logger } from '@/utils/logger'

interface ChatMessage {
  id: string
  campaign_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  rag_sources?: RAGSource[]
  created_at: string
}

interface RAGSource {
  page_title: string
  source_url: string
  similarity: number
}

export default function SessionChat() {
  const activeCampaign = useCampaignStore((state) => state.getActiveCampaign())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Load chat history when campaign changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!activeCampaign?.id) {
        setMessages([])
        setIsLoadingHistory(false)
        return
      }

      setIsLoadingHistory(true)
      try {
        const response = await authFetch(`/api/v1/chat/history/${activeCampaign.id}`)
        if (response.ok) {
          const data = await response.json()
          // Parse RAG sources from JSON strings if needed
          const parsedMessages = (data.messages || []).map((msg: ChatMessage) => ({
            ...msg,
            rag_sources: msg.rag_sources
              ? typeof msg.rag_sources === 'string'
                ? JSON.parse(msg.rag_sources)
                : msg.rag_sources
              : undefined,
          }))
          setMessages(parsedMessages)
        } else if (response.status !== 404) {
          logger.error('Failed to load chat history:', response.status)
        }
      } catch (err) {
        logger.error('Error loading chat history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadChatHistory()
  }, [activeCampaign?.id])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeCampaign?.id || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setError(null)

    // Optimistically add user message
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      campaign_id: activeCampaign.id,
      user_id: '',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    setIsLoading(true)
    try {
      const response = await authFetch('/api/v1/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          campaign_id: activeCampaign.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: data.message_id || `assistant-${Date.now()}`,
        campaign_id: activeCampaign.id,
        user_id: '',
        role: 'assistant',
        content: data.response,
        rag_sources: data.rag_sources,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Remove the optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearChat = async () => {
    if (!activeCampaign?.id) return
    if (!confirm('Are you sure you want to clear all chat history for this campaign?')) return

    try {
      const response = await authFetch(`/api/v1/chat/history/${activeCampaign.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setMessages([])
      }
    } catch (err) {
      logger.error('Failed to clear chat history:', err)
    }
  }

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
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none p-4 border-b border-border bg-background-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="MessageSquare" className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-text">Session Chat</h2>
              <p className="text-sm text-text-muted">{activeCampaign.name}</p>
            </div>
          </div>
          <button
            onClick={handleClearChat}
            className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
            title="Clear chat history"
          >
            <Icon name="Trash2" className="w-5 h-5" />
          </button>
        </div>
      </div>

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
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
                      : 'bg-background-panel border border-border rounded-2xl rounded-bl-md'
                  } p-4`}
                >
                  <div
                    className={`whitespace-pre-wrap ${message.role === 'assistant' ? 'text-text' : ''}`}
                  >
                    {message.content}
                  </div>

                  {/* RAG Sources */}
                  {message.role === 'assistant' &&
                    message.rag_sources &&
                    message.rag_sources.length > 0 && (
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
            onClick={handleSendMessage}
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
  )
}
