import { useState, useEffect, useCallback } from "react";
import { useCampaignStore } from "../../store/campaignStore";
import Icon from "../common/Icon";
import { authFetch } from "@/utils/authFetch";
import { logger } from "@/utils/logger";
import CombatSetup from "./CombatSetup";
import InitiativeOrder from "./InitiativeOrder";
import ParticipantCard from "./ParticipantCard";

/**
 * CombatTracker - Main combat encounter management component.
 *
 * Features:
 * - Create/manage combat encounters
 * - Add participants (PCs, NPCs, monsters)
 * - Track initiative order
 * - Manage HP, temp HP, conditions
 * - Advance turns/rounds
 * - Death saves tracking
 */

export interface CombatEncounter {
  id: string;
  session_id: string;
  encounter_id?: string;
  name: string;
  current_round: number;
  current_turn: number;
  status: "active" | "paused" | "completed";
  difficulty?: string;
  environment?: string;
  notes?: string;
  created_at: string;
}

export interface CombatParticipant {
  id: string;
  combat_id: string;
  participant_type: "pc" | "npc" | "monster";
  character_id?: string;
  npc_id?: string;
  monster_id?: string;
  name: string;
  max_hp: number;
  current_hp: number;
  temp_hp: number;
  ac: number;
  initiative: number;
  initiative_bonus: number;
  passive_perception?: number;
  conditions?: string; // JSON array
  concentration_spell?: string;
  death_saves?: string; // JSON object {successes: number, failures: number}
  is_surprised: boolean;
  has_reaction: boolean;
  legendary_actions_used: number;
  legendary_actions_max: number;
  position: number;
  notes?: string;
}

export interface CombatCondition {
  id: string;
  participant_id: string;
  condition_name: string;
  duration_rounds?: number;
  save_dc?: number;
  save_ability?: string;
  source?: string;
  applied_round: number;
  notes?: string;
}

// Standard D&D 5e conditions
// eslint-disable-next-line react-refresh/only-export-components
export const DND_CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
  "Exhaustion 1",
  "Exhaustion 2",
  "Exhaustion 3",
  "Exhaustion 4",
  "Exhaustion 5",
  "Exhaustion 6",
];

