import { useState, useEffect, useRef } from "react";
import { GeneratorLayout } from "./GeneratorLayout";
import { FormField } from "@/components/ui/FormField";
import { ActionsBar } from "@/components/ui/ActionsBar";
import Icon from "../common/Icon";
import CampaignSelector from "../common/CampaignSelector";
import { useCampaignStore } from "../../store/campaignStore";
import AISettings, {
  AIGenerationSettings,
  getMaxTokensFromSettings,
} from "./AISettings";
import { emitContentSaved } from "@/lib/contentEvents";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { EntryModeToggle, EntryMode } from "./shared/EntryModeToggle";
import { ArrayFieldEditor } from "./shared/fields";
import {
  SaveModal,
  ParseWarning,
  RawDataViewer,
  ManualEntryPreview,
} from "./shared";
import {
  ManualQuestData,
  defaultQuestData,
  questTypeOptions,
  difficultyOptions,
} from "./shared/schemas/questSchema";
import {
  generateQuest as generateQuestApi,
  saveQuest as saveQuestApi,
  getErrorMessage,
} from "@/api/generators";
import { normalizeToStringArray } from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// Expected quest structure
interface QuestData {
  title: string;
  type: string;
  category: string;
  description: string;
  objectives: string[];
  rewards: string[];
  complications: string[];
  npcs_involved: string[];
  locations_involved: string[];
  faction_alignment: string;
  party_level: number;
  moral_ambiguity: boolean;
  combat_intensity: string;
  time_limit: string;
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

/**
 * Main normalization function - converts raw AI response to typed QuestData
 * This is the frontend safety net (backend should also validate)
 */
function normalizeQuestResponse(raw: Record<string, unknown>): QuestData {
  logger.debug("[QuestGenerator] normalizeQuestResponse input:", raw);

  // Handle case where description contains the entire JSON response
  // (happens when backend JSON parse fails and puts raw content in description)
  let processedRaw = raw;
  if (raw.description && typeof raw.description === "string") {
    const descStr = (raw.description as string).trim();
    if (descStr.startsWith("{") && descStr.endsWith("}")) {
      try {
        const parsedQuest = JSON.parse(descStr);
        logger.debug(
          "[QuestGenerator] Parsed quest from JSON description:",
          parsedQuest,
        );
        // Use parsed values - they're the REAL data, not the fallbacks
        processedRaw = parsedQuest;
      } catch (e) {
        logger.warn("[QuestGenerator] Failed to parse description as JSON:", e);
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    "title",
    "name",
    "type",
    "category",
    "description",
    "summary",
    "hook",
    "objectives",
    "goals",
    "rewards",
    "complications",
    "twists",
    "npcs_involved",
    "npcs",
    "locations_involved",
    "locations",
    "faction_alignment",
    "party_level",
    "moral_ambiguity",
    "combat_intensity",
    "time_limit",
    "provider",
    "_parse_warning",
  ];

  // Collect unexpected fields for debugging
  const unexpectedFields: Record<string, unknown> = {};
  for (const key of Object.keys(processedRaw)) {
    if (!expectedFields.includes(key)) {
      unexpectedFields[key] = processedRaw[key];
    }
  }

  // Build description - handle various field names AI might use
  let description = "";
  if (
    processedRaw.description &&
    typeof processedRaw.description === "string"
  ) {
    const descText = processedRaw.description as string;
    // Only use if it's not JSON
    if (!descText.trim().startsWith("{")) {
      description = descText;
    }
  }
  if (!description && processedRaw.summary) {
    description = String(processedRaw.summary);
  }
  if (!description && processedRaw.hook) {
    description = String(processedRaw.hook);
  }

  const result: QuestData = {
    title: String(processedRaw.title || processedRaw.name || "Untitled Quest"),
    type: String(processedRaw.type || ""),
    category: String(processedRaw.category || ""),
    description: description,
    // Handle alternative field names AI might use
    objectives: normalizeToStringArray(
      processedRaw.objectives || processedRaw.goals,
    ),
    rewards: normalizeToStringArray(processedRaw.rewards),
    complications: normalizeToStringArray(
      processedRaw.complications || processedRaw.twists,
    ),
    npcs_involved: normalizeToStringArray(
      processedRaw.npcs_involved || processedRaw.npcs,
    ),
    locations_involved: normalizeToStringArray(
      processedRaw.locations_involved || processedRaw.locations,
    ),
    faction_alignment: String(processedRaw.faction_alignment || ""),
    party_level:
      typeof processedRaw.party_level === "number"
        ? processedRaw.party_level
        : 1,
    moral_ambiguity: Boolean(processedRaw.moral_ambiguity),
    combat_intensity: String(processedRaw.combat_intensity || ""),
    time_limit: String(processedRaw.time_limit || ""),
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  logger.debug("[QuestGenerator] Normalized result:", result);
  return result;
}

/**
 * Check if quest has valid essential content
 */
function hasValidQuestContent(quest: QuestData): boolean {
  return !!(
    quest.title &&
    quest.title !== "Untitled Quest" &&
    (quest.description || quest.objectives.length > 0)
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function QuestGenerator() {
  const [specialRequests, setSpecialRequests] = useState("");
  const [type, setType] = useState("main");
  const [difficulty, setDifficulty] = useState("medium");
  const [partyLevel, setPartyLevel] = useState(5);
  const [questLength, setQuestLength] = useState("medium");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quest, setQuest] = useState<QuestData | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Manual entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>("ai");
  const [manualData, setManualData] =
    useState<ManualQuestData>(defaultQuestData);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);

  // Track if user has made an explicit campaign selection
  const hasUserSelectedCampaign = useRef(false);

  // AI settings for controlling token generation
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: "high",
    timeout: 120,
  });

  const { fetchCampaigns, activeCampaignId } = useCampaignStore();

  // Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Auto-select active campaign ONLY on initial mount (not after user interaction)
  useEffect(() => {
    if (activeCampaignId && !hasUserSelectedCampaign.current) {
      setCampaignId(activeCampaignId);
    }
  }, [activeCampaignId]);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setQuest(null);
    setShowRawResponse(false);
    setIsSaved(false);

    try {
      const data = await generateQuestApi(
        {
          type: type || "main",
          category: difficulty || undefined,
          party_level: partyLevel || 1,
          party_size: 4,
          moral_ambiguity: false,
          combat_intensity: difficulty || "medium",
          quest_length: questLength || "medium",
          include_factions: [],
          include_locations: [],
          include_npcs: [],
          special_requests: specialRequests.trim() || undefined,
          campaign_id: campaignId || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout,
      );
      logger.debug("[QuestGenerator] Raw API response:", data);

      // Normalize the response to handle missing/unexpected fields
      if (data.quest) {
        const normalized = normalizeQuestResponse(data.quest);

        // Check if we got valid quest content
        if (!hasValidQuestContent(normalized)) {
          normalized._parseError =
            "AI response missing essential quest content. Showing raw response.";
          setShowRawResponse(true);
        }

        setQuest(normalized);
      } else {
        // No quest wrapper - try to normalize the raw response
        const normalized = normalizeQuestResponse(
          data as unknown as Record<string, unknown>,
        );
        normalized._parseError =
          "Unexpected response format. Attempting to display.";
        setShowRawResponse(true);
        setQuest(normalized);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!quest) return;

    setError("");

    try {
      const activeCampaignId = useCampaignStore.getState().activeCampaignId;

      await saveQuestApi({
        title: quest.title || "Untitled Quest",
        type: quest.type || type || "main",
        category: quest.category || difficulty,
        description: quest.description,
        objectives: quest.objectives || [],
        rewards: quest.rewards || [],
        complications: quest.complications || [],
        npcs_involved: quest.npcs_involved || [],
        locations_involved: quest.locations_involved || [],
        faction_alignment: quest.faction_alignment || "",
        party_level: quest.party_level || partyLevel,
        moral_ambiguity: quest.moral_ambiguity || false,
        combat_intensity: quest.combat_intensity || difficulty,
        time_limit: quest.time_limit || "",
        status: "available",
        campaign_id: activeCampaignId || undefined,
        ai_generated: true,
      });

      setShowSaveModal(false);
      setIsSaved(true);
      emitContentSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Handle manual entry save
  const handleManualSave = async () => {
    if (!manualData.title.trim()) {
      setError("Quest title is required");
      return;
    }

    setManualSaving(true);
    setError("");

    try {
      await saveQuestApi({
        title: manualData.title.trim(),
        type: manualData.type,
        category: manualData.combat_intensity,
        description: manualData.description.trim() || undefined,
        objectives: manualData.objectives.filter((o) => o.trim()),
        rewards: manualData.rewards.filter((r) => r.trim()),
        complications: manualData.complications.filter((c) => c.trim()),
        npcs_involved: manualData.npcs_involved.filter((n) => n.trim()),
        locations_involved: manualData.locations_involved.filter((l) =>
          l.trim(),
        ),
        party_level: manualData.party_level ?? partyLevel,
        combat_intensity: manualData.combat_intensity,
        time_limit: manualData.time_limit.trim() || undefined,
        status: "available",
        campaign_id: campaignId || undefined,
        ai_generated: false,
      });

      setManualSaved(true);
      emitContentSaved();
      // Reset form after successful save
      setManualData(defaultQuestData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setManualSaving(false);
    }
  };

  const handleCopy = () => {
    if (!quest) return;
    let text = `${quest.title}\n${quest.type}`;
    if (quest.category) text += ` • ${quest.category}`;
    if (quest.party_level > 0) text += ` • Level ${quest.party_level}`;

    if (quest.description) {
      text += `\n\nDescription:\n${quest.description}`;
    }

    if (quest.objectives.length > 0) {
      text += `\n\nObjectives:\n${quest.objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
    }

    if (quest.rewards.length > 0) {
      text += `\n\nRewards:\n${quest.rewards.map((r) => `- ${r}`).join("\n")}`;
    }

    if (quest.complications.length > 0) {
      text += `\n\nComplications:\n${quest.complications.map((c) => `- ${c}`).join("\n")}`;
    }

    if (quest.npcs_involved.length > 0) {
      text += `\n\nNPCs Involved:\n${quest.npcs_involved.map((n) => `- ${n}`).join("\n")}`;
    }

    if (quest.locations_involved.length > 0) {
      text += `\n\nLocations:\n${quest.locations_involved.map((l) => `- ${l}`).join("\n")}`;
    }

    if (quest.time_limit) {
      text += `\n\nTime Limit: ${quest.time_limit}`;
    }

    navigator.clipboard.writeText(text);
  };

  // AI Form content
  const aiFormContent = (
    <>
      <AISettings generatorType="quest" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true;
          setCampaignId(id);
        }}
      />

      <FormField label="Quest Type">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="main">Main Quest (story-driven)</option>
          <option value="side">Side Quest (optional)</option>
          <option value="faction">Faction Quest (organization)</option>
          <option value="personal">Personal Quest (character arc)</option>
          <option value="fetch">Fetch Quest (retrieval)</option>
          <option value="escort">Escort Quest (protection)</option>
          <option value="investigation">Investigation (mystery)</option>
          <option value="rescue">Rescue Mission (save someone)</option>
          <option value="assassination">
            Assassination (eliminate target)
          </option>
          <option value="exploration">Exploration (discover location)</option>
        </select>
      </FormField>

      <FormField label="Difficulty">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="easy">Easy (low risk)</option>
          <option value="medium">Medium (moderate challenge)</option>
          <option value="hard">Hard (significant danger)</option>
          <option value="deadly">Deadly (extreme peril)</option>
        </select>
      </FormField>

      <FormField
        label="Party Level"
        description="Determines appropriate challenges and rewards"
      >
        <input
          type="number"
          value={partyLevel}
          onChange={(e) => setPartyLevel(parseInt(e.target.value) || 1)}
          min="1"
          max="20"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Quest Length">
        <select
          value={questLength}
          onChange={(e) => setQuestLength(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="short">Short (1 session)</option>
          <option value="medium">Medium (2-3 sessions)</option>
          <option value="long">Long (4+ sessions)</option>
          <option value="epic">Epic (campaign arc)</option>
        </select>
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Involves ancient dragon cult' or 'Requires underwater exploration' or 'Political intrigue with noble families'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  );

  // Manual Form content
  const manualFormContent = (
    <>
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true;
          setCampaignId(id);
        }}
      />

      {/* Basic Information */}
      <FormField label="Quest Title" required>
        <input
          type="text"
          value={manualData.title}
          onChange={(e) =>
            setManualData({ ...manualData, title: e.target.value })
          }
          placeholder="e.g., The Lost Temple of Zandalar"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Quest Type">
          <select
            value={manualData.type}
            onChange={(e) =>
              setManualData({ ...manualData, type: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {questTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Difficulty">
          <select
            value={manualData.combat_intensity}
            onChange={(e) =>
              setManualData({ ...manualData, combat_intensity: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {difficultyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Party Level">
          <input
            type="number"
            value={manualData.party_level ?? ""}
            onChange={(e) =>
              setManualData({
                ...manualData,
                party_level: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="5"
            min={1}
            max={20}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </FormField>

        <FormField label="Time Limit">
          <input
            type="text"
            value={manualData.time_limit}
            onChange={(e) =>
              setManualData({ ...manualData, time_limit: e.target.value })
            }
            placeholder="e.g., 3 days, Full moon"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </FormField>
      </div>

      <FormField label="Description">
        <textarea
          value={manualData.description}
          onChange={(e) =>
            setManualData({ ...manualData, description: e.target.value })
          }
          placeholder="Describe the quest's hook, background, and what the party needs to know..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={4}
        />
      </FormField>

      {/* Objectives */}
      <ArrayFieldEditor
        label="Objectives"
        values={manualData.objectives}
        onChange={(values) =>
          setManualData({ ...manualData, objectives: values })
        }
        placeholder="Add an objective..."
      />

      {/* Details */}
      <CollapsibleSection
        title="Rewards & Complications"
        defaultExpanded={false}
      >
        <div className="space-y-4">
          <ArrayFieldEditor
            label="Rewards"
            values={manualData.rewards}
            onChange={(values) =>
              setManualData({ ...manualData, rewards: values })
            }
            placeholder="Add a reward..."
          />

          <ArrayFieldEditor
            label="Complications"
            values={manualData.complications}
            onChange={(values) =>
              setManualData({ ...manualData, complications: values })
            }
            placeholder="Add a complication..."
          />
        </div>
      </CollapsibleSection>

      {/* NPCs and Locations */}
      <CollapsibleSection title="NPCs & Locations" defaultExpanded={false}>
        <div className="space-y-4">
          <ArrayFieldEditor
            label="NPCs Involved"
            values={manualData.npcs_involved}
            onChange={(values) =>
              setManualData({ ...manualData, npcs_involved: values })
            }
            placeholder="Add an NPC..."
          />

          <ArrayFieldEditor
            label="Locations Involved"
            values={manualData.locations_involved}
            onChange={(values) =>
              setManualData({ ...manualData, locations_involved: values })
            }
            placeholder="Add a location..."
          />
        </div>
      </CollapsibleSection>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleManualSave}
        disabled={manualSaving || !manualData.title.trim()}
        className="w-full mt-4 py-3 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-tavern-darkest font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {manualSaving ? (
          <>
            <Icon name="Loader2" className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : manualSaved ? (
          <>
            <Icon name="Check" className="w-5 h-5" />
            Saved!
          </>
        ) : (
          <>
            <Icon name="Save" className="w-5 h-5" />
            Save Quest
          </>
        )}
      </button>
    </>
  );

  // Combined form content with mode toggle
  const formContent = (
    <>
      <EntryModeToggle
        mode={entryMode}
        onChange={(mode) => {
          setEntryMode(mode);
          setManualSaved(false);
          setError("");
        }}
        disabled={loading}
      />
      {entryMode === "ai" ? aiFormContent : manualFormContent}
    </>
  );

  // Manual mode preview content
  const manualPreviewContent = <ManualEntryPreview entityType="quest" />;

  const generatedContent = quest ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {quest._parseError && <ParseWarning message={quest._parseError} />}

      {/* Header - styled like Monster/NPC */}
      <div>
        <h2 className="text-2xl font-bold text-primary mb-2">{quest.title}</h2>
        <p className="text-text-muted">
          {quest.type}
          {quest.category && ` • ${quest.category}`}
          {quest.party_level > 0 && ` • Level ${quest.party_level}`}
        </p>
      </div>

      {/* Core Stats - Colored Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Type</p>
          <p className="text-lg font-bold text-primary capitalize">
            {quest.type || "Main"}
          </p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Difficulty</p>
          <p className="text-lg font-bold text-red-400 capitalize">
            {quest.combat_intensity || difficulty}
          </p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Party Level</p>
          <p className="text-lg font-bold text-amber-400">
            {quest.party_level || partyLevel}
          </p>
        </div>
      </div>

      {/* Description - styled with primary accent */}
      {quest.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <div className="bg-background p-4 rounded border border-primary/30">
            <p className="text-text whitespace-pre-line">{quest.description}</p>
          </div>
        </div>
      )}

      {/* Objectives - styled with green accent */}
      {quest.objectives.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
            <Icon name="ListChecks" className="w-5 h-5" />
            Objectives
          </h3>
          <div className="bg-green-500/10 p-4 rounded border border-green-500/30">
            <ol className="list-decimal list-inside space-y-2 text-text">
              {quest.objectives.map((objective, i) => (
                <li key={i}>{objective}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Rewards - styled with amber/gold accent */}
      {quest.rewards.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5" />
            Rewards
          </h3>
          <div className="bg-amber-500/10 p-4 rounded border border-amber-500/30">
            <ul className="space-y-2">
              {quest.rewards.map((reward, i) => (
                <li key={i} className="flex items-start gap-2 text-text">
                  <span className="text-amber-400">•</span>
                  <span>{reward}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Complications - styled with red accent */}
      {quest.complications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Complications
          </h3>
          <div className="bg-red-500/10 p-4 rounded border border-red-500/30">
            <ul className="space-y-2">
              {quest.complications.map((complication, i) => (
                <li key={i} className="flex items-start gap-2 text-text">
                  <span className="text-red-400">•</span>
                  <span>{complication}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* NPCs Involved - styled with blue accent */}
      {quest.npcs_involved.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <Icon name="Users" className="w-5 h-5" />
            NPCs Involved
          </h3>
          <div className="bg-blue-500/10 p-4 rounded border border-blue-500/30">
            <ul className="space-y-2">
              {quest.npcs_involved.map((npc, i) => (
                <li key={i} className="flex items-start gap-2 text-text">
                  <span className="text-blue-400">•</span>
                  <span>{npc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Locations - styled with purple accent */}
      {quest.locations_involved.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <Icon name="MapPin" className="w-5 h-5" />
            Locations
          </h3>
          <div className="bg-purple-500/10 p-4 rounded border border-purple-500/30">
            <ul className="space-y-2">
              {quest.locations_involved.map((location, i) => (
                <li key={i} className="flex items-start gap-2 text-text">
                  <span className="text-purple-400">•</span>
                  <span>{location}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Time Limit - styled info card */}
      {quest.time_limit && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Clock" className="w-5 h-5 text-primary" />
            Time Limit
          </h3>
          <div className="bg-background p-4 rounded border border-primary/30">
            <p className="text-text">{quest.time_limit}</p>
          </div>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {quest._raw && (
        <RawDataViewer data={quest._raw} defaultExpanded={showRawResponse} />
      )}

      <ActionsBar
        onCopy={handleCopy}
        onSave={isSaved ? undefined : () => setShowSaveModal(true)}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  ) : null;

  return (
    <>
      <GeneratorLayout
        title="Quest Generator"
        description="Generate engaging quests with objectives, rewards, and complications"
        icon="Scroll"
        formTitle="Quest Parameters"
        formIcon="Settings"
        resultsTitle={
          entryMode === "manual" ? "Manual Entry" : "Generated Quest"
        }
        formContent={formContent}
        generatedContent={
          entryMode === "manual" ? manualPreviewContent : generatedContent
        }
        isGenerating={loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Quest"
        error={error}
        hideGenerateButton={entryMode === "manual"}
      />

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        entityName={quest?.title || "Quest"}
        campaignId={campaignId}
      />
    </>
  );
}
