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
  ManualEncounterData,
  defaultEncounterData,
  encounterTypeOptions,
  difficultyOptions,
} from "./shared/schemas/encounterSchema";
import {
  generateEncounter as generateEncounterApi,
  saveEncounter as saveEncounterApi,
  getErrorMessage,
} from "@/api/generators";
import { normalizeStringArray } from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// Expected encounter structure
interface EncounterData {
  name: string;
  description: string;
  difficulty: string;
  expected_duration: string;
  environment: EnvironmentData;
  creatures: CreatureData[];
  treasure: TreasureData;
  xp_total: number;
  xp_per_player: number;
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

interface EnvironmentData {
  setting: string;
  features: string[];
  lighting: string;
}

interface CreatureData {
  name: string;
  count: number;
  cr: number;
  role: string;
  tactics: string;
}

interface TreasureData {
  coins: Record<string, number>;
  items: string[];
}

/**
 * Normalize environment to proper structure
 */
function normalizeEnvironment(value: unknown): EnvironmentData {
  const defaultEnv: EnvironmentData = {
    setting: "",
    features: [],
    lighting: "",
  };

  if (!value) return defaultEnv;

  if (typeof value === "string") {
    return { ...defaultEnv, setting: value };
  }

  if (typeof value === "object" && value !== null) {
    const env = value as Record<string, unknown>;
    return {
      setting: String(env.setting || env.terrain || env.location || ""),
      features: normalizeStringArray(
        env.features || env.environmental_features || env.hazards,
      ),
      lighting: String(env.lighting || env.light || env.visibility || ""),
    };
  }

  return defaultEnv;
}

/**
 * Normalize a single creature to proper structure
 */
function normalizeCreature(value: unknown): CreatureData | null {
  if (!value || typeof value !== "object") return null;

  const creature = value as Record<string, unknown>;

  return {
    name: String(creature.name || creature.creature || "Unknown Creature"),
    count: Number(creature.count || creature.quantity || creature.number || 1),
    cr: Number(
      creature.cr || creature.challenge_rating || creature.challenge || 1,
    ),
    role: String(creature.role || creature.type || ""),
    tactics: String(
      creature.tactics || creature.strategy || creature.behavior || "",
    ),
  };
}

/**
 * Normalize creatures array
 */
function normalizeCreatures(value: unknown): CreatureData[] {
  if (!value) return [];

  if (!Array.isArray(value)) {
    // Single creature object
    const creature = normalizeCreature(value);
    return creature ? [creature] : [];
  }

  return value
    .map((c) => normalizeCreature(c))
    .filter((c): c is CreatureData => c !== null);
}

/**
 * Normalize treasure to proper structure
 */
function normalizeTreasure(value: unknown): TreasureData {
  const defaultTreasure: TreasureData = {
    coins: {},
    items: [],
  };

  if (!value) return defaultTreasure;

  if (typeof value !== "object" || value === null) return defaultTreasure;

  const treasure = value as Record<string, unknown>;

  // Normalize coins
  let coins: Record<string, number> = {};
  if (treasure.coins && typeof treasure.coins === "object") {
    const rawCoins = treasure.coins as Record<string, unknown>;
    for (const [key, val] of Object.entries(rawCoins)) {
      coins[key] = Number(val) || 0;
    }
  }

  // Normalize items
  const items = normalizeStringArray(
    treasure.items || treasure.loot || treasure.rewards,
  );

  return { coins, items };
}

/**
 * Main normalization function - converts raw AI response to typed EncounterData
 */
function normalizeEncounterResponse(
  raw: Record<string, unknown>,
): EncounterData {
  logger.debug("[EncounterBuilder] normalizeEncounterResponse input:", raw);

  // Handle case where description contains the entire JSON response
  let processedRaw = raw;
  if (raw.description && typeof raw.description === "string") {
    const descStr = (raw.description as string).trim();
    if (descStr.startsWith("{") && descStr.endsWith("}")) {
      try {
        const parsedEncounter = JSON.parse(descStr);
        logger.debug(
          "[EncounterBuilder] Parsed encounter from JSON description:",
          parsedEncounter,
        );
        processedRaw = parsedEncounter;
      } catch (e) {
        logger.warn(
          "[EncounterBuilder] Failed to parse description as JSON:",
          e,
        );
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    "name",
    "title",
    "description",
    "difficulty",
    "expected_duration",
    "duration",
    "environment",
    "creatures",
    "monsters",
    "enemies",
    "treasure",
    "loot",
    "rewards",
    "xp_total",
    "xp_per_player",
    "total_xp",
    "experience",
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

  // Build description
  let description = "";
  if (
    processedRaw.description &&
    typeof processedRaw.description === "string"
  ) {
    const descText = processedRaw.description as string;
    if (!descText.trim().startsWith("{")) {
      description = descText;
    }
  }
  if (!description && processedRaw.summary) {
    description = String(processedRaw.summary);
  }

  const result: EncounterData = {
    name: String(
      processedRaw.name || processedRaw.title || "Generated Encounter",
    ),
    description: description,
    difficulty: String(processedRaw.difficulty || ""),
    expected_duration: String(
      processedRaw.expected_duration || processedRaw.duration || "",
    ),
    environment: normalizeEnvironment(processedRaw.environment),
    creatures: normalizeCreatures(
      processedRaw.creatures || processedRaw.monsters || processedRaw.enemies,
    ),
    treasure: normalizeTreasure(
      processedRaw.treasure || processedRaw.loot || processedRaw.rewards,
    ),
    xp_total: Number(
      processedRaw.xp_total ||
        processedRaw.total_xp ||
        processedRaw.experience ||
        0,
    ),
    xp_per_player: Number(processedRaw.xp_per_player || 0),
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  logger.debug("[EncounterBuilder] Normalized result:", result);
  return result;
}

/**
 * Check if encounter has valid essential content
 */
function hasValidEncounterContent(encounter: EncounterData): boolean {
  return !!(
    encounter.name &&
    encounter.name !== "Generated Encounter" &&
    (encounter.description || encounter.creatures.length > 0)
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EncounterBuilder() {
  const [specialRequests, setSpecialRequests] = useState("");
  const [partyLevel, setPartyLevel] = useState<number | "">(5);
  const [partySize, setPartySize] = useState<number | "">(4);
  const [difficulty, setDifficulty] = useState("medium");
  const [encounterType, setEncounterType] = useState("random");
  const [environment, setEnvironment] = useState("random");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [encounter, setEncounter] = useState<EncounterData | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Manual entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>("ai");
  const [manualData, setManualData] =
    useState<ManualEncounterData>(defaultEncounterData);
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
    setEncounter(null);
    setIsSaved(false);

    try {
      const data = await generateEncounterApi(
        {
          campaign_id: campaignId || undefined,
          party_level: typeof partyLevel === "number" ? partyLevel : 5,
          party_size: typeof partySize === "number" ? partySize : 4,
          difficulty: difficulty || "medium",
          environment: environment !== "random" ? environment : "random",
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout,
      );
      logger.debug("[EncounterBuilder] Raw API response:", data);

      // Normalize the response to handle missing/unexpected fields
      if (data.encounter) {
        const normalized = normalizeEncounterResponse(data.encounter);

        // Check if we got valid encounter content
        if (!hasValidEncounterContent(normalized)) {
          normalized._parseError =
            "AI response missing essential encounter content. Showing raw response.";
        }

        setEncounter(normalized);
      } else {
        // No encounter wrapper - try to normalize the raw response
        const normalized = normalizeEncounterResponse(
          data as unknown as Record<string, unknown>,
        );
        normalized._parseError =
          "Unexpected response format. Attempting to display.";
        setEncounter(normalized);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!encounter) return;

    setError("");

    try {
      const activeCampaignId = useCampaignStore.getState().activeCampaignId;

      await saveEncounterApi({
        name: encounter.name || "Unnamed Encounter",
        party_level: typeof partyLevel === "number" ? partyLevel : 5,
        party_size: typeof partySize === "number" ? partySize : 4,
        difficulty: encounter.difficulty || difficulty,
        description: encounter.description,
        environment: encounter.environment,
        creatures: encounter.creatures,
        treasure: encounter.treasure,
        xp_total: encounter.xp_total,
        xp_per_player: encounter.xp_per_player,
        notes: encounter.expected_duration
          ? `Expected Duration: ${encounter.expected_duration}`
          : "",
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

  const handleCopy = () => {
    if (!encounter) return;
    let text = `${encounter.name}\n${encounter.difficulty} Encounter\n\n${encounter.description}`;

    if (encounter.environment.setting) {
      text += `\n\nEnvironment: ${encounter.environment.setting}`;
    }
    if (encounter.environment.lighting) {
      text += `\nLighting: ${encounter.environment.lighting}`;
    }
    if (encounter.environment.features.length > 0) {
      text += `\n\nEnvironmental Features:\n${encounter.environment.features.map((f) => `- ${f}`).join("\n")}`;
    }

    if (encounter.creatures.length > 0) {
      text += "\n\nCreatures:";
      encounter.creatures.forEach((creature) => {
        text += `\n\n${creature.count}x ${creature.name} (CR ${creature.cr})`;
        if (creature.role) text += `\nRole: ${creature.role}`;
        if (creature.tactics) text += `\nTactics: ${creature.tactics}`;
      });
    }

    if (encounter.xp_total > 0) {
      text += `\n\nXP Total: ${encounter.xp_total.toLocaleString()}`;
    }
    if (encounter.xp_per_player > 0) {
      text += `\nXP per Player: ${encounter.xp_per_player.toLocaleString()}`;
    }
    if (encounter.expected_duration) {
      text += `\n\nExpected Duration: ${encounter.expected_duration}`;
    }

    if (
      encounter.treasure.coins &&
      Object.keys(encounter.treasure.coins).length > 0
    ) {
      text += "\n\nTreasure (Coins):";
      Object.entries(encounter.treasure.coins).forEach(([type, amount]) => {
        text += `\n${amount} ${type}`;
      });
    }

    if (encounter.treasure.items && encounter.treasure.items.length > 0) {
      text += "\n\nTreasure (Items):";
      encounter.treasure.items.forEach((item) => {
        text += `\n- ${item}`;
      });
    }

    navigator.clipboard.writeText(text);
  };

  // Handle manual entry save
  const handleManualSave = async () => {
    if (!manualData.name.trim()) {
      setError("Encounter name is required");
      return;
    }

    setManualSaving(true);
    setError("");

    try {
      await saveEncounterApi({
        campaign_id: campaignId || undefined,
        name: manualData.name.trim(),
        party_level: typeof partyLevel === "number" ? partyLevel : 5,
        party_size: typeof partySize === "number" ? partySize : 4,
        difficulty: manualData.difficulty,
        description: manualData.description.trim() || "",
        environment: {
          setting: manualData.environment.trim() || "",
          features: manualData.terrain_features.filter((f) => f.trim()),
          lighting: "",
        },
        creatures: manualData.creatures
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name,
            count: c.count || 1,
            cr: 1,
            role: "",
            tactics: c.notes,
          })),
        treasure: {
          coins: {},
          items: manualData.treasure.filter((t) => t.trim()),
        },
        xp_total: 0,
        xp_per_player: 0,
        notes: [
          manualData.setup,
          ...manualData.tactics,
          ...manualData.complications,
        ]
          .filter((n) => n.trim())
          .join("\n"),
        ai_generated: false,
      });

      setManualSaved(true);
      emitContentSaved();
      // Reset form after successful save
      setManualData(defaultEncounterData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setManualSaving(false);
    }
  };

  // AI generation form content
  const aiFormContent = (
    <>
      <AISettings generatorType="encounter" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true;
          setCampaignId(id);
        }}
      />

      <FormField label="Party Level" description="Average level of the party">
        <input
          type="number"
          min="1"
          max="20"
          value={partyLevel}
          onChange={(e) =>
            setPartyLevel(e.target.value ? parseInt(e.target.value) : "")
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Party Size" description="Number of players">
        <input
          type="number"
          min="1"
          max="10"
          value={partySize}
          onChange={(e) =>
            setPartySize(e.target.value ? parseInt(e.target.value) : "")
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Difficulty">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="easy">Easy (low risk)</option>
          <option value="medium">Medium (balanced)</option>
          <option value="hard">Hard (challenging)</option>
          <option value="deadly">Deadly (extreme risk)</option>
        </select>
      </FormField>

      <FormField label="Encounter Type">
        <select
          value={encounterType}
          onChange={(e) => setEncounterType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="random">Random</option>
          <option value="combat">Combat</option>
          <option value="social">Social</option>
          <option value="exploration">Exploration</option>
          <option value="puzzle">Puzzle</option>
          <option value="mixed">Mixed</option>
        </select>
      </FormField>

      <FormField label="Environment">
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="random">Random</option>
          <option value="dungeon">Dungeon</option>
          <option value="forest">Forest</option>
          <option value="mountain">Mountain</option>
          <option value="swamp">Swamp</option>
          <option value="desert">Desert</option>
          <option value="urban">Urban</option>
          <option value="aquatic">Aquatic</option>
          <option value="arctic">Arctic</option>
          <option value="planar">Planar</option>
        </select>
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Include a trap involving poison darts' or 'The enemies should use stealth tactics' or 'Add environmental hazards'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  );

  // Manual entry form content
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
      <FormField label="Encounter Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) =>
            setManualData({ ...manualData, name: e.target.value })
          }
          placeholder="e.g., Ambush at the Bridge, The Goblin Camp"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Encounter Type">
          <select
            value={manualData.encounter_type}
            onChange={(e) =>
              setManualData({ ...manualData, encounter_type: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {encounterTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Difficulty">
          <select
            value={manualData.difficulty}
            onChange={(e) =>
              setManualData({ ...manualData, difficulty: e.target.value })
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

      <FormField label="Description">
        <textarea
          value={manualData.description}
          onChange={(e) =>
            setManualData({ ...manualData, description: e.target.value })
          }
          placeholder="Describe the encounter scenario..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>

      <FormField label="Environment">
        <input
          type="text"
          value={manualData.environment}
          onChange={(e) =>
            setManualData({ ...manualData, environment: e.target.value })
          }
          placeholder="e.g., Forest clearing, Underground cavern"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      {/* Creatures */}
      <CollapsibleSection title="Creatures" defaultExpanded>
        <div className="space-y-3">
          {manualData.creatures.map((creature, idx) => (
            <div
              key={idx}
              className="bg-background p-3 rounded border border-border space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-text">
                  Creature {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newCreatures = [...manualData.creatures];
                    newCreatures.splice(idx, 1);
                    setManualData({ ...manualData, creatures: newCreatures });
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={creature.name}
                  onChange={(e) => {
                    const newCreatures = [...manualData.creatures];
                    newCreatures[idx] = { ...creature, name: e.target.value };
                    setManualData({ ...manualData, creatures: newCreatures });
                  }}
                  placeholder="Creature name"
                  className="col-span-2 w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="number"
                  min={1}
                  value={creature.count}
                  onChange={(e) => {
                    const newCreatures = [...manualData.creatures];
                    newCreatures[idx] = {
                      ...creature,
                      count: parseInt(e.target.value) || 1,
                    };
                    setManualData({ ...manualData, creatures: newCreatures });
                  }}
                  placeholder="#"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <input
                type="text"
                value={creature.notes}
                onChange={(e) => {
                  const newCreatures = [...manualData.creatures];
                  newCreatures[idx] = { ...creature, notes: e.target.value };
                  setManualData({ ...manualData, creatures: newCreatures });
                }}
                placeholder="Notes (tactics, special abilities, etc.)"
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setManualData({
                ...manualData,
                creatures: [
                  ...manualData.creatures,
                  { name: "", count: 1, notes: "" },
                ],
              })
            }
            className="w-full px-3 py-2 border border-dashed border-border text-text-muted hover:border-primary hover:text-primary rounded transition-colors text-sm"
          >
            + Add Creature
          </button>
        </div>
      </CollapsibleSection>

      {/* Setup */}
      <CollapsibleSection
        title="Setup & Initial Conditions"
        defaultExpanded={false}
      >
        <FormField label="Setup">
          <textarea
            value={manualData.setup}
            onChange={(e) =>
              setManualData({ ...manualData, setup: e.target.value })
            }
            placeholder="Initial positions, surprise, timing, etc."
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={2}
          />
        </FormField>
      </CollapsibleSection>

      {/* Objectives */}
      <CollapsibleSection title="Objectives" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Objectives"
          values={manualData.objectives}
          onChange={(objectives) =>
            setManualData({ ...manualData, objectives })
          }
          placeholder="Add an objective..."
        />
      </CollapsibleSection>

      {/* Terrain Features */}
      <CollapsibleSection title="Terrain Features" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Terrain Features"
          values={manualData.terrain_features}
          onChange={(terrain_features) =>
            setManualData({ ...manualData, terrain_features })
          }
          placeholder="Add a terrain feature..."
        />
      </CollapsibleSection>

      {/* Tactics */}
      <CollapsibleSection title="Tactics & Strategies" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Tactics"
          values={manualData.tactics}
          onChange={(tactics) => setManualData({ ...manualData, tactics })}
          placeholder="Add a tactic..."
        />
      </CollapsibleSection>

      {/* Complications */}
      <CollapsibleSection title="Complications" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Complications"
          values={manualData.complications}
          onChange={(complications) =>
            setManualData({ ...manualData, complications })
          }
          placeholder="Add a complication..."
        />
      </CollapsibleSection>

      {/* Treasure */}
      <CollapsibleSection title="Treasure" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Treasure"
          values={manualData.treasure}
          onChange={(treasure) => setManualData({ ...manualData, treasure })}
          placeholder="Add treasure..."
        />
      </CollapsibleSection>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleManualSave}
        disabled={manualSaving || !manualData.name.trim()}
        className="w-full px-4 py-3 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-tavern-darkest font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {manualSaving ? (
          <>
            <Icon name="Loader2" className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Icon name="Save" className="w-5 h-5" />
            Save Encounter
          </>
        )}
      </button>

      {manualSaved && (
        <div className="text-center text-green-400 text-sm">
          Encounter saved! You can find it in the Saved Content section.
        </div>
      )}
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

  // Manual mode preview content (simple message)
  const manualPreviewContent = <ManualEntryPreview entityType="encounter" />;

  const generatedContent = encounter ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {encounter._parseError && (
        <ParseWarning message={encounter._parseError} />
      )}

      {/* Header - styled like Monster/NPC */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{encounter.name}</h2>
        <p className="text-sm text-text-muted capitalize">
          {encounter.difficulty} Encounter
        </p>
      </div>

      {/* Description - with colored border card */}
      {encounter.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <div className="bg-background p-4 rounded border border-primary/30">
            <p className="text-text whitespace-pre-line">
              {encounter.description}
            </p>
          </div>
        </div>
      )}

      {/* Environment - styled with green accent */}
      {(encounter.environment.setting ||
        encounter.environment.features.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Map" className="w-5 h-5 text-green-400" />
            Environment
          </h3>
          <div className="bg-green-500/10 p-4 rounded border border-green-500/30 space-y-2">
            {encounter.environment.setting && (
              <p className="text-text">
                <strong className="text-green-400">Setting:</strong>{" "}
                {encounter.environment.setting}
              </p>
            )}
            {encounter.environment.lighting && (
              <p className="text-text">
                <strong className="text-green-400">Lighting:</strong>{" "}
                {encounter.environment.lighting}
              </p>
            )}
            {encounter.environment.features.length > 0 && (
              <div className="mt-2">
                <strong className="text-green-400">
                  Environmental Features:
                </strong>
                <ul className="mt-1 space-y-1">
                  {encounter.environment.features.map((feature, idx) => (
                    <li key={idx} className="text-text flex items-start gap-2">
                      <span className="text-green-400">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creatures - styled with red accent like Monster Actions */}
      {encounter.creatures.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Skull" className="w-5 h-5 text-red-400" />
            Creatures
          </h3>
          <div className="space-y-3">
            {encounter.creatures.map((creature, idx) => (
              <div
                key={idx}
                className="bg-red-500/10 p-4 rounded border border-red-500/30"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-lg font-medium text-red-400">
                      {creature.count}x {creature.name}
                    </h4>
                    <p className="text-sm text-text-muted">CR {creature.cr}</p>
                  </div>
                  {creature.role && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm font-medium">
                      {creature.role}
                    </span>
                  )}
                </div>
                {creature.tactics && (
                  <p className="text-text text-sm">
                    <strong className="text-red-400">Tactics:</strong>{" "}
                    {creature.tactics}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XP - styled stat cards like Monster */}
      {(encounter.xp_total > 0 || encounter.xp_per_player > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          {encounter.xp_total > 0 && (
            <div className="bg-background p-3 rounded border border-border">
              <p className="text-xs text-text-muted mb-1">XP Total</p>
              <p className="text-xl font-bold text-amber-400">
                {encounter.xp_total.toLocaleString()}
              </p>
            </div>
          )}
          {encounter.xp_per_player > 0 && (
            <div className="bg-background p-3 rounded border border-border">
              <p className="text-xs text-text-muted mb-1">XP per Player</p>
              <p className="text-xl font-bold text-amber-400">
                {encounter.xp_per_player.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Treasure - styled with amber/gold accent */}
      {(Object.keys(encounter.treasure.coins).length > 0 ||
        encounter.treasure.items.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-amber-400" />
            Treasure
          </h3>
          {Object.keys(encounter.treasure.coins).length > 0 && (
            <div className="mb-3">
              <h4 className="font-medium text-amber-400 mb-2">Coins</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(encounter.treasure.coins).map(
                  ([type, amount]) => (
                    <div
                      key={type}
                      className="bg-amber-500/10 border border-amber-500/30 rounded p-2"
                    >
                      <span className="text-amber-400 font-medium">
                        {amount}{" "}
                        <span className="text-text-muted uppercase">
                          {type}
                        </span>
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
          {encounter.treasure.items.length > 0 && (
            <div>
              <h4 className="font-medium text-amber-400 mb-2">Items</h4>
              <ul className="space-y-1">
                {encounter.treasure.items.map((item, idx) => (
                  <li key={idx} className="text-text flex items-start gap-2">
                    <span className="text-amber-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Expected Duration - styled info card */}
      {encounter.expected_duration && (
        <div className="bg-background p-4 rounded border border-primary/30">
          <p className="text-text">
            <strong className="text-primary">Expected Duration:</strong>{" "}
            {encounter.expected_duration}
          </p>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {encounter._raw && <RawDataViewer data={encounter._raw} />}

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
        title="Encounter Builder"
        description="Create balanced combat encounters with creatures, environment, and treasure"
        icon="Swords"
        formTitle="Encounter Parameters"
        formIcon="Settings"
        resultsTitle={
          entryMode === "manual" ? "Manual Entry" : "Generated Encounter"
        }
        formContent={formContent}
        generatedContent={
          entryMode === "manual" ? manualPreviewContent : generatedContent
        }
        isGenerating={loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Encounter"
        error={error}
        hideGenerateButton={entryMode === "manual"}
      />

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        entityName={encounter?.name || "Encounter"}
        campaignId={campaignId}
      />
    </>
  );
}
