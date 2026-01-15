import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../common/Icon";
import SocialSetup from "./SocialSetup";
import MoodTracker from "./MoodTracker";
import SkillCheckPanel from "./SkillCheckPanel";
import CheckHistory from "./CheckHistory";
import { useCampaignStore } from "../../store/campaignStore";
import type { IconName } from "../common/Icon";
import { logger } from "../../utils/logger";

export interface SocialEncounter {
  id: string;
  session_id: string;
  dialogue_id?: string;
  npc_id?: string;
  name: string;
  encounter_type: string;
  goal: string;
  current_mood: number;
  starting_mood: number;
  success_threshold: number;
  success_count: number;
  failure_count: number;
  status: "active" | "success" | "failure" | "abandoned";
  outcome?: string;
  notes?: string;
  created_at: string;
}

export interface SocialCheck {
  id: string;
  encounter_id: string;
  character_name: string;
  skill: string;
  dc: number;
  roll: number;
  modifier: number;
  total: number;
  success: boolean;
  approach?: string;
  npc_response?: string;
  mood_change: number;
  created_at: string;
}

export const SOCIAL_SKILLS = [
  "Persuasion",
  "Deception",
  "Intimidation",
  "Insight",
  "Performance",
];

export const ENCOUNTER_TYPES: {
  value: string;
  label: string;
  icon: IconName;
}[] = [
  { value: "negotiation", label: "Negotiation", icon: "Users" },
  { value: "interrogation", label: "Interrogation", icon: "Search" },
  { value: "persuasion", label: "Persuasion", icon: "Smile" },
  { value: "diplomacy", label: "Diplomacy", icon: "Flag" },
  { value: "deception", label: "Deception", icon: "Eye" },
  { value: "debate", label: "Debate", icon: "MessageSquare" },
];

