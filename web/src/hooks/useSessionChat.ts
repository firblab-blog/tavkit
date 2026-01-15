import { useState, useEffect, useRef, useCallback } from "react";
import { useCampaignStore } from "../store/campaignStore";
import { authFetch } from "@/utils/authFetch";
import { logger } from "@/utils/logger";
import type { ChatConversation } from "../components/chat/ConversationList";
import type { ChatSourcePreferences } from "../components/chat/ChatSourceModal";

export interface ChatMessage {
  id: string;
  campaign_id: string;
  user_id: string;
  conversation_id?: string;
  role: "user" | "assistant";
  content: string;
  rag_sources?: RAGSource[];
  created_at: string;
}

export interface RAGSource {
  page_title: string;
  source_url: string;
  similarity: number;
}

interface UseSessionChatOptions {
  autoLoadConversations?: boolean;
  autoLoadPreferences?: boolean;
}

export function useSessionChat(options: UseSessionChatOptions = {}) {
  const { autoLoadConversations = true, autoLoadPreferences = true } = options;

  const activeCampaign = useCampaignStore((state) => state.getActiveCampaign());

  // Message state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Conversation state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Source preferences state
  const [sourcePreferences, setSourcePreferences] =
    useState<ChatSourcePreferences | null>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversations when campaign changes
  useEffect(() => {
    if (!autoLoadConversations) return;

    const loadConversations = async () => {
      if (!activeCampaign?.id) {
        setConversations([]);
        setActiveConversationId(null);
        setLoadingConversations(false);
        return;
      }

      setLoadingConversations(true);
      try {
        const response = await authFetch(
          `/api/v1/chat/conversations/${activeCampaign.id}`,
        );
        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations || []);
          // Auto-select the most recent conversation
          if (data.conversations?.length > 0) {
            setActiveConversationId(data.conversations[0].id);
          } else {
            setActiveConversationId(null);
          }
        }
      } catch (err) {
        logger.error("Error loading conversations:", err);
      } finally {
        setLoadingConversations(false);
      }
    };

    loadConversations();
  }, [activeCampaign?.id, autoLoadConversations]);

  // Load source preferences when campaign changes
  useEffect(() => {
    if (!autoLoadPreferences) return;

    const loadPreferences = async () => {
      if (!activeCampaign?.id) {
        setSourcePreferences(null);
        return;
      }

      try {
        const response = await authFetch(
          `/api/v1/chat/preferences/${activeCampaign.id}`,
        );
        if (response.ok) {
          const data = await response.json();
          setSourcePreferences(data);
        }
      } catch (err) {
        logger.error("Error loading source preferences:", err);
      }
    };

    loadPreferences();
  }, [activeCampaign?.id, autoLoadPreferences]);

  // Load messages for active conversation
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!activeConversationId) {
        setMessages([]);
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const response = await authFetch(
          `/api/v1/chat/conversation/${activeConversationId}/history`,
        );
        if (response.ok) {
          const data = await response.json();
          const parsedMessages = (data.messages || []).map(
            (msg: ChatMessage) => ({
              ...msg,
              rag_sources: msg.rag_sources
                ? typeof msg.rag_sources === "string"
                  ? JSON.parse(msg.rag_sources)
                  : msg.rag_sources
                : undefined,
            }),
          );
          setMessages(parsedMessages);
        }
      } catch (err) {
        logger.error("Error loading conversation history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadConversationHistory();
  }, [activeConversationId]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || !activeCampaign?.id || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setError(null);

    // Optimistically add user message
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      campaign_id: activeCampaign.id,
      user_id: "",
      conversation_id: activeConversationId || undefined,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    setIsLoading(true);
    try {
      const response = await authFetch("/api/v1/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          campaign_id: activeCampaign.id,
          conversation_id: activeConversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();

      // If we didn't have a conversation, the backend created one
      if (!activeConversationId && data.conversation_id) {
        setActiveConversationId(data.conversation_id);
        // Refresh conversation list
        const convResponse = await authFetch(
          `/api/v1/chat/conversations/${activeCampaign.id}`,
        );
        if (convResponse.ok) {
          const convData = await convResponse.json();
          setConversations(convData.conversations || []);
        }
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: data.message_id || `assistant-${Date.now()}`,
        campaign_id: activeCampaign.id,
        user_id: "",
        conversation_id:
          data.conversation_id || activeConversationId || undefined,
        role: "assistant",
        content: data.response,
        rag_sources: data.rag_sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Remove the optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, activeCampaign?.id, isLoading, activeConversationId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const createConversation = useCallback(async () => {
    if (!activeCampaign?.id) return;

    try {
      const response = await authFetch("/api/v1/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: activeCampaign.id,
          title: "New Conversation",
        }),
      });

      if (response.ok) {
        const newConv = await response.json();
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        setMessages([]);
      }
    } catch (err) {
      logger.error("Failed to create conversation:", err);
    }
  }, [activeCampaign?.id]);

  const deleteConversation = useCallback(
    async (id: string, skipConfirm = false) => {
      if (
        !skipConfirm &&
        !confirm("Delete this conversation? This cannot be undone.")
      )
        return;

      try {
        const response = await authFetch(`/api/v1/chat/conversation/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setConversations((prev) => prev.filter((c) => c.id !== id));
          if (activeConversationId === id) {
            const remaining = conversations.filter((c) => c.id !== id);
            setActiveConversationId(
              remaining.length > 0 ? remaining[0].id : null,
            );
          }
        }
      } catch (err) {
        logger.error("Failed to delete conversation:", err);
      }
    },
    [activeConversationId, conversations],
  );

  const renameConversation = useCallback(
    async (id: string, newTitle: string) => {
      try {
        const response = await authFetch(`/api/v1/chat/conversation/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });

        if (response.ok) {
          const updated = await response.json();
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? updated : c)),
          );
        }
      } catch (err) {
        logger.error("Failed to rename conversation:", err);
      }
    },
    [],
  );

  const savePreferences = useCallback(
    async (prefs: Partial<ChatSourcePreferences>) => {
      if (!activeCampaign?.id) return;

      try {
        const response = await authFetch(
          `/api/v1/chat/preferences/${activeCampaign.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(prefs),
          },
        );

        if (response.ok) {
          const updated = await response.json();
          setSourcePreferences(updated);
        }
      } catch (err) {
        logger.error("Failed to save preferences:", err);
        throw err;
      }
    },
    [activeCampaign?.id],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
  }, []);

  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  return {
    // Campaign
    activeCampaign,

    // Message state
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isLoadingHistory,
    error,

    // Refs
    messagesEndRef,
    inputRef,

    // Conversation state
    conversations,
    activeConversationId,
    loadingConversations,

    // Preferences
    sourcePreferences,

    // Actions
    sendMessage,
    handleKeyDown,
    createConversation,
    deleteConversation,
    renameConversation,
    savePreferences,
    clearMessages,
    selectConversation,
    scrollToBottom,
  };
}
