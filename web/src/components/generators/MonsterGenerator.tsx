import { useState, useEffect, useRef } from "react";
import { GeneratorLayout } from "./GeneratorLayout";
import { FormField } from "@/components/ui/FormField";
import { ActionsBar } from "@/components/ui/ActionsBar";
import CampaignSelector from "../common/CampaignSelector";
import Icon from "../common/Icon";
import { useCampaignStore } from "../../store/campaignStore";
import AISettings, {
  AIGenerationSettings,
  getMaxTokensFromSettings,
} from "./AISettings";
import { emitContentSaved } from "@/lib/contentEvents";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { EntryModeToggle, EntryMode } from "./shared/EntryModeToggle";
import { ArrayFieldEditor, ObjectArrayEditor } from "./shared/fields";
import {
  SaveModal,
  ParseWarning,
  RawDataViewer,
  ManualEntryPreview,
} from "./shared";
import {
  ManualMonsterData,
  defaultMonsterData,
  creatureTypeOptions,
  sizeOptions,
  alignmentOptions,
  challengeRatingOptions,
} from "./shared/schemas/monsterSchema";
import {
  generateMonster as generateMonsterApi,
  saveMonster as saveMonsterApi,
  getErrorMessage,
} from "@/api/generators";
import {
  normalizeStringArray,
  normalizeActionArray,
  normalizeHitPoints,
  normalizeSpeed,
} from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

interface MonsterData {
  name: string;
  type: string;
  size: string;
  alignment: string;
  armor_class: number;
  hit_points: { average: number; dice: string };
  speed: Record<string, number>;
  abilities: {
    STR: number;
    DEX: number;
    CON: number;
    INT: number;
    WIS: number;
    CHA: number;
  };
  saving_throws?: Record<string, string>;
  skills?: Record<string, string>;
  damage_resistances?: string[];
  damage_immunities?: string[];
  condition_immunities?: string[];
  senses: Record<string, number>;
  languages: string[];
  challenge_rating: number;
  xp: number;
  traits: Array<{ name: string; description: string }>;
  actions: Array<{
    name: string;
    description: string;
    attack_bonus?: string;
    damage?: string;
  }>;
  legendary_actions?: Array<{ name: string; description: string }>;
  lair_actions?: Array<{ name: string; description: string }>;
  lore: string;
  _raw?: Record<string, unknown>; // Store unexpected fields like Dialogue does
  _parseError?: string; // Store parse error messages
}

/**
 * Normalizes abilities to proper structure with all 6 stats (uppercase keys for Monster)
 */
function normalizeAbilities(value: unknown): {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
} {
  const defaults = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };

  if (!value || typeof value !== "object") return defaults;

  const obj = value as Record<string, unknown>;
  return {
    STR: Number(obj.STR || obj.str || obj.strength || 10),
    DEX: Number(obj.DEX || obj.dex || obj.dexterity || 10),
    CON: Number(obj.CON || obj.con || obj.constitution || 10),
    INT: Number(obj.INT || obj.int || obj.intelligence || 10),
    WIS: Number(obj.WIS || obj.wis || obj.wisdom || 10),
    CHA: Number(obj.CHA || obj.cha || obj.charisma || 10),
  };
}

/**
 * Main normalization function - converts raw AI response to typed MonsterData
 * This is the frontend safety net (backend should also validate)
 */
