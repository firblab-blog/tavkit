import { useState, useEffect, useRef } from "react";
import { GeneratorLayout } from "./GeneratorLayout";
import { FormField } from "@/components/ui/FormField";
import { ActionsBar } from "@/components/ui/ActionsBar";
import { useCampaignStore } from "../../store/campaignStore";
import Icon from "../common/Icon";
import CampaignSelector from "../common/CampaignSelector";
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
  ManualNPCData,
  defaultNPCData,
  raceOptions,
  classOptions,
} from "./shared/schemas/npcSchema";
import {
  generateNPC as generateNPCApi,
  saveNPC as saveNPCApi,
  getErrorMessage,
} from "@/api/generators";
import {
  normalizeStringArray,
  flattenCategorizedArray,
} from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

// Expected NPC structure
interface NPCData {
  name: string;
  race: string;
  class: string;
  level: number;
  alignment: string;
  appearance: string;
  personality: Personality;
  background: string;
  motivation: string;
  abilities: Abilities;
  combat?: CombatStats;
  skills: string[];
  equipment: string[];
  role: string;
  plot_hooks: string[];
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

interface Personality {
  traits: string[];
  ideals: string;
  bonds: string;
  flaws: string;
}

interface Abilities {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
}

interface CombatStats {
  hp?: number;
  ac?: number;
  speed?: string;
  hit_points?: number;
  armor_class?: number;
  movement?: string;
  initiative?: number;
}

/**
 * Normalize personality object
 */
function normalizePersonality(data: Record<string, unknown>): Personality {
  const result: Personality = {
    traits: [],
    ideals: "",
    bonds: "",
    flaws: "",
  };

  // Try to find personality in various locations
  let personality = data.personality;
  if (!personality) {
    for (const altName of [
      "personality_traits",
      "traits",
      "character_traits",
    ]) {
      if (data[altName]) {
        personality = data[altName];
        break;
      }
    }
  }

  if (!personality) return result;

  // Handle personality as a map (expected format)
  if (
    typeof personality === "object" &&
    personality !== null &&
    !Array.isArray(personality)
  ) {
    const pMap = personality as Record<string, unknown>;
    result.traits = normalizeStringArray(pMap.traits);
    result.ideals = String(pMap.ideals || "");
    result.bonds = String(pMap.bonds || "");
    result.flaws = String(pMap.flaws || "");
    return result;
  }

  // Handle personality as a string
  if (typeof personality === "string") {
    result.traits = [personality];
    return result;
  }

  // Handle personality as an array of traits
  if (Array.isArray(personality)) {
    result.traits = normalizeStringArray(personality);
    return result;
  }

  return result;
}

/**
 * Normalize abilities object
 */
function normalizeAbilities(data: Record<string, unknown>): Abilities {
  const result: Abilities = {
    STR: 10,
    DEX: 10,
    CON: 10,
    INT: 10,
    WIS: 10,
    CHA: 10,
  };

  // Try to find abilities in various field names
  let rawAbilities: unknown = null;
  for (const name of ["abilities", "stats", "ability_scores", "attributes"]) {
    if (data[name]) {
      rawAbilities = data[name];
      break;
    }
  }

  // Also check for flat stat fields at root level
  const statMap: Record<string, keyof Abilities> = {
    str: "STR",
    strength: "STR",
    dex: "DEX",
    dexterity: "DEX",
    con: "CON",
    constitution: "CON",
    int: "INT",
    intelligence: "INT",
    wis: "WIS",
    wisdom: "WIS",
    cha: "CHA",
    charisma: "CHA",
  };

  // Extract from abilities object
  if (rawAbilities && typeof rawAbilities === "object") {
    const abilitiesMap = rawAbilities as Record<string, unknown>;
    for (const [key, mappedKey] of Object.entries(statMap)) {
      const value = abilitiesMap[key] || abilitiesMap[key.toUpperCase()];
      if (value !== undefined) {
        // Handle verbose format like { value: 10, modifier: 0 }
        if (typeof value === "object" && value !== null) {
          const vObj = value as Record<string, unknown>;
          if (typeof vObj.value === "number") result[mappedKey] = vObj.value;
          else if (typeof vObj.score === "number")
            result[mappedKey] = vObj.score;
        } else if (typeof value === "number") {
          result[mappedKey] = value;
        } else if (typeof value === "string") {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) result[mappedKey] = parsed;
        }
      }
    }
  }

