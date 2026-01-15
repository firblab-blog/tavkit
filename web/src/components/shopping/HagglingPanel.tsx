import { useState } from "react";
import Icon from "../common/Icon";
import { HagglingSession, HAGGLING_SKILLS } from "./ShoppingSession";

interface HagglingPanelProps {
  sessions: HagglingSession[];
  onUpdateSession: (
    sessionId: string,
    updates: Partial<HagglingSession>,
  ) => void;
  disabled?: boolean;
}

export default function HagglingPanel({
  sessions,
  onUpdateSession,
  disabled = false,
}: HagglingPanelProps) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const activeSessions = sessions.filter(
    (s) => s.success === undefined || s.success === null,
  );
  const completedSessions = sessions.filter(
    (s) => s.success !== undefined && s.success !== null,
  );

  return (
    <div className="bg-background-panel border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Icon name="MessageSquare" className="w-4 h-4 text-primary" />
          Haggling Sessions
        </h3>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="p-6 text-center text-text-muted">
          <Icon
            name="MessageSquare"
            className="w-8 h-8 mx-auto mb-2 opacity-50"
          />
          <p>No haggling sessions</p>
          <p className="text-sm mt-1">Start haggling from the cart</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-amber-500/10 text-xs font-medium text-amber-400 uppercase">
                Active ({activeSessions.length})
              </div>
              {activeSessions.map((session) => (
                <HagglingSessionItem
                  key={session.id}
                  session={session}
                  isExpanded={expandedSession === session.id}
                  onToggle={() =>
                    setExpandedSession(
                      expandedSession === session.id ? null : session.id,
                    )
                  }
                  onUpdate={(updates) => onUpdateSession(session.id, updates)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}

          {/* Completed Sessions */}
          {completedSessions.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-500/10 text-xs font-medium text-gray-400 uppercase">
                Completed ({completedSessions.length})
              </div>
              {completedSessions.map((session) => (
                <HagglingSessionItem
                  key={session.id}
                  session={session}
                  isExpanded={expandedSession === session.id}
                  onToggle={() =>
                    setExpandedSession(
                      expandedSession === session.id ? null : session.id,
                    )
                  }
                  onUpdate={(updates) => onUpdateSession(session.id, updates)}
                  disabled={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HagglingSessionItem({
  session,
  isExpanded,
  onToggle,
  onUpdate,
  disabled,
}: {
  session: HagglingSession;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<HagglingSession>) => void;
  disabled?: boolean;
}) {
  const [roll, setRoll] = useState<number | "">("");
  const [dc, setDc] = useState(15);

  const skill = HAGGLING_SKILLS.find(
    (s) => s.value === session.skill_check_type,
  );
  const isComplete = session.success !== undefined && session.success !== null;

  const handleRoll = () => {
    setRoll(Math.floor(Math.random() * 20) + 1);
  };

  const handleResolve = (success: boolean) => {
    const moodChange = success ? 0 : -1;

    onUpdate({
      success,
      final_price: success ? session.party_offer : session.starting_price,
      mood_change: moodChange,
      roll_total: typeof roll === "number" ? roll : undefined,
    });
  };

  return (
    <div
      className={`p-4 ${isComplete ? (session.success ? "bg-emerald-500/5" : "bg-red-500/5") : ""}`}
    >
      <div className="flex items-center gap-3">
        {/* Status Icon */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isComplete
              ? session.success
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
              : "bg-amber-500/20 text-amber-400"
          }`}
        >
          <Icon
            name={
              isComplete ? (session.success ? "Check" : "X") : "MessageSquare"
            }
            className="w-4 h-4"
          />
        </div>

        {/* Session Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text">{session.item_name}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${skill?.icon ? "" : "bg-background"}`}
            >
              {session.skill_check_type}
            </span>
          </div>
          <div className="text-sm text-text-muted">
            {session.character_name} •{" "}
            <span className="text-text">{session.starting_price}</span>
            {" → "}
            <span
              className={
                isComplete && session.success
                  ? "text-emerald-400"
                  : "text-amber-400"
              }
            >
              {session.final_price || session.party_offer}
            </span>
          </div>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={onToggle}
          className="p-1 hover:bg-background rounded transition-colors text-text-muted"
        >
          <Icon
            name={isExpanded ? "ChevronUp" : "ChevronDown"}
            className="w-4 h-4"
          />
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 pl-11 space-y-3">
          {/* Price Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-background rounded p-2">
              <span className="text-text-muted block">Starting Price</span>
              <span className="text-text font-medium">
                {session.starting_price}
              </span>
            </div>
            <div className="bg-background rounded p-2">
              <span className="text-text-muted block">Party Offer</span>
              <span className="text-amber-400 font-medium">
                {session.party_offer}
              </span>
            </div>
            {session.merchant_counter && (
              <div className="bg-background rounded p-2">
                <span className="text-text-muted block">Counter Offer</span>
                <span className="text-text font-medium">
                  {session.merchant_counter}
                </span>
              </div>
            )}
            {session.final_price && (
              <div className="bg-background rounded p-2">
                <span className="text-text-muted block">Final Price</span>
                <span
                  className={`font-medium ${session.success ? "text-emerald-400" : "text-red-400"}`}
                >
                  {session.final_price}
                </span>
              </div>
            )}
          </div>

          {/* Roll Section (if not complete) */}
          {!isComplete && !disabled && (
            <div className="bg-background rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">DC:</span>
                <input
                  type="number"
                  value={dc}
                  onChange={(e) => setDc(parseInt(e.target.value) || 10)}
                  className="w-16 px-2 py-1 bg-background-panel border border-border rounded text-text text-center text-sm focus:border-primary focus:outline-none"
                />
                <span className="text-sm text-text-muted ml-2">Roll:</span>
                <input
                  type="number"
                  value={roll}
                  onChange={(e) =>
                    setRoll(e.target.value ? parseInt(e.target.value) : "")
                  }
                  placeholder="d20"
                  className="w-16 px-2 py-1 bg-background-panel border border-border rounded text-text text-center text-sm focus:border-primary focus:outline-none"
                />
                <button
                  onClick={handleRoll}
                  className="p-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors"
                  title="Roll d20"
                >
                  <Icon name="Dices" className="w-4 h-4" />
                </button>
              </div>

              {typeof roll === "number" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve(true)}
                    className="flex-1 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium rounded-lg transition-colors"
                  >
                    Success
                  </button>
                  <button
                    onClick={() => handleResolve(false)}
                    className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors"
                  >
                    Failure
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Result (if complete) */}
          {isComplete && (
            <div
              className={`rounded-lg p-3 ${
                session.success
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-red-500/10 border border-red-500/30"
              }`}
            >
              <p
                className={`font-medium ${session.success ? "text-emerald-400" : "text-red-400"}`}
              >
                {session.success ? "Haggling Successful!" : "Haggling Failed"}
              </p>
              {session.roll_total && (
                <p className="text-sm text-text-muted mt-1">
                  Roll: {session.roll_total}
                </p>
              )}
              {session.mood_change !== 0 && (
                <p className="text-sm text-text-muted">
                  Merchant mood: {session.mood_change > 0 ? "+" : ""}
                  {session.mood_change}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {session.notes && (
            <p className="text-sm text-text-muted italic">{session.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
