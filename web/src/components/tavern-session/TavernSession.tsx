import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../common/Icon";
import type { IconName } from "../common/Icon";
import TavernSetup from "./TavernSetup";
import AtmospherePanel from "./AtmospherePanel";
import PatronList from "./PatronList";
import RumorBoard from "./RumorBoard";
import TabManager from "./TabManager";
import { useCampaignStore } from "../../store/campaignStore";
import { logger } from "../../utils/logger";

export interface TavernEncounter {
  id: string;
  session_id: string;
  tavern_id: string;
  time_of_day: string;
  crowd_size: string;
  atmosphere: string;
  status: "active" | "completed";
  notes?: string;
  created_at: string;
}

export interface PatronInteraction {
  id: string;
  encounter_id: string;
  patron_name: string;
  patron_data?: unknown;
  talked_to: boolean;
  relationship: string;
  conversation_summary?: string;
  rumors_shared?: string[];
  quest_hooks?: string[];
  notes?: string;
}

export interface RumorTracking {
  id: string;
  encounter_id: string;
  rumor_text: string;
  source_patron?: string;
  heard: boolean;
  verified: boolean;
  related_to?: string;
  notes?: string;
}

export interface TavernTab {
  id: string;
  encounter_id: string;
  character_name: string;
  items_ordered: { name: string; price: string }[];
  total_cost: string;
  paid: boolean;
  notes?: string;
}

export const TIME_OF_DAY: { value: string; label: string; icon: IconName }[] = [
  { value: "morning", label: "Morning", icon: "Sun" },
  { value: "afternoon", label: "Afternoon", icon: "Sun" },
  { value: "evening", label: "Evening", icon: "Moon" },
  { value: "night", label: "Night", icon: "Moon" },
];

export const CROWD_SIZE: { value: string; label: string }[] = [
  { value: "empty", label: "Empty" },
  { value: "sparse", label: "Sparse" },
  { value: "moderate", label: "Moderate" },
  { value: "crowded", label: "Crowded" },
  { value: "packed", label: "Packed" },
];

export const ATMOSPHERE: { value: string; label: string; icon: IconName }[] = [
  { value: "quiet", label: "Quiet", icon: "Meh" },
  { value: "tense", label: "Tense", icon: "AlertCircle" },
  { value: "lively", label: "Lively", icon: "Smile" },
  { value: "rowdy", label: "Rowdy", icon: "Users" },
  { value: "chaotic", label: "Chaotic", icon: "Zap" },
];