  // Also check flat fields at root
  for (const [key, mappedKey] of Object.entries(statMap)) {
    const value = data[key] || data[key.toUpperCase()];
    if (value !== undefined && typeof value === "number") {
      result[mappedKey] = value;
    }
  }

  return result;
}

/**
 * Extract combat stats if present
 */
function extractCombatStats(
  data: Record<string, unknown>,
): CombatStats | undefined {
  const combat: CombatStats = {};

  // Extract HP (check multiple field names)
  const hpValue = data.hp || data.hit_points || data.health;
  if (hpValue !== undefined) {
    if (typeof hpValue === "number") {
      combat.hp = hpValue;
    } else if (typeof hpValue === "string") {
      const parsed = parseInt(hpValue, 10);
      if (!isNaN(parsed)) combat.hp = parsed;
    }
  }

  // Extract AC
  const acValue = data.ac || data.armor_class;
  if (acValue !== undefined) {
    if (typeof acValue === "number") {
      combat.ac = acValue;
    } else if (typeof acValue === "string") {
      const parsed = parseInt(acValue, 10);
      if (!isNaN(parsed)) combat.ac = parsed;
    }
  }

  // Extract Speed
  const speedValue = data.speed || data.movement;
  if (speedValue !== undefined) {
    combat.speed = String(speedValue);
  }

  // Extract Initiative
  if (data.initiative !== undefined) {
    if (typeof data.initiative === "number") {
      combat.initiative = data.initiative;
    } else if (typeof data.initiative === "string") {
      const parsed = parseInt(data.initiative, 10);
      if (!isNaN(parsed)) combat.initiative = parsed;
    }
  }

  return Object.keys(combat).length > 0 ? combat : undefined;
}

/**
 * Main normalization function - converts raw AI response to typed NPCData
 */
