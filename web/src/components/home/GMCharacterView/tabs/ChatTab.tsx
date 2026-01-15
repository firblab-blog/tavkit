import SessionChatPanel from "../../../chat/SessionChatPanel";

interface ChatTabProps {
  campaignId: string;
}

/**
 * ChatTab - Dedicated tab for AI-powered campaign chat.
 *
 * Provides a full-height chat experience for brainstorming ideas,
 * asking questions about your campaign, and getting AI assistance.
 */
export default function ChatTab({ campaignId: _campaignId }: ChatTabProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text">Campaign Chat</h2>
        <p className="text-sm text-text-muted mt-1">
          Ask questions about your campaign, brainstorm ideas, or get help with
          session prep.
        </p>
      </div>

      {/* Full-height chat panel */}
      <SessionChatPanel isExpanded={true} maxHeight="calc(100vh - 280px)" />
    </div>
  );
}