export default function SocialEncounters() {
  const navigate = useNavigate();
  const getActiveCampaign = useCampaignStore(
    (state) => state.getActiveCampaign,
  );
  const activeCampaign = getActiveCampaign();
  const [encounter, setEncounter] = useState<SocialEncounter | null>(null);
  const [checks, setChecks] = useState<SocialCheck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Create a temporary session ID for standalone encounters
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`social-${Date.now()}`);
    }
  }, [sessionId]);

  const handleCreateEncounter = async (data: {
    name: string;
    encounter_type: string;
    goal: string;
    starting_mood: number;
    success_threshold: number;
    npc_id?: string;
    dialogue_id?: string;
  }) => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          session_id: sessionId,
          name: data.name,
          encounter_type: data.encounter_type,
          goal: data.goal,
          starting_mood: data.starting_mood,
          current_mood: data.starting_mood,
          success_threshold: data.success_threshold,
          success_count: 0,
          failure_count: 0,
          status: "active",
          npc_id: data.npc_id,
          dialogue_id: data.dialogue_id,
        }),
      });

      if (response.ok) {
        const newEncounter = await response.json();
        setEncounter(newEncounter);
        setShowSetup(false);
      }
    } catch (error) {
      logger.error("Failed to create encounter:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCheck = async (checkData: {
    character_name: string;
    skill: string;
    dc: number;
    roll: number;
    modifier: number;
    approach?: string;
  }) => {
    if (!encounter) return;

    const total = checkData.roll + checkData.modifier;
    const success = total >= checkData.dc;
    const moodChange = success ? 1 : -1;

    try {
      const response = await fetch(`/api/v1/social/${encounter.id}/checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...checkData,
          total,
          success,
          mood_change: moodChange,
        }),
      });

      if (response.ok) {
        const newCheck = await response.json();
        setChecks((prev) => [...prev, newCheck]);

        // Update encounter state
        const newMood = Math.max(
          -5,
          Math.min(5, encounter.current_mood + moodChange),
        );
        const newSuccessCount = success
          ? encounter.success_count + 1
          : encounter.success_count;
        const newFailureCount = !success
          ? encounter.failure_count + 1
          : encounter.failure_count;

        // Check for encounter resolution
        let newStatus: SocialEncounter["status"] = "active";
        if (newSuccessCount >= encounter.success_threshold) {
          newStatus = "success";
        } else if (newFailureCount >= 3 || newMood <= -5) {
          newStatus = "failure";
        }

        await handleUpdateEncounter({
          current_mood: newMood,
          success_count: newSuccessCount,
          failure_count: newFailureCount,
          status: newStatus,
        });
      }
    } catch (error) {
      logger.error("Failed to add check:", error);
    }
  };

  const handleUpdateEncounter = async (updates: Partial<SocialEncounter>) => {
    if (!encounter) return;

    try {
      const response = await fetch(`/api/v1/social/${encounter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updated = await response.json();
        setEncounter(updated);
      }
    } catch (error) {
      logger.error("Failed to update encounter:", error);
    }
  };

  const handleEndEncounter = async (
    outcome: "success" | "failure" | "abandoned",
  ) => {
    if (!encounter) return;

    await handleUpdateEncounter({
      status: outcome,
      outcome:
        outcome === "success"
          ? "The party achieved their goal."
          : outcome === "failure"
            ? "The encounter ended unfavorably."
            : "The encounter was abandoned.",
    });
  };

  const handleNewEncounter = () => {
    setEncounter(null);
    setChecks([]);
    setShowSetup(true);
    setSessionId(`social-${Date.now()}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "failure":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      case "abandoned":
        return "bg-gray-500/20 text-gray-400 border-gray-500/40";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    }
  };

  if (showSetup) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="flex-none border-b border-border bg-background-panel px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
              >
                <Icon name="ArrowLeft" className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-text">
                  Social Encounters
                </h1>
                <p className="text-sm text-text-muted">
                  {activeCampaign?.name || "No campaign selected"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Form */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            <SocialSetup
              onStart={handleCreateEncounter}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!encounter) return null;

  const isResolved = encounter.status !== "active";

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none border-b border-border bg-background-panel px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
            >
              <Icon name="ArrowLeft" className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-text">
                  {encounter.name}
                </h1>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(encounter.status)}`}
                >
                  {encounter.status.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-text-muted capitalize">
                {encounter.encounter_type} • {encounter.goal}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isResolved ? (
              <button
                onClick={handleNewEncounter}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name="Plus" className="w-4 h-4" />
                New Encounter
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEndEncounter("success")}
                  className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium rounded-lg transition-colors"
                >
                  Success
                </button>
                <button
                  onClick={() => handleEndEncounter("failure")}
                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors"
                >
                  Failure
                </button>
                <button
                  onClick={() => handleEndEncounter("abandoned")}
                  className="px-3 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 font-medium rounded-lg transition-colors"
                >
                  Abandon
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Mood & Progress */}
          <div className="lg:col-span-1 space-y-6">
            <MoodTracker
              currentMood={encounter.current_mood}
              startingMood={encounter.starting_mood}
              successCount={encounter.success_count}
              failureCount={encounter.failure_count}
              successThreshold={encounter.success_threshold}
              onMoodChange={(mood) =>
                handleUpdateEncounter({ current_mood: mood })
              }
              disabled={isResolved}
            />

            {/* Goal Card */}
            <div className="bg-background-panel border border-border rounded-xl p-4">
              <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
                <Icon name="Target" className="w-4 h-4 text-primary" />
                Goal
              </h3>
              <p className="text-text-muted">{encounter.goal}</p>
            </div>

            {/* Notes */}
            <div className="bg-background-panel border border-border rounded-xl p-4">
              <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
                <Icon name="FileText" className="w-4 h-4 text-text-muted" />
                Notes
              </h3>
              <textarea
                value={encounter.notes || ""}
                onChange={(e) =>
                  handleUpdateEncounter({ notes: e.target.value })
                }
                placeholder="Add notes about the encounter..."
                className="w-full h-24 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted resize-none focus:border-primary focus:outline-none"
                disabled={isResolved}
              />
            </div>
          </div>

          {/* Right Column - Skill Checks */}
          <div className="lg:col-span-2 space-y-6">
            {!isResolved && <SkillCheckPanel onAddCheck={handleAddCheck} />}

            <CheckHistory checks={checks} />

            {/* Outcome */}
            {isResolved && encounter.outcome && (
              <div
                className={`p-4 rounded-xl border ${
                  encounter.status === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : encounter.status === "failure"
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-gray-500/10 border-gray-500/30"
                }`}
              >
                <h3 className="font-semibold text-text mb-2">Outcome</h3>
                <p className="text-text-muted">{encounter.outcome}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