export default function CombatTracker() {
  const { activeCampaignId } = useCampaignStore();
  const [combat, setCombat] = useState<CombatEncounter | null>(null);
  const [participants, setParticipants] = useState<CombatParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Fetch or create a session for this combat
  useEffect(() => {
    const initSession = async () => {
      if (!activeCampaignId) return;

      try {
        // Check for existing active session
        const res = await authFetch(
          `/api/v1/sessions?campaign_id=${activeCampaignId}&status=active`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.sessions && data.sessions.length > 0) {
            setSessionId(data.sessions[0].id);
            return;
          }
        }

        // Create a new session
        const createRes = await authFetch("/api/v1/sessions", {
          method: "POST",
          body: JSON.stringify({
            campaign_id: activeCampaignId,
            name: `Combat Session - ${new Date().toLocaleDateString()}`,
            status: "active",
          }),
        });

        if (createRes.ok) {
          const newSession = await createRes.json();
          setSessionId(newSession.session?.id || newSession.id);
        }
      } catch (error) {
        logger.error("Failed to initialize session", error);
      }
    };

    initSession();
  }, [activeCampaignId]);

  // Fetch participants when combat changes
  const fetchParticipants = useCallback(async () => {
    if (!combat) return;

    try {
      const res = await authFetch(`/api/v1/combat/${combat.id}/participants`);
      if (res.ok) {
        const data = await res.json();
        // Sort by initiative (descending)
        const sorted = (data.participants || []).sort(
          (a: CombatParticipant, b: CombatParticipant) =>
            b.initiative - a.initiative,
        );
        setParticipants(sorted);
      }
    } catch (error) {
      logger.error("Failed to fetch participants", error);
    }
  }, [combat]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Create new combat encounter
  const handleCreateCombat = async (
    name: string,
    difficulty?: string,
    environment?: string,
  ) => {
    if (!sessionId) {
      logger.error("No session ID available");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("/api/v1/combat", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          name,
          difficulty,
          environment,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCombat(data.combat);
        setShowSetup(false);
      }
    } catch (error) {
      logger.error("Failed to create combat", error);
    } finally {
      setLoading(false);
    }
  };

  // Add participant to combat
  const handleAddParticipant = async (
    participant: Omit<CombatParticipant, "id" | "combat_id">,
  ) => {
    if (!combat) return;

    try {
      const res = await authFetch(`/api/v1/combat/${combat.id}/participants`, {
        method: "POST",
        body: JSON.stringify(participant),
      });

      if (res.ok) {
        fetchParticipants();
      }
    } catch (error) {
      logger.error("Failed to add participant", error);
    }
  };

  // Update participant
  const handleUpdateParticipant = async (
    id: string,
    updates: Partial<CombatParticipant>,
  ) => {
    if (!combat) return;

    try {
      const res = await authFetch(
        `/api/v1/combat/${combat.id}/participants/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(updates),
        },
      );

      if (res.ok) {
        fetchParticipants();
      }
    } catch (error) {
      logger.error("Failed to update participant", error);
    }
  };

  // Remove participant
  const handleRemoveParticipant = async (id: string) => {
    if (!combat) return;

    try {
      const res = await authFetch(
        `/api/v1/combat/${combat.id}/participants/${id}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        fetchParticipants();
      }
    } catch (error) {
      logger.error("Failed to remove participant", error);
    }
  };

  // Advance to next turn
  const handleNextTurn = async () => {
    if (!combat) return;

    try {
      const res = await authFetch(`/api/v1/combat/${combat.id}/next-turn`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setCombat(data.combat);
      }
    } catch (error) {
      logger.error("Failed to advance turn", error);
    }
  };

  // End combat
  const handleEndCombat = async () => {
    if (!combat) return;

    try {
      const res = await authFetch(`/api/v1/combat/${combat.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "completed" }),
      });

      if (res.ok) {
        setCombat(null);
        setParticipants([]);
        setShowSetup(true);
      }
    } catch (error) {
      logger.error("Failed to end combat", error);
    }
  };

  // Get current turn participant
  const getCurrentParticipant = (): CombatParticipant | null => {
    if (!combat || participants.length === 0) return null;
    const index = combat.current_turn % participants.length;
    return participants[index] || null;
  };

  if (!activeCampaignId) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Icon
            name="AlertCircle"
            className="w-16 h-16 text-text-muted mx-auto mb-4"
          />
          <h2 className="text-xl font-bold text-text mb-2">
            No Campaign Selected
          </h2>
          <p className="text-text-muted">
            Select a campaign to start tracking combat.
          </p>
        </div>
      </div>
    );
  }

  if (showSetup || !combat) {
    return (
      <CombatSetup onCreateCombat={handleCreateCombat} loading={loading} />
    );
  }

  const currentParticipant = getCurrentParticipant();

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Combat Header */}
      <div className="bg-background-panel border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">{combat.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <Icon name="Clock" className="w-4 h-4" />
                Round {combat.current_round + 1}
              </span>
              {combat.difficulty && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs uppercase">
                  {combat.difficulty}
                </span>
              )}
              {combat.environment && (
                <span className="text-text-muted">{combat.environment}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleNextTurn}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-background font-medium rounded-lg transition-colors"
            >
              <Icon name="ArrowRight" className="w-5 h-5" />
              Next Turn
            </button>
            <button
              onClick={handleEndCombat}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              <Icon name="X" className="w-5 h-5" />
              End Combat
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Initiative Order Sidebar */}
        <div className="w-64 bg-background-panel border-r border-border overflow-y-auto">
          <InitiativeOrder
            participants={participants}
            currentTurn={combat.current_turn}
            onAddParticipant={handleAddParticipant}
          />
        </div>

        {/* Current Turn / Participant Details */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentParticipant ? (
            <ParticipantCard
              participant={currentParticipant}
              isCurrentTurn={true}
              onUpdate={(updates) =>
                handleUpdateParticipant(currentParticipant.id, updates)
              }
              onRemove={() => handleRemoveParticipant(currentParticipant.id)}
            />
          ) : (
            <div className="text-center py-12">
              <Icon
                name="Users"
                className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50"
              />
              <h2 className="text-xl font-bold text-text mb-2">
                No Participants
              </h2>
              <p className="text-text-muted">
                Add combatants using the sidebar to begin.
              </p>
            </div>
          )}

          {/* All Participants Grid (for quick reference) */}
          {participants.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-text mb-4">
                All Combatants
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participants.map((p, index) => (
                  <ParticipantCard
                    key={p.id}
                    participant={p}
                    isCurrentTurn={
                      index === combat.current_turn % participants.length
                    }
                    compact
                    onUpdate={(updates) =>
                      handleUpdateParticipant(p.id, updates)
                    }
                    onRemove={() => handleRemoveParticipant(p.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