export default function TavernSession() {
  const navigate = useNavigate();
  const getActiveCampaign = useCampaignStore(
    (state) => state.getActiveCampaign,
  );
  const activeCampaign = getActiveCampaign();
  const [encounter, setEncounter] = useState<TavernEncounter | null>(null);
  const [patrons, setPatrons] = useState<PatronInteraction[]>([]);
  const [rumors, setRumors] = useState<RumorTracking[]>([]);
  const [tabs, setTabs] = useState<TavernTab[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"patrons" | "rumors" | "tabs">(
    "patrons",
  );

  // Create a temporary session ID for standalone encounters
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`tavern-${Date.now()}`);
    }
  }, [sessionId]);

  const handleCreateEncounter = async (data: {
    tavern_id: string;
    tavern_name: string;
    time_of_day: string;
    crowd_size: string;
    atmosphere: string;
  }) => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/tavern-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          session_id: sessionId,
          tavern_id: data.tavern_id,
          time_of_day: data.time_of_day,
          crowd_size: data.crowd_size,
          atmosphere: data.atmosphere,
          status: "active",
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

  const handleUpdateEncounter = async (updates: Partial<TavernEncounter>) => {
    if (!encounter) return;

    try {
      const response = await fetch(`/api/v1/tavern-sessions/${encounter.id}`, {
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

  const handleAddPatron = async (patronData: {
    patron_name: string;
    relationship: string;
  }) => {
    if (!encounter) return;

    try {
      const response = await fetch(
        `/api/v1/tavern-sessions/${encounter.id}/patrons`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            patron_name: patronData.patron_name,
            talked_to: false,
            relationship: patronData.relationship,
          }),
        },
      );

      if (response.ok) {
        const newPatron = await response.json();
        setPatrons((prev) => [...prev, newPatron]);
      }
    } catch (error) {
      logger.error("Failed to add patron:", error);
    }
  };

  const handleUpdatePatron = async (
    patronId: string,
    updates: Partial<PatronInteraction>,
  ) => {
    try {
      const response = await fetch(
        `/api/v1/tavern-sessions/${encounter?.id}/patrons/${patronId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updates),
        },
      );

      if (response.ok) {
        const updated = await response.json();
        setPatrons((prev) =>
          prev.map((p) => (p.id === patronId ? { ...p, ...updated } : p)),
        );
      }
    } catch (error) {
      logger.error("Failed to update patron:", error);
    }
  };

  const handleAddRumor = async (rumorData: {
    rumor_text: string;
    source_patron?: string;
  }) => {
    if (!encounter) return;

    try {
      const response = await fetch(
        `/api/v1/tavern-sessions/${encounter.id}/rumors`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            rumor_text: rumorData.rumor_text,
            source_patron: rumorData.source_patron,
            heard: true,
            verified: false,
          }),
        },
      );

      if (response.ok) {
        const newRumor = await response.json();
        setRumors((prev) => [...prev, newRumor]);
      }
    } catch (error) {
      logger.error("Failed to add rumor:", error);
    }
  };

  const handleUpdateRumor = async (
    rumorId: string,
    updates: Partial<RumorTracking>,
  ) => {
    try {
      const response = await fetch(
        `/api/v1/tavern-sessions/${encounter?.id}/rumors/${rumorId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updates),
        },
      );

      if (response.ok) {
        setRumors((prev) =>
          prev.map((r) => (r.id === rumorId ? { ...r, ...updates } : r)),
        );
      }
    } catch (error) {
      logger.error("Failed to update rumor:", error);
    }
  };

  const handleAddTab = async (tabData: {
    character_name: string;
    items_ordered: { name: string; price: string }[];
    total_cost: string;
  }) => {
    if (!encounter) return;

    try {
      const response = await fetch(
        `/api/v1/tavern-sessions/${encounter.id}/tabs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            character_name: tabData.character_name,
            items_ordered: tabData.items_ordered,
            total_cost: tabData.total_cost,
            paid: false,
          }),
        },
      );

      if (response.ok) {
        const newTab = await response.json();
        setTabs((prev) => [...prev, newTab]);
      }
    } catch (error) {
      logger.error("Failed to add tab:", error);
    }
  };

  const handleUpdateTab = async (
    tabId: string,
    updates: Partial<TavernTab>,
  ) => {
    try {
      const response = await fetch(
        `/api/v1/tavern-sessions/${encounter?.id}/tabs/${tabId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updates),
        },
      );

      if (response.ok) {
        setTabs((prev) =>
          prev.map((t) => (t.id === tabId ? { ...t, ...updates } : t)),
        );
      }
    } catch (error) {
      logger.error("Failed to update tab:", error);
    }
  };

  const handleEndSession = async () => {
    if (!encounter) return;
    await handleUpdateEncounter({ status: "completed" });
  };

  const handleNewSession = () => {
    setEncounter(null);
    setPatrons([]);
    setRumors([]);
    setTabs([]);
    setShowSetup(true);
    setSessionId(`tavern-${Date.now()}`);
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
                <h1 className="text-xl font-bold text-text">Tavern Session</h1>
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
            <TavernSetup
              onStart={handleCreateEncounter}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!encounter) return null;

  const isCompleted = encounter.status === "completed";

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
                <h1 className="text-xl font-bold text-text flex items-center gap-2">
                  <Icon name="Beer" className="w-5 h-5 text-primary" />
                  Tavern Session
                </h1>
                {isCompleted && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded border bg-gray-500/20 text-gray-400 border-gray-500/40">
                    COMPLETED
                  </span>
                )}
              </div>
              <p className="text-sm text-text-muted capitalize">
                {encounter.time_of_day} • {encounter.crowd_size} •{" "}
                {encounter.atmosphere}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCompleted ? (
              <button
                onClick={handleNewSession}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name="Plus" className="w-4 h-4" />
                New Session
              </button>
            ) : (
              <button
                onClick={handleEndSession}
                className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 font-medium rounded-lg transition-colors"
              >
                End Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Atmosphere */}
          <div className="lg:col-span-1">
            <AtmospherePanel
              encounter={encounter}
              onUpdate={handleUpdateEncounter}
              disabled={isCompleted}
            />
          </div>

          {/* Right Column - Tabbed Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tab Navigation */}
            <div className="flex gap-2 bg-background-panel border border-border rounded-lg p-1">
              <button
                onClick={() => setActiveTab("patrons")}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "patrons"
                    ? "bg-primary text-background"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <Icon name="Users" className="w-4 h-4" />
                Patrons ({patrons.length})
              </button>
              <button
                onClick={() => setActiveTab("rumors")}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "rumors"
                    ? "bg-primary text-background"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <Icon name="MessageCircle" className="w-4 h-4" />
                Rumors ({rumors.length})
              </button>
              <button
                onClick={() => setActiveTab("tabs")}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "tabs"
                    ? "bg-primary text-background"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <Icon name="Scroll" className="w-4 h-4" />
                Tabs ({tabs.length})
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "patrons" && (
              <PatronList
                patrons={patrons}
                onAddPatron={handleAddPatron}
                onUpdatePatron={handleUpdatePatron}
                disabled={isCompleted}
              />
            )}
            {activeTab === "rumors" && (
              <RumorBoard
                rumors={rumors}
                patrons={patrons}
                onAddRumor={handleAddRumor}
                onUpdateRumor={handleUpdateRumor}
                disabled={isCompleted}
              />
            )}
            {activeTab === "tabs" && (
              <TabManager
                tabs={tabs}
                onAddTab={handleAddTab}
                onUpdateTab={handleUpdateTab}
                disabled={isCompleted}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