function normalizeNPCResponse(raw: Record<string, unknown>): NPCData {
  logger.debug("[NPCGenerator] normalizeNPCResponse input:", raw);

  // Handle case where background contains the entire JSON response
  let processedRaw = raw;
  if (raw.background && typeof raw.background === "string") {
    const bgStr = (raw.background as string).trim();
    if (bgStr.startsWith("{") && bgStr.endsWith("}")) {
      try {
        const parsedNPC = JSON.parse(bgStr);
        logger.debug(
          "[NPCGenerator] Parsed NPC from JSON background:",
          parsedNPC,
        );
        processedRaw = parsedNPC;
      } catch (e) {
        logger.warn("[NPCGenerator] Failed to parse background as JSON:", e);
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    "name",
    "race",
    "class",
    "level",
    "alignment",
    "appearance",
    "personality",
    "personality_traits",
    "traits",
    "character_traits",
    "background",
    "motivation",
    "abilities",
    "stats",
    "ability_scores",
    "attributes",
    "combat",
    "skills",
    "equipment",
    "role",
    "plot_hooks",
    "provider",
    "_parse_warning",
    "_raw",
    // Flat stat fields
    "str",
    "dex",
    "con",
    "int",
    "wis",
    "cha",
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma",
    "hp",
    "ac",
    "speed",
    "hit_points",
    "armor_class",
  ];

  // Collect unexpected fields
  const unexpectedFields: Record<string, unknown> = {};
  for (const key of Object.keys(processedRaw)) {
    if (!expectedFields.includes(key.toLowerCase())) {
      unexpectedFields[key] = processedRaw[key];
    }
  }

  const result: NPCData = {
    name: String(processedRaw.name || "Unknown NPC"),
    race: String(processedRaw.race || ""),
    class: String(processedRaw.class || ""),
    level:
      typeof processedRaw.level === "number"
        ? processedRaw.level
        : parseInt(String(processedRaw.level || "1"), 10) || 1,
    alignment: String(processedRaw.alignment || ""),
    appearance: String(processedRaw.appearance || ""),
    personality: normalizePersonality(processedRaw),
    background: String(processedRaw.background || ""),
    motivation: String(processedRaw.motivation || ""),
    abilities: normalizeAbilities(processedRaw),
    combat: extractCombatStats(processedRaw),
    skills: normalizeStringArray(processedRaw.skills),
    equipment: flattenCategorizedArray(processedRaw.equipment),
    role: String(processedRaw.role || ""),
    plot_hooks: normalizeStringArray(processedRaw.plot_hooks),
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  // Check for parse warning from backend
  if (processedRaw._parse_warning) {
    result._parseError = String(processedRaw._parse_warning);
  }

  logger.debug("[NPCGenerator] Normalized result:", result);
  return result;
}

/**
 * Check if NPC has valid essential content
 */
function hasValidNPCContent(npc: NPCData): boolean {
  return !!(
    npc.name &&
    npc.name !== "Unknown NPC" &&
    (npc.appearance || npc.background || npc.personality.traits.length > 0)
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function NPCGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [npc, setNpc] = useState<NPCData | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const { activeCampaignId } = useCampaignStore();

  // Manual entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>("ai");
  const [manualData, setManualData] = useState<ManualNPCData>(defaultNPCData);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);

  // Track if user has made an explicit campaign selection
  const hasUserSelectedCampaign = useRef(false);

  // Auto-select active campaign ONLY on initial mount
  useEffect(() => {
    if (activeCampaignId && !hasUserSelectedCampaign.current) {
      setCampaignId(activeCampaignId);
    }
  }, [activeCampaignId]);

  // Form inputs - all required now
  const [race, setRace] = useState("human");
  const [npcClass, setNpcClass] = useState("commoner");
  const [level, setLevel] = useState(5);
  const [role, setRole] = useState("merchant");
  const [personality, setPersonality] = useState("balanced");
  const [specialRequests, setSpecialRequests] = useState("");

  // AI settings
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: "high",
    timeout: 120,
  });

  const generateNPC = async () => {
    setLoading(true);
    setError(null);
    setNpc(null);
    setShowRawResponse(false);
    setIsSaved(false);

    try {
      const data = await generateNPCApi(
        {
          campaign_id: campaignId || undefined,
          race,
          class: npcClass,
          level,
          role,
          personality,
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout,
      );
      logger.debug("[NPCGenerator] Raw API response:", data);

      // Normalize the response
      if (data.npc) {
        const normalized = normalizeNPCResponse(data.npc);

        if (!hasValidNPCContent(normalized)) {
          normalized._parseError =
            "AI response missing essential NPC content. Showing raw response.";
          setShowRawResponse(true);
        }

        setNpc(normalized);
      } else {
        // No npc wrapper - try to normalize the raw response
        const normalized = normalizeNPCResponse(
          data as unknown as Record<string, unknown>,
        );
        normalized._parseError =
          "Unexpected response format. Attempting to display.";
        setShowRawResponse(true);
        setNpc(normalized);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const saveNPC = async () => {
    if (!npc) return;

    try {
      // Build complete personality string from traits object
      const personalityText = `Traits: ${npc.personality.traits.join(", ") || "N/A"}\nIdeals: ${npc.personality.ideals || "N/A"}\nBonds: ${npc.personality.bonds || "N/A"}\nFlaws: ${npc.personality.flaws || "N/A"}`;

      // Build complete backstory with all narrative fields
      const backstoryText = `${npc.appearance || ""}\n\n${npc.background || ""}\n\nMotivation: ${npc.motivation || ""}`;

      await saveNPCApi({
        name: npc.name,
        race: npc.race,
        class: npc.class,
        personality: personalityText,
        backstory: backstoryText.trim(),
        stats: {
          level: npc.level,
          alignment: npc.alignment,
          abilities: npc.abilities,
          skills: npc.skills,
          equipment: npc.equipment,
          role: npc.role,
          plot_hooks: npc.plot_hooks || [],
        },
        campaign_id: campaignId || undefined,
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
    if (!npc) return;
    const traits = npc.personality.traits.join(", ") || "N/A";
    const abilities = Object.entries(npc.abilities)
      .map(([stat, value]) => `${stat} ${value}`)
      .join(", ");

    const text = `${npc.name}
${npc.race} ${npc.class} ${npc.level}, ${npc.alignment}

Appearance: ${npc.appearance || "N/A"}

Personality:
Traits: ${traits}
Ideals: ${npc.personality.ideals || "N/A"}
Bonds: ${npc.personality.bonds || "N/A"}
Flaws: ${npc.personality.flaws || "N/A"}

Background: ${npc.background || "N/A"}

Motivation: ${npc.motivation || "N/A"}

Abilities: ${abilities}

Skills: ${npc.skills.join(", ") || "N/A"}

Equipment: ${npc.equipment.join(", ") || "N/A"}

Role: ${npc.role || "N/A"}
${npc.plot_hooks.length ? `\nPlot Hooks:\n${npc.plot_hooks.map((h) => `- ${h}`).join("\n")}` : ""}`;
    navigator.clipboard.writeText(text);
  };

  // Handle manual entry save
  const handleManualSave = async () => {
    if (!manualData.name.trim()) {
      setError("NPC name is required");
      return;
    }

    setManualSaving(true);
    setError(null);

    try {
      // Build personality text from manual fields
      const personalityText = `Traits: ${manualData.traits.join(", ") || "N/A"}\nIdeals: ${manualData.ideals || "N/A"}\nBonds: ${manualData.bonds || "N/A"}\nFlaws: ${manualData.flaws || "N/A"}`;

      // Build backstory
      const backstoryText = `${manualData.appearance || ""}\n\n${manualData.backstory || ""}\n\nMotivation: ${manualData.motivation || ""}`;

      await saveNPCApi({
        campaign_id: campaignId || undefined,
        name: manualData.name.trim(),
        race: manualData.race,
        class: manualData.class || "commoner",
        personality: personalityText,
        backstory: backstoryText.trim(),
        stats: {
          level: manualData.level || 1,
          alignment: "",
          abilities: {
            STR: manualData.stats.str || 10,
            DEX: manualData.stats.dex || 10,
            CON: manualData.stats.con || 10,
            INT: manualData.stats.int || 10,
            WIS: manualData.stats.wis || 10,
            CHA: manualData.stats.cha || 10,
          },
          skills: manualData.skills.filter((s) => s.trim()),
          equipment: manualData.equipment.filter((e) => e.trim()),
          role: manualData.occupation.trim() || "",
          plot_hooks: manualData.plot_hooks.filter((h) => h.trim()),
        },
        ai_generated: false,
      });

      setManualSaved(true);
      emitContentSaved();
      // Reset form after successful save
      setManualData(defaultNPCData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setManualSaving(false);
    }
  };

  // Calculate ability modifier
  const getModifier = (score: number): string => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const aiFormContent = (
    <>
      <AISettings generatorType="npc" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true;
          setCampaignId(id);
        }}
      />

      <FormField label="Race">
        <select
          value={race}
          onChange={(e) => setRace(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="human">Human</option>
          <option value="elf">Elf</option>
          <option value="dwarf">Dwarf</option>
          <option value="halfling">Halfling</option>
          <option value="gnome">Gnome</option>
          <option value="half-elf">Half-Elf</option>
          <option value="half-orc">Half-Orc</option>
          <option value="tiefling">Tiefling</option>
          <option value="dragonborn">Dragonborn</option>
          <option value="orc">Orc</option>
          <option value="goblin">Goblin</option>
          <option value="kobold">Kobold</option>
        </select>
      </FormField>

      <FormField label="Class">
        <select
          value={npcClass}
          onChange={(e) => setNpcClass(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="commoner">Commoner</option>
          <option value="expert">Expert (craftsman/merchant)</option>
          <option value="barbarian">Barbarian</option>
          <option value="bard">Bard</option>
          <option value="cleric">Cleric</option>
          <option value="druid">Druid</option>
          <option value="fighter">Fighter</option>
          <option value="monk">Monk</option>
          <option value="paladin">Paladin</option>
          <option value="ranger">Ranger</option>
          <option value="rogue">Rogue</option>
          <option value="sorcerer">Sorcerer</option>
          <option value="warlock">Warlock</option>
          <option value="wizard">Wizard</option>
        </select>
      </FormField>

      <FormField
        label="Level"
        description="Determines abilities, stats, and power level"
      >
        <input
          type="number"
          min="1"
          max="20"
          value={level}
          onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Role">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="merchant">Merchant/Shopkeeper</option>
          <option value="quest_giver">Quest Giver</option>
          <option value="ally">Ally/Companion</option>
          <option value="antagonist">Antagonist/Villain</option>
          <option value="noble">Noble/Aristocrat</option>
          <option value="guard">Guard/Soldier</option>
          <option value="innkeeper">Innkeeper/Tavern Owner</option>
          <option value="sage">Sage/Scholar</option>
          <option value="priest">Priest/Religious Leader</option>
          <option value="guild_master">Guild Master</option>
          <option value="commoner">Common Folk</option>
          <option value="criminal">Criminal/Outlaw</option>
          <option value="mentor">Mentor/Teacher</option>
        </select>
      </FormField>

      <FormField label="Personality">
        <select
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="balanced">Balanced (mixed traits)</option>
          <option value="friendly">Friendly (helpful, welcoming)</option>
          <option value="grumpy">Grumpy (cynical, irritable)</option>
          <option value="mysterious">Mysterious (enigmatic, secretive)</option>
          <option value="eccentric">Eccentric (quirky, unusual)</option>
          <option value="serious">Serious (professional, formal)</option>
          <option value="cheerful">Cheerful (optimistic, upbeat)</option>
          <option value="paranoid">Paranoid (suspicious, distrustful)</option>
          <option value="brave">Brave (heroic, courageous)</option>
          <option value="cowardly">Cowardly (cautious, fearful)</option>
        </select>
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Has a clockwork pet owl' or 'Searching for their missing sibling' or 'Former member of the Thieves Guild'"
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
      <FormField label="NPC Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) =>
            setManualData({ ...manualData, name: e.target.value })
          }
          placeholder="e.g., Theron Blackwood, Lady Mira"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-3 gap-3">
        <FormField label="Race">
          <select
            value={manualData.race}
            onChange={(e) =>
              setManualData({ ...manualData, race: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {raceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Class">
          <select
            value={manualData.class}
            onChange={(e) =>
              setManualData({ ...manualData, class: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {classOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Level">
          <input
            type="number"
            min={1}
            max={20}
            value={manualData.level || ""}
            onChange={(e) =>
              setManualData({
                ...manualData,
                level: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="1-20"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </FormField>
      </div>

      <FormField label="Occupation/Role">
        <input
          type="text"
          value={manualData.occupation}
          onChange={(e) =>
            setManualData({ ...manualData, occupation: e.target.value })
          }
          placeholder="e.g., Blacksmith, Tavern owner, Merchant"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      {/* Appearance & Description */}
      <CollapsibleSection title="Appearance & Description" defaultExpanded>
        <div className="space-y-3">
          <FormField label="Appearance">
            <textarea
              value={manualData.appearance}
              onChange={(e) =>
                setManualData({ ...manualData, appearance: e.target.value })
              }
              placeholder="Physical description..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>

          <FormField label="Personality Summary">
            <textarea
              value={manualData.personality}
              onChange={(e) =>
                setManualData({ ...manualData, personality: e.target.value })
              }
              placeholder="Brief personality description..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>

          <FormField label="Voice Notes">
            <input
              type="text"
              value={manualData.voice_notes}
              onChange={(e) =>
                setManualData({ ...manualData, voice_notes: e.target.value })
              }
              placeholder="e.g., Deep gravelly voice, Speaks quickly"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Personality Traits */}
      <CollapsibleSection
        title="Personality Traits (D&D Style)"
        defaultExpanded={false}
      >
        <div className="space-y-3">
          <ArrayFieldEditor
            label="Traits"
            values={manualData.traits}
            onChange={(traits) => setManualData({ ...manualData, traits })}
            placeholder="Add a personality trait..."
          />

          <FormField label="Ideals">
            <input
              type="text"
              value={manualData.ideals}
              onChange={(e) =>
                setManualData({ ...manualData, ideals: e.target.value })
              }
              placeholder="What do they believe in?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Bonds">
            <input
              type="text"
              value={manualData.bonds}
              onChange={(e) =>
                setManualData({ ...manualData, bonds: e.target.value })
              }
              placeholder="What/who are they connected to?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Flaws">
            <input
              type="text"
              value={manualData.flaws}
              onChange={(e) =>
                setManualData({ ...manualData, flaws: e.target.value })
              }
              placeholder="What are their weaknesses?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Background & Motivation */}
      <CollapsibleSection
        title="Background & Motivation"
        defaultExpanded={false}
      >
        <div className="space-y-3">
          <FormField label="Backstory">
            <textarea
              value={manualData.backstory}
              onChange={(e) =>
                setManualData({ ...manualData, backstory: e.target.value })
              }
              placeholder="Their history..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
            />
          </FormField>

          <FormField label="Motivation">
            <textarea
              value={manualData.motivation}
              onChange={(e) =>
                setManualData({ ...manualData, motivation: e.target.value })
              }
              placeholder="What drives them?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Skills & Equipment */}
      <CollapsibleSection title="Skills & Equipment" defaultExpanded={false}>
        <div className="space-y-3">
          <ArrayFieldEditor
            label="Skills"
            values={manualData.skills}
            onChange={(skills) => setManualData({ ...manualData, skills })}
            placeholder="Add a skill..."
          />

          <ArrayFieldEditor
            label="Equipment"
            values={manualData.equipment}
            onChange={(equipment) =>
              setManualData({ ...manualData, equipment })
            }
            placeholder="Add equipment..."
          />
        </div>
      </CollapsibleSection>

      {/* Plot Hooks */}
      <CollapsibleSection title="Plot Hooks" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Plot Hooks"
          values={manualData.plot_hooks}
          onChange={(plot_hooks) =>
            setManualData({ ...manualData, plot_hooks })
          }
          placeholder="Add a plot hook..."
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
            Save NPC
          </>
        )}
      </button>

      {manualSaved && (
        <div className="text-center text-green-400 text-sm">
          NPC saved! You can find it in the Saved Content section.
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
          setError(null);
        }}
        disabled={loading}
      />
      {entryMode === "ai" ? aiFormContent : manualFormContent}
    </>
  );

  // Manual mode preview content (simple message)
  const manualPreviewContent = <ManualEntryPreview entityType="NPC" />;

  const generatedContent = npc ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {npc._parseError && <ParseWarning message={npc._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{npc.name}</h2>
        <p className="text-sm text-text-muted">
          {npc.race} {npc.class} {npc.level}
          {npc.alignment && `, ${npc.alignment}`}
        </p>
      </div>

      {/* Appearance */}
      {npc.appearance && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="User" className="w-5 h-5 text-primary" />
            Appearance
          </h3>
          <p className="text-text">{npc.appearance}</p>
        </div>
      )}

      {/* Personality */}
      {(npc.personality.traits.length > 0 ||
        npc.personality.ideals ||
        npc.personality.bonds ||
        npc.personality.flaws) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Smile" className="w-5 h-5 text-primary" />
            Personality
          </h3>
          <div className="grid gap-3">
            {npc.personality.traits.length > 0 && (
              <div className="bg-background p-3 rounded border border-primary/30">
                <p className="text-xs text-text-muted mb-1">Traits</p>
                <p className="text-text">{npc.personality.traits.join(", ")}</p>
              </div>
            )}
            {npc.personality.ideals && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Ideals</p>
                <p className="text-text">{npc.personality.ideals}</p>
              </div>
            )}
            {npc.personality.bonds && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Bonds</p>
                <p className="text-text">{npc.personality.bonds}</p>
              </div>
            )}
            {npc.personality.flaws && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Flaws</p>
                <p className="text-text">{npc.personality.flaws}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Background */}
      {npc.background && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Book" className="w-5 h-5 text-primary" />
            Background
          </h3>
          <p className="text-text">{npc.background}</p>
        </div>
      )}

      {/* Motivation */}
      {npc.motivation && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Motivation
          </h3>
          <p className="text-text">{npc.motivation}</p>
        </div>
      )}

      {/* Ability Scores */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
          <Icon name="Dices" className="w-5 h-5 text-primary" />
          Ability Scores
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(npc.abilities).map(([stat, value]) => (
            <div
              key={stat}
              className="bg-background p-2 rounded border border-border text-center"
            >
              <p className="text-xs text-text-muted mb-1">{stat}</p>
              <p className="text-lg font-bold text-text">{value}</p>
              <p className="text-xs text-primary">{getModifier(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Combat Stats (if present) */}
      {npc.combat && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Shield" className="w-5 h-5 text-primary" />
            Combat
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {npc.combat.ac !== undefined && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Armor Class</p>
                <p className="text-xl font-bold text-primary">
                  {npc.combat.ac}
                </p>
              </div>
            )}
            {npc.combat.hp !== undefined && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Hit Points</p>
                <p className="text-xl font-bold text-red-400">
                  {npc.combat.hp}
                </p>
              </div>
            )}
            {npc.combat.speed && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Speed</p>
                <p className="text-xl font-bold text-blue-400">
                  {npc.combat.speed}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skills */}
      {npc.skills.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="ListChecks" className="w-5 h-5 text-primary" />
            Skills
          </h3>
          <p className="text-text">{npc.skills.join(", ")}</p>
        </div>
      )}

      {/* Equipment */}
      {npc.equipment.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Equipment
          </h3>
          <ul className="space-y-1">
            {npc.equipment.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-text">
                <span className="text-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Role */}
      {npc.role && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Users" className="w-5 h-5 text-primary" />
            Role
          </h3>
          <p className="text-text capitalize">{npc.role.replace(/_/g, " ")}</p>
        </div>
      )}

      {/* Plot Hooks */}
      {npc.plot_hooks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Link" className="w-5 h-5 text-primary" />
            Plot Hooks
          </h3>
          <div className="space-y-2">
            {npc.plot_hooks.map((hook, i) => (
              <div
                key={i}
                className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
              >
                <p className="text-text">{hook}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {npc._raw && (
        <RawDataViewer data={npc._raw} defaultExpanded={showRawResponse} />
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
        title="NPC Generator"
        description="Generate detailed NPCs with personality, backstory, and stats"
        icon="Users"
        formTitle="Character Details"
        formIcon="Settings"
        resultsTitle={entryMode === "manual" ? "Manual Entry" : "Generated NPC"}
        formContent={formContent}
        generatedContent={
          entryMode === "manual" ? manualPreviewContent : generatedContent
        }
        isGenerating={loading}
        onGenerate={generateNPC}
        generateButtonText="Generate NPC"
        error={error || undefined}
        hideGenerateButton={entryMode === "manual"}
      />

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={saveNPC}
        entityName={npc?.name || "NPC"}
        campaignId={campaignId}
      />
    </>
  );
}