function normalizeMonsterResponse(raw: Record<string, unknown>): MonsterData {
  const expectedFields = [
    "name",
    "type",
    "size",
    "alignment",
    "armor_class",
    "hit_points",
    "speed",
    "abilities",
    "saving_throws",
    "skills",
    "damage_resistances",
    "damage_immunities",
    "condition_immunities",
    "senses",
    "languages",
    "challenge_rating",
    "cr",
    "xp",
    "traits",
    "actions",
    "legendary_actions",
    "lair_actions",
    "lore",
    "description",
    "provider",
    "_parse_warning",
  ];

  // Collect unexpected fields (for debugging)
  const unexpectedFields: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (!expectedFields.includes(key)) {
      unexpectedFields[key] = raw[key];
    }
  }

  return {
    name: String(raw.name || "Unknown Monster"),
    type: String(raw.type || raw.creature_type || "monstrosity"),
    size: String(raw.size || "Medium"),
    alignment: String(raw.alignment || "unaligned"),
    armor_class: Number(raw.armor_class || raw.ac || 10),
    hit_points: normalizeHitPoints(raw.hit_points || raw.hp),
    speed: normalizeSpeed(raw.speed),
    abilities: normalizeAbilities(
      raw.abilities || raw.ability_scores || raw.stats,
    ),
    saving_throws: raw.saving_throws as Record<string, string> | undefined,
    skills: raw.skills as Record<string, string> | undefined,
    damage_resistances: normalizeStringArray(raw.damage_resistances),
    damage_immunities: normalizeStringArray(raw.damage_immunities),
    condition_immunities: normalizeStringArray(raw.condition_immunities),
    senses: (raw.senses as Record<string, number>) || {},
    languages: normalizeStringArray(raw.languages),
    challenge_rating: Number(raw.challenge_rating || raw.cr || 1),
    xp: Number(raw.xp || raw.experience_points || 200),
    traits: normalizeActionArray(raw.traits),
    actions: normalizeActionArray(raw.actions),
    legendary_actions: raw.legendary_actions
      ? normalizeActionArray(raw.legendary_actions)
      : undefined,
    lair_actions: raw.lair_actions
      ? normalizeActionArray(raw.lair_actions)
      : undefined,
    lore: String(raw.lore || raw.description || raw.backstory || ""),
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function MonsterGenerator() {
  const [specialRequests, setSpecialRequests] = useState("");
  const [cr, setCr] = useState(5);
  const [type, setType] = useState("aberration");
  const [size, setSize] = useState("medium");
  const [environment, setEnvironment] = useState("dungeon");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [monster, setMonster] = useState<MonsterData | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Manual entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>("ai");
  const [manualData, setManualData] =
    useState<ManualMonsterData>(defaultMonsterData);
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

  const handleSave = async () => {
    if (!monster) return;

    setError("");

    try {
      const activeCampaignId = useCampaignStore.getState().activeCampaignId;

      await saveMonsterApi({
        name: monster.name,
        cr: monster.challenge_rating,
        stats: {
          type: monster.type,
          size: monster.size,
          alignment: monster.alignment,
          armor_class: monster.armor_class,
          hit_points: monster.hit_points,
          speed: monster.speed,
          abilities: monster.abilities,
          saving_throws: monster.saving_throws,
          skills: monster.skills,
          damage_resistances: monster.damage_resistances,
          damage_immunities: monster.damage_immunities,
          condition_immunities: monster.condition_immunities,
          senses: monster.senses,
          languages: monster.languages,
          challenge_rating: monster.challenge_rating,
          xp: monster.xp,
          traits: monster.traits,
          actions: monster.actions,
          legendary_actions: monster.legendary_actions,
          lair_actions: monster.lair_actions,
        },
        lore: monster.lore,
        tactics: `${monster.traits?.map((t) => t.name).join(", ") || ""} - ${monster.actions?.map((a) => a.name).join(", ") || ""}`,
        campaign_id: activeCampaignId || undefined,
        ai_generated: true,
      });

      setShowSaveModal(false);
      setIsSaved(true);
      emitContentSaved();
    } catch (err) {
      logger.error("[MonsterGenerator] Save error:", err);
      setError(getErrorMessage(err));
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setMonster(null);
    setShowRawResponse(false);
    setIsSaved(false);

    try {
      const data = await generateMonsterApi(
        {
          campaign_id: campaignId || undefined,
          monster_type: type,
          size: size,
          challenge_rating: cr,
          environment: environment,
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout,
      );
      logger.debug("[MonsterGenerator] Raw API response:", data);

      // CRITICAL: Normalize the response to handle inconsistent AI output
      if (data.monster) {
        const normalized = normalizeMonsterResponse(data.monster);

        // Check if we got valid content
        if (!hasValidMonsterContent(normalized)) {
          normalized._parseError =
            "AI response missing essential monster content. Showing raw response.";
          setShowRawResponse(true);
        }

        setMonster(normalized);
      } else {
        // AI returned data at root level instead of nested
        const normalized = normalizeMonsterResponse(
          data as unknown as Record<string, unknown>,
        );
        normalized._parseError =
          "Unexpected response format. Attempting to display.";
        setShowRawResponse(true);
        setMonster(normalized);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if monster has valid essential content
   */
  function hasValidMonsterContent(monster: MonsterData): boolean {
    return !!(
      monster.name &&
      monster.name !== "Unknown Monster" &&
      (monster.lore || monster.traits.length > 0 || monster.actions.length > 0)
    );
  }

  const handleCopy = () => {
    if (!monster) return;

    let text = `${monster.name}\n${monster.size} ${monster.type}${monster.alignment ? `, ${monster.alignment}` : ""}`;

    text += `\n\nArmor Class: ${monster.armor_class}`;
    text += `\nHit Points: ${monster.hit_points.average}${monster.hit_points.dice ? ` (${monster.hit_points.dice})` : ""}`;

    if (monster.speed && Object.keys(monster.speed).length > 0) {
      text += `\nSpeed: ${Object.entries(monster.speed)
        .map(([type, speed]) => `${type} ${speed} ft.`)
        .join(", ")}`;
    }

    text += `\n\nAbilities:\n${Object.entries(monster.abilities)
      .map(([stat, value]) => `${stat} ${value} (${formatModifier(value)})`)
      .join(", ")}`;

    if (
      monster.saving_throws &&
      Object.keys(monster.saving_throws).length > 0
    ) {
      text += `\n\nSaving Throws: ${Object.entries(monster.saving_throws)
        .map(([stat, mod]) => `${stat} ${mod}`)
        .join(", ")}`;
    }
    if (monster.skills && Object.keys(monster.skills).length > 0) {
      text += `\n\nSkills: ${Object.entries(monster.skills)
        .map(([skill, mod]) => `${skill} ${mod}`)
        .join(", ")}`;
    }
    if (monster.damage_resistances && monster.damage_resistances.length > 0) {
      text += `\n\nDamage Resistances: ${monster.damage_resistances.join(", ")}`;
    }
    if (monster.damage_immunities && monster.damage_immunities.length > 0) {
      text += `\n\nDamage Immunities: ${monster.damage_immunities.join(", ")}`;
    }
    if (
      monster.condition_immunities &&
      monster.condition_immunities.length > 0
    ) {
      text += `\n\nCondition Immunities: ${monster.condition_immunities.join(", ")}`;
    }
    if (monster.senses && Object.keys(monster.senses).length > 0) {
      text += `\n\nSenses: ${Object.entries(monster.senses)
        .map(([sense, range]) => {
          if (sense === "description") return String(range);
          if (typeof range === "number") return `${sense} ${range} ft.`;
          return `${sense} ${range}`;
        })
        .join(", ")}`;
    }
    if (monster.languages && monster.languages.length > 0) {
      text += `\n\nLanguages: ${monster.languages.join(", ")}`;
    }
    text += `\n\nChallenge: ${monster.challenge_rating}${monster.xp ? ` (${monster.xp.toLocaleString()} XP)` : ""}`;

    if (monster.traits && monster.traits.length > 0) {
      text += "\n\nTraits:";
      monster.traits.forEach((trait) => {
        text += `\n\n${trait.name}. ${trait.description}`;
      });
    }

    if (monster.actions && monster.actions.length > 0) {
      text += "\n\nActions:";
      monster.actions.forEach((action) => {
        text += `\n\n${action.name}. ${action.description}`;
        if (action.attack_bonus)
          text += ` Attack: ${action.attack_bonus} to hit.`;
        if (action.damage) text += ` Damage: ${action.damage}.`;
      });
    }

    if (monster.legendary_actions && monster.legendary_actions.length > 0) {
      text += "\n\nLegendary Actions:";
      monster.legendary_actions.forEach((action) => {
        text += `\n\n${action.name}. ${action.description}`;
      });
    }

    if (monster.lair_actions && monster.lair_actions.length > 0) {
      text += "\n\nLair Actions:";
      monster.lair_actions.forEach((action) => {
        text += `\n\n${action.name}. ${action.description}`;
      });
    }

    text += `\n\nLore:\n${monster.lore}`;

    navigator.clipboard.writeText(text);
  };

  const formatModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Handle manual entry save
  const handleManualSave = async () => {
    if (!manualData.name.trim()) {
      setError("Monster name is required");
      return;
    }

    setManualSaving(true);
    setError("");

    try {
      // Parse CR for numeric storage
      const crValue = parseFloat(manualData.challenge_rating) || 1;

      await saveMonsterApi({
        campaign_id: campaignId || undefined,
        name: manualData.name.trim(),
        cr: crValue,
        stats: {
          type: manualData.creature_type,
          size: manualData.size,
          alignment: manualData.alignment,
          armor_class: manualData.stats.ac || 10,
          hit_points: { average: manualData.stats.hp || 1, dice: "" },
          speed: manualData.stats.speed
            ? { walk: parseInt(manualData.stats.speed) || 30 }
            : { walk: 30 },
          abilities: {
            STR: manualData.stats.str || 10,
            DEX: manualData.stats.dex || 10,
            CON: manualData.stats.con || 10,
            INT: manualData.stats.int || 10,
            WIS: manualData.stats.wis || 10,
            CHA: manualData.stats.cha || 10,
          },
          damage_resistances: manualData.damage_resistances.filter((r) =>
            r.trim(),
          ),
          damage_immunities: manualData.damage_immunities.filter((i) =>
            i.trim(),
          ),
          condition_immunities: manualData.condition_immunities.filter((c) =>
            c.trim(),
          ),
          senses: {},
          languages: manualData.languages.filter((l) => l.trim()),
          challenge_rating: crValue,
          xp: 0,
          traits: manualData.traits.filter((t) => t.name.trim()),
          actions: manualData.actions.filter((a) => a.name.trim()),
          legendary_actions: manualData.legendary_actions.filter((a) =>
            a.name.trim(),
          ),
        },
        lore: manualData.lore.trim() || "",
        tactics: manualData.tactics.trim() || "",
        ai_generated: false,
      });

      setManualSaved(true);
      emitContentSaved();
      // Reset form after successful save
      setManualData(defaultMonsterData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setManualSaving(false);
    }
  };

  // AI generation form content
  const aiFormContent = (
    <>
      {/* AI Settings */}
      <AISettings generatorType="monster" onSettingsChange={setAiSettings} />

      {/* Campaign Context */}
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true;
          setCampaignId(id);
        }}
      />

      {/* Challenge Rating */}
      <FormField
        label="Challenge Rating"
        description="Determines power level and appropriate XP"
      >
        <input
          type="number"
          min="0"
          max="30"
          value={cr}
          onChange={(e) => setCr(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      {/* Monster Type */}
      <FormField label="Type">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="aberration">Aberration</option>
          <option value="beast">Beast</option>
          <option value="celestial">Celestial</option>
          <option value="construct">Construct</option>
          <option value="dragon">Dragon</option>
          <option value="elemental">Elemental</option>
          <option value="fey">Fey</option>
          <option value="fiend">Fiend</option>
          <option value="giant">Giant</option>
          <option value="humanoid">Humanoid</option>
          <option value="monstrosity">Monstrosity</option>
          <option value="ooze">Ooze</option>
          <option value="plant">Plant</option>
          <option value="undead">Undead</option>
        </select>
      </FormField>

      {/* Size */}
      <FormField label="Size">
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="tiny">Tiny (2.5 ft or smaller)</option>
          <option value="small">Small (2.5-5 ft)</option>
          <option value="medium">Medium (5-10 ft)</option>
          <option value="large">Large (10-15 ft)</option>
          <option value="huge">Huge (15-20 ft)</option>
          <option value="gargantuan">Gargantuan (20+ ft)</option>
        </select>
      </FormField>

      {/* Environment */}
      <FormField label="Environment">
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="dungeon">Dungeon/Underground</option>
          <option value="forest">Forest</option>
          <option value="mountain">Mountain</option>
          <option value="swamp">Swamp</option>
          <option value="desert">Desert</option>
          <option value="arctic">Arctic/Tundra</option>
          <option value="aquatic">Aquatic/Underwater</option>
          <option value="urban">Urban</option>
          <option value="planar">Planar/Otherworldly</option>
          <option value="volcanic">Volcanic</option>
        </select>
      </FormField>

      {/* Special Requests */}
      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Breathes lightning instead of fire' or 'Has spider-like climbing abilities' or 'Vulnerable to silvered weapons'"
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
      <FormField label="Monster Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) =>
            setManualData({ ...manualData, name: e.target.value })
          }
          placeholder="e.g., Shadow Serpent, Flame Horror"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Creature Type">
          <select
            value={manualData.creature_type}
            onChange={(e) =>
              setManualData({ ...manualData, creature_type: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {creatureTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Size">
          <select
            value={manualData.size}
            onChange={(e) =>
              setManualData({ ...manualData, size: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {sizeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Alignment">
          <select
            value={manualData.alignment}
            onChange={(e) =>
              setManualData({ ...manualData, alignment: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {alignmentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Challenge Rating">
          <select
            value={manualData.challenge_rating}
            onChange={(e) =>
              setManualData({ ...manualData, challenge_rating: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {challengeRatingOptions.map((opt) => (
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
          placeholder="Physical description of the creature..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>

      {/* Core Stats */}
      <CollapsibleSection title="Core Stats" defaultExpanded>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="AC">
              <input
                type="number"
                min={1}
                value={manualData.stats.ac || ""}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    stats: {
                      ...manualData.stats,
                      ac: e.target.value ? parseInt(e.target.value) : null,
                    },
                  })
                }
                placeholder="10"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>

            <FormField label="HP">
              <input
                type="number"
                min={1}
                value={manualData.stats.hp || ""}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    stats: {
                      ...manualData.stats,
                      hp: e.target.value ? parseInt(e.target.value) : null,
                    },
                  })
                }
                placeholder="1"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>

            <FormField label="Speed">
              <input
                type="text"
                value={manualData.stats.speed}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    stats: { ...manualData.stats, speed: e.target.value },
                  })
                }
                placeholder="30 ft"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {(["str", "dex", "con", "int", "wis", "cha"] as const).map(
              (stat) => (
                <FormField key={stat} label={stat.toUpperCase()}>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={manualData.stats[stat] || ""}
                    onChange={(e) =>
                      setManualData({
                        ...manualData,
                        stats: {
                          ...manualData.stats,
                          [stat]: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        },
                      })
                    }
                    placeholder="10"
                    className="w-full px-2 py-2 bg-background border border-border rounded-lg text-text text-center focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>
              ),
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Resistances & Immunities */}
      <CollapsibleSection
        title="Resistances & Immunities"
        defaultExpanded={false}
      >
        <div className="space-y-3">
          <ArrayFieldEditor
            label="Damage Resistances"
            values={manualData.damage_resistances}
            onChange={(damage_resistances) =>
              setManualData({ ...manualData, damage_resistances })
            }
            placeholder="Add damage resistance..."
          />

          <ArrayFieldEditor
            label="Damage Immunities"
            values={manualData.damage_immunities}
            onChange={(damage_immunities) =>
              setManualData({ ...manualData, damage_immunities })
            }
            placeholder="Add damage immunity..."
          />

          <ArrayFieldEditor
            label="Condition Immunities"
            values={manualData.condition_immunities}
            onChange={(condition_immunities) =>
              setManualData({ ...manualData, condition_immunities })
            }
            placeholder="Add condition immunity..."
          />
        </div>
      </CollapsibleSection>

      {/* Senses & Languages */}
      <CollapsibleSection title="Senses & Languages" defaultExpanded={false}>
        <div className="space-y-3">
          <ArrayFieldEditor
            label="Senses"
            values={manualData.senses}
            onChange={(senses) => setManualData({ ...manualData, senses })}
            placeholder="Add a sense (e.g., Darkvision 60 ft)..."
          />

          <ArrayFieldEditor
            label="Languages"
            values={manualData.languages}
            onChange={(languages) =>
              setManualData({ ...manualData, languages })
            }
            placeholder="Add a language..."
          />
        </div>
      </CollapsibleSection>

      {/* Traits */}
      <CollapsibleSection title="Traits" defaultExpanded={false}>
        <ObjectArrayEditor
          label="Traits"
          values={manualData.traits}
          onChange={(traits) => setManualData({ ...manualData, traits })}
          namePlaceholder="Trait name"
          descriptionPlaceholder="Trait description"
        />
      </CollapsibleSection>

      {/* Actions */}
      <CollapsibleSection title="Actions" defaultExpanded={false}>
        <ObjectArrayEditor
          label="Actions"
          values={manualData.actions}
          onChange={(actions) => setManualData({ ...manualData, actions })}
          namePlaceholder="Action name"
          descriptionPlaceholder="Action description"
        />
      </CollapsibleSection>

      {/* Reactions */}
      <CollapsibleSection title="Reactions" defaultExpanded={false}>
        <ObjectArrayEditor
          label="Reactions"
          values={manualData.reactions}
          onChange={(reactions) => setManualData({ ...manualData, reactions })}
          namePlaceholder="Reaction name"
          descriptionPlaceholder="Reaction description"
        />
      </CollapsibleSection>

      {/* Legendary Actions */}
      <CollapsibleSection title="Legendary Actions" defaultExpanded={false}>
        <ObjectArrayEditor
          label="Legendary Actions"
          values={manualData.legendary_actions}
          onChange={(legendary_actions) =>
            setManualData({ ...manualData, legendary_actions })
          }
          namePlaceholder="Legendary action name"
          descriptionPlaceholder="Legendary action description"
        />
      </CollapsibleSection>

      {/* Tactics & Lore */}
      <CollapsibleSection title="Tactics & Lore" defaultExpanded={false}>
        <div className="space-y-3">
          <FormField label="Tactics">
            <textarea
              value={manualData.tactics}
              onChange={(e) =>
                setManualData({ ...manualData, tactics: e.target.value })
              }
              placeholder="How does this creature fight?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>

          <FormField label="Lore">
            <textarea
              value={manualData.lore}
              onChange={(e) =>
                setManualData({ ...manualData, lore: e.target.value })
              }
              placeholder="Background, habitat, behavior..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
            />
          </FormField>
        </div>
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
            Save Monster
          </>
        )}
      </button>

      {manualSaved && (
        <div className="text-center text-green-400 text-sm">
          Monster saved! You can find it in the Saved Content section.
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
  const manualPreviewContent = <ManualEntryPreview entityType="monster" />;

  const generatedContent = monster ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {monster._parseError && <ParseWarning message={monster._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{monster.name}</h2>
        <p className="text-sm text-text-muted capitalize">
          {monster.size} {monster.type}
          {monster.alignment && ` • ${monster.alignment}`}
        </p>
      </div>

      {/* Core Stats - Colored Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Armor Class</p>
          <p className="text-xl font-bold text-primary">
            {monster.armor_class}
          </p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Hit Points</p>
          <p className="text-xl font-bold text-red-400">
            {monster.hit_points.average}
            {monster.hit_points.dice && (
              <span className="text-sm font-normal text-text-muted ml-1">
                ({monster.hit_points.dice})
              </span>
            )}
          </p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Challenge</p>
          <p className="text-xl font-bold text-amber-400">
            CR {monster.challenge_rating}
            {monster.xp && (
              <span className="text-sm font-normal text-text-muted ml-1">
                ({monster.xp.toLocaleString()} XP)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Speed */}
      {monster.speed && Object.keys(monster.speed).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Speed
          </h3>
          <p className="text-text">
            {Object.entries(monster.speed)
              .map(([moveType, speed]) => `${moveType} ${speed} ft.`)
              .join(", ")}
          </p>
        </div>
      )}

      {/* Ability Scores */}
      {monster.abilities && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="BarChart3" className="w-5 h-5 text-primary" />
            Ability Scores
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.entries(monster.abilities).map(([stat, value]) => (
              <div
                key={stat}
                className="bg-background p-2 rounded border border-border text-center"
              >
                <p className="text-xs text-text-muted mb-1">{stat}</p>
                <p className="text-lg font-bold text-text">{value}</p>
                <p className="text-xs text-primary">{formatModifier(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saving Throws & Skills */}
      {(monster.saving_throws &&
        Object.keys(monster.saving_throws).length > 0) ||
      (monster.skills && Object.keys(monster.skills).length > 0) ? (
        <div className="space-y-2">
          {monster.saving_throws &&
            Object.keys(monster.saving_throws).length > 0 && (
              <p className="text-text">
                <strong className="text-primary">Saving Throws:</strong>{" "}
                {Object.entries(monster.saving_throws)
                  .map(([stat, mod]) => `${stat} ${mod}`)
                  .join(", ")}
              </p>
            )}
          {monster.skills && Object.keys(monster.skills).length > 0 && (
            <p className="text-text">
              <strong className="text-primary">Skills:</strong>{" "}
              {Object.entries(monster.skills)
                .map(([skill, mod]) => `${skill} ${mod}`)
                .join(", ")}
            </p>
          )}
        </div>
      ) : null}

      {/* Resistances & Immunities */}
      {(monster.damage_resistances?.length ||
        monster.damage_immunities?.length ||
        monster.condition_immunities?.length) && (
        <div className="space-y-2">
          {monster.damage_resistances &&
            monster.damage_resistances.length > 0 && (
              <p className="text-text">
                <strong className="text-blue-400">Damage Resistances:</strong>{" "}
                {monster.damage_resistances.join(", ")}
              </p>
            )}
          {monster.damage_immunities &&
            monster.damage_immunities.length > 0 && (
              <p className="text-text">
                <strong className="text-purple-400">Damage Immunities:</strong>{" "}
                {monster.damage_immunities.join(", ")}
              </p>
            )}
          {monster.condition_immunities &&
            monster.condition_immunities.length > 0 && (
              <p className="text-text">
                <strong className="text-green-400">
                  Condition Immunities:
                </strong>{" "}
                {monster.condition_immunities.join(", ")}
              </p>
            )}
        </div>
      )}

      {/* Senses & Languages */}
      <div className="space-y-2">
        {monster.senses && Object.keys(monster.senses).length > 0 && (
          <p className="text-text">
            <strong className="text-primary">Senses:</strong>{" "}
            {Object.entries(monster.senses)
              .map(([sense, range]) => {
                if (sense === "description") return String(range);
                if (typeof range === "number") return `${sense} ${range} ft.`;
                return `${sense} ${range}`;
              })
              .join(", ")}
          </p>
        )}
        {monster.languages && monster.languages.length > 0 && (
          <p className="text-text">
            <strong className="text-primary">Languages:</strong>{" "}
            {monster.languages.join(", ")}
          </p>
        )}
      </div>

      {/* Traits */}
      {monster.traits && monster.traits.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Traits
          </h3>
          <div className="space-y-3">
            {monster.traits.map((trait, i) => (
              <div
                key={i}
                className="bg-background p-4 rounded border border-primary/30"
              >
                <h4 className="font-medium text-primary mb-2">{trait.name}</h4>
                <p className="text-text text-sm">{trait.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {monster.actions && monster.actions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Swords" className="w-5 h-5 text-red-400" />
            Actions
          </h3>
          <div className="space-y-3">
            {monster.actions.map((action, i) => (
              <div
                key={i}
                className="bg-background p-4 rounded border border-red-500/30"
              >
                <h4 className="font-medium text-red-400 mb-2">{action.name}</h4>
                <p className="text-text text-sm">{action.description}</p>
                {(action.attack_bonus || action.damage) && (
                  <p className="text-text-muted text-xs mt-2">
                    {action.attack_bonus && (
                      <span>Attack: {action.attack_bonus} to hit. </span>
                    )}
                    {action.damage && <span>Damage: {action.damage}</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legendary Actions */}
      {monster.legendary_actions && monster.legendary_actions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5" />
            Legendary Actions
          </h3>
          <div className="space-y-3">
            {monster.legendary_actions.map((action, i) => (
              <div
                key={i}
                className="bg-amber-500/10 p-4 rounded border border-amber-500/30"
              >
                <h4 className="font-medium text-amber-400 mb-2">
                  {action.name}
                </h4>
                <p className="text-text text-sm">{action.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lair Actions */}
      {monster.lair_actions && monster.lair_actions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <Icon name="MapPin" className="w-5 h-5" />
            Lair Actions
          </h3>
          <div className="space-y-3">
            {monster.lair_actions.map((action, i) => (
              <div
                key={i}
                className="bg-purple-500/10 p-4 rounded border border-purple-500/30"
              >
                <h4 className="font-medium text-purple-400 mb-2">
                  {action.name}
                </h4>
                <p className="text-text text-sm">{action.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lore */}
      {monster.lore && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="BookOpen" className="w-5 h-5 text-primary" />
            Lore
          </h3>
          <div className="bg-background p-4 rounded border border-border">
            <p className="text-text">{monster.lore}</p>
          </div>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {monster._raw && (
        <RawDataViewer data={monster._raw} defaultExpanded={showRawResponse} />
      )}

      {/* Actions */}
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
        title="Monster Generator"
        description="Create custom monsters with complete stat blocks and lore"
        icon="Skull"
        formTitle="Monster Details"
        formIcon="Settings"
        resultsTitle={
          entryMode === "manual" ? "Manual Entry" : "Generated Monster"
        }
        formContent={formContent}
        generatedContent={
          entryMode === "manual" ? manualPreviewContent : generatedContent
        }
        isGenerating={loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Monster"
        error={error}
        hideGenerateButton={entryMode === "manual"}
      />

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        entityName={monster?.name || "Monster"}
        campaignId={campaignId}
      />
    </>
  );
}
