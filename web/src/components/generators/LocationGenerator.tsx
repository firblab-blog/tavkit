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
  ManualLocationData,
  defaultLocationData,
  locationTypeOptions,
  sizeOptions,
} from "./shared/schemas/locationSchema";
import {
  generateLocation as generateLocationApi,
  saveLocation as saveLocationApi,
  getErrorMessage,
} from "@/api/generators";
import { normalizeToStringArray } from "@/utils/aiResponseNormalizer";
import { logger } from "@/utils/logger";

interface LocationData {
  name: string;
  type: string;
  size?: string;
  danger_level?: string;
  theme: string;
  description: string;
  features: string[];
  secrets: string[];
  factions: string[];
  npcs: string[];
  encounters: string[];
  map?: string;
  _raw?: Record<string, unknown>;
  _parseError?: string;
}

/**
 * Main normalization function - converts raw AI response to typed LocationData
 * This is the frontend safety net (backend should also validate)
 */
function normalizeLocationResponse(raw: Record<string, unknown>): LocationData {
  logger.debug(
    "[LocationGenerator] normalizeLocationResponse input:",
    JSON.stringify(raw, null, 2),
  );

  let processedRaw = raw;

  // First, check if the raw data has a nested location object (properly structured response)
  if (raw.location && typeof raw.location === "object") {
    logger.debug("[LocationGenerator] Found nested location object");
    processedRaw = raw.location as Record<string, unknown>;
  }

  // Handle case where description contains the entire JSON response
  // (happens when backend JSON parse fails and puts raw content in description)
  if (
    processedRaw.description &&
    typeof processedRaw.description === "string"
  ) {
    const descStr = (processedRaw.description as string).trim();
    logger.debug(
      "[LocationGenerator] Description field (first 300 chars):",
      descStr.substring(0, 300),
    );

    // Check if description looks like JSON
    if (descStr.startsWith("{")) {
      try {
        // Try to parse the whole description as JSON directly
        const parsedLocation = JSON.parse(descStr);
        logger.debug(
          "[LocationGenerator] Successfully parsed JSON from description!",
        );
        logger.debug("[LocationGenerator] Parsed name:", parsedLocation.name);
        logger.debug(
          "[LocationGenerator] Parsed keys:",
          Object.keys(parsedLocation),
        );
        // Use parsed values - they're the REAL data, not the fallbacks
        processedRaw = parsedLocation;
      } catch (e) {
        logger.warn(
          "[LocationGenerator] Failed to parse description as JSON:",
          e,
        );
        // Try to find just the first complete JSON object using a more careful approach
        let braceCount = 0;
        let jsonEndIndex = -1;
        let inString = false;
        let escaped = false;

        for (let i = 0; i < descStr.length; i++) {
          const char = descStr[i];

          if (escaped) {
            escaped = false;
            continue;
          }

          if (char === "\\" && inString) {
            escaped = true;
            continue;
          }

          if (char === '"' && !escaped) {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === "{") braceCount++;
            if (char === "}") {
              braceCount--;
              if (braceCount === 0) {
                jsonEndIndex = i;
                break;
              }
            }
          }
        }

        if (jsonEndIndex > 0) {
          const jsonSubstring = descStr.substring(0, jsonEndIndex + 1);
          try {
            const parsedLocation = JSON.parse(jsonSubstring);
            logger.debug(
              "[LocationGenerator] Parsed JSON using brace matching!",
            );
            processedRaw = parsedLocation;
          } catch (e2) {
            logger.warn(
              "[LocationGenerator] Brace-matched JSON also failed:",
              e2,
            );
          }
        }
      }
    }
  }

  logger.debug("[LocationGenerator] processedRaw.name:", processedRaw.name);
  logger.debug(
    "[LocationGenerator] processedRaw.summary:",
    processedRaw.summary,
  );
  logger.debug(
    "[LocationGenerator] processedRaw.description type:",
    typeof processedRaw.description,
  );

  // Build description from available fields (AI may use different field names)
  let description = "";

  // Check for summary field (AI sometimes uses this)
  if (processedRaw.summary && typeof processedRaw.summary === "string") {
    description = processedRaw.summary;
  }

  // Add main description if different from summary
  if (
    processedRaw.description &&
    typeof processedRaw.description === "string"
  ) {
    const descText = processedRaw.description;
    // Only add if it's not JSON and not already included
    if (!descText.trim().startsWith("{") && descText !== description) {
      description = description ? `${description}\n\n${descText}` : descText;
    }
  }

  // Build extra info section from fields AI might include
  const extraInfo: string[] = [];
  if (processedRaw.region) extraInfo.push(`Region: ${processedRaw.region}`);
  if (processedRaw.population)
    extraInfo.push(`Population: ${processedRaw.population}`);
  if (processedRaw.government)
    extraInfo.push(`Government: ${processedRaw.government}`);
  if (processedRaw.established)
    extraInfo.push(`Established: ${processedRaw.established}`);
  if (processedRaw.atmosphere)
    extraInfo.push(`Atmosphere: ${processedRaw.atmosphere}`);

  if (extraInfo.length > 0) {
    description = extraInfo.join("\n") + "\n\n" + description;
  }

  // Collect unexpected fields for debugging
  const expectedFields = [
    "name",
    "type",
    "theme",
    "description",
    "features",
    "secrets",
    "factions",
    "npcs",
    "encounters",
    "map",
    "provider",
    "_parse_warning",
    "summary",
    "region",
    "population",
    "government",
    "established",
    "atmosphere",
    "notable_features",
    "notable_npcs",
    "encounter_hooks",
    "adventure_hooks",
  ];
  const unexpectedFields: Record<string, unknown> = {};
  for (const key of Object.keys(processedRaw)) {
    if (!expectedFields.includes(key)) {
      unexpectedFields[key] = processedRaw[key];
    }
  }

  const result: LocationData = {
    name: String(processedRaw.name || "Unknown Location"),
    type: String(processedRaw.type || ""),
    theme: String(processedRaw.theme || ""),
    description: description || "No description available.",
    // Handle alternative field names AI might use
    features: normalizeToStringArray(
      processedRaw.features || processedRaw.notable_features,
    ),
    secrets: normalizeToStringArray(processedRaw.secrets),
    factions: normalizeToStringArray(processedRaw.factions),
    npcs: normalizeToStringArray(
      processedRaw.npcs || processedRaw.notable_npcs,
    ),
    encounters: normalizeToStringArray(
      processedRaw.encounters ||
        processedRaw.encounter_hooks ||
        processedRaw.adventure_hooks,
    ),
    map: processedRaw.map ? String(processedRaw.map) : undefined,
    _raw:
      Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  };

  logger.debug("[LocationGenerator] Final normalized result:", result);
  return result;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function LocationGenerator() {
  const [specialRequests, setSpecialRequests] = useState("");
  const [type, setType] = useState("city");
  const [size, setSize] = useState("medium");
  const [danger, setDanger] = useState("moderate");
  const [theme, setTheme] = useState("fantasy");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Manual entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>("ai");
  const [manualData, setManualData] =
    useState<ManualLocationData>(defaultLocationData);
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
    setLocation(null);
    setIsSaved(false);

    try {
      const data = await generateLocationApi(
        {
          campaign_id: campaignId || undefined,
          type: type,
          size: size,
          danger_level: danger,
          theme: theme,
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout,
      );
      logger.debug("[LocationGenerator] Raw API response:", data);

      // CRITICAL: Normalize the response to handle inconsistent AI output
      if (data.location) {
        const normalized = normalizeLocationResponse(data.location);

        // Check if we got valid content
        if (!hasValidLocationContent(normalized)) {
          normalized._parseError =
            "AI response missing essential location content. Showing raw response.";
        }

        setLocation(normalized);
      } else {
        // AI returned data at root level instead of nested
        const normalized = normalizeLocationResponse(
          data as unknown as Record<string, unknown>,
        );
        normalized._parseError =
          "Unexpected response format. Attempting to display.";
        setLocation(normalized);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if location has valid essential content
   */
  function hasValidLocationContent(location: LocationData): boolean {
    return !!(
      location.name &&
      location.name !== "Unknown Location" &&
      (location.description ||
        location.features.length > 0 ||
        location.secrets.length > 0)
    );
  }

  const handleSave = async () => {
    if (!location) return;

    setError("");

    try {
      const activeCampaignId = useCampaignStore.getState().activeCampaignId;

      await saveLocationApi({
        name: location.name || "Unnamed Location",
        type: location.type || type || "dungeon",
        theme: location.theme || theme,
        description: location.description,
        features: location.features || [],
        secrets: location.secrets || [],
        factions: location.factions || [],
        npcs: location.npcs || [],
        encounters: location.encounters || [],
        campaign_id: activeCampaignId || undefined,
        ai_generated: true,
      });

      setShowSaveModal(false);
      setIsSaved(true);
      emitContentSaved();
    } catch (err) {
      logger.error("[LocationGenerator] Save error:", err);
      setError(getErrorMessage(err));
    }
  };

  const handleCopy = () => {
    if (!location) return;
    let text = `${location.name}\n${location.type}${location.theme ? ` • ${location.theme}` : ""}\n\n${location.description}`;

    if (location.features && location.features.length > 0) {
      text += "\n\nFeatures:\n";
      location.features.forEach((feature) => {
        text += `- ${feature}\n`;
      });
    }

    if (location.secrets && location.secrets.length > 0) {
      text += "\nSecrets:\n";
      location.secrets.forEach((secret) => {
        text += `- ${secret}\n`;
      });
    }

    if (location.npcs && location.npcs.length > 0) {
      text += "\nNotable NPCs:\n";
      location.npcs.forEach((npc) => {
        text += `- ${npc}\n`;
      });
    }

    if (location.encounters && location.encounters.length > 0) {
      text += "\nEncounter Hooks:\n";
      location.encounters.forEach((encounter) => {
        text += `- ${encounter}\n`;
      });
    }

    if (location.factions && location.factions.length > 0) {
      text += "\nFactions:\n";
      location.factions.forEach((faction) => {
        text += `- ${faction}\n`;
      });
    }

    navigator.clipboard.writeText(text);
  };

  // Handle manual entry save
  const handleManualSave = async () => {
    if (!manualData.name.trim()) {
      setError("Location name is required");
      return;
    }

    setManualSaving(true);
    setError("");

    try {
      await saveLocationApi({
        campaign_id: campaignId || undefined,
        name: manualData.name.trim(),
        type: manualData.location_type,
        theme: "", // manual entries don't have theme
        description: manualData.description.trim() || "",
        features: manualData.notable_features.filter((f) => f.trim()),
        secrets: manualData.secrets.filter((s) => s.trim()),
        factions: [], // not in manual schema
        npcs: manualData.inhabitants.filter((i) => i.trim()),
        encounters: manualData.hazards.filter((h) => h.trim()),
        ai_generated: false,
      });

      setManualSaved(true);
      emitContentSaved();
      // Reset form after successful save
      setManualData(defaultLocationData);
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
      <AISettings generatorType="location" onSettingsChange={setAiSettings} />

      {/* Campaign Context */}
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true;
          setCampaignId(id);
        }}
      />

      {/* Location Type */}
      <FormField label="Type">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="city">City (large settlement)</option>
          <option value="town">Town (medium settlement)</option>
          <option value="village">Village (small settlement)</option>
          <option value="dungeon">Dungeon (underground complex)</option>
          <option value="ruins">Ruins (ancient remains)</option>
          <option value="castle">Castle/Fortress (fortified)</option>
          <option value="temple">Temple/Shrine (sacred)</option>
          <option value="tower">Tower/Spire (vertical)</option>
          <option value="cave">Cave System (natural)</option>
          <option value="forest">Forest/Grove (wooded)</option>
          <option value="mountain">Mountain/Peak (elevated)</option>
          <option value="island">Island (isolated)</option>
          <option value="plane">Planar Location (otherworldly)</option>
        </select>
      </FormField>

      {/* Size */}
      <FormField label="Size">
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="tiny">Tiny (single room)</option>
          <option value="small">Small (few rooms)</option>
          <option value="medium">Medium (several areas)</option>
          <option value="large">Large (many areas)</option>
          <option value="vast">Vast (sprawling)</option>
        </select>
      </FormField>

      {/* Danger Level */}
      <FormField label="Danger Level">
        <select
          value={danger}
          onChange={(e) => setDanger(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="safe">Safe (peaceful)</option>
          <option value="low">Low (minor threats)</option>
          <option value="moderate">Moderate (some danger)</option>
          <option value="high">High (very dangerous)</option>
          <option value="deadly">Deadly (extremely perilous)</option>
        </select>
      </FormField>

      {/* Theme */}
      <FormField label="Theme">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="fantasy">Standard Fantasy (classic)</option>
          <option value="gothic">Gothic Horror (dark, brooding)</option>
          <option value="high_magic">High Magic (arcane-infused)</option>
          <option value="low_magic">Low Magic (mundane, grounded)</option>
          <option value="dark">Dark/Grim (foreboding)</option>
          <option value="whimsical">Whimsical/Fey (magical, playful)</option>
          <option value="steampunk">Steampunk (industrial magic)</option>
          <option value="ancient">Ancient/Forgotten (lost civilization)</option>
          <option value="corrupted">Corrupted/Cursed (blighted)</option>
        </select>
      </FormField>

      {/* Special Requests */}
      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Built inside a massive geode' or 'Floating in the sky on crystal platforms' or 'Home to a secret wizard's library'"
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
      <FormField label="Location Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) =>
            setManualData({ ...manualData, name: e.target.value })
          }
          placeholder="e.g., The Sunken Crypt, Willowbrook Village"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Location Type">
          <select
            value={manualData.location_type}
            onChange={(e) =>
              setManualData({ ...manualData, location_type: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {locationTypeOptions.map((opt) => (
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

      <FormField label="Description">
        <textarea
          value={manualData.description}
          onChange={(e) =>
            setManualData({ ...manualData, description: e.target.value })
          }
          placeholder="Describe the location..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>

      <FormField label="Atmosphere">
        <input
          type="text"
          value={manualData.atmosphere}
          onChange={(e) =>
            setManualData({ ...manualData, atmosphere: e.target.value })
          }
          placeholder="e.g., Dark and foreboding, Peaceful and serene"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      {/* Notable Features */}
      <CollapsibleSection title="Notable Features" defaultExpanded>
        <ArrayFieldEditor
          label="Features"
          values={manualData.notable_features}
          onChange={(notable_features) =>
            setManualData({ ...manualData, notable_features })
          }
          placeholder="Add a notable feature..."
        />
      </CollapsibleSection>

      {/* Inhabitants */}
      <CollapsibleSection title="Inhabitants" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Inhabitants"
          values={manualData.inhabitants}
          onChange={(inhabitants) =>
            setManualData({ ...manualData, inhabitants })
          }
          placeholder="Add an inhabitant or NPC..."
        />
      </CollapsibleSection>

      {/* Secrets */}
      <CollapsibleSection title="Secrets (DM Only)" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Secrets"
          values={manualData.secrets}
          onChange={(secrets) => setManualData({ ...manualData, secrets })}
          placeholder="Add a secret..."
        />
      </CollapsibleSection>

      {/* Hazards */}
      <CollapsibleSection title="Hazards & Encounters" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Hazards"
          values={manualData.hazards}
          onChange={(hazards) => setManualData({ ...manualData, hazards })}
          placeholder="Add a hazard or encounter hook..."
        />
      </CollapsibleSection>

      {/* Treasure */}
      <CollapsibleSection title="Treasure & Loot" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Treasure"
          values={manualData.treasure}
          onChange={(treasure) => setManualData({ ...manualData, treasure })}
          placeholder="Add treasure or loot..."
        />
      </CollapsibleSection>

      {/* Connections */}
      <CollapsibleSection
        title="Connections to Other Locations"
        defaultExpanded={false}
      >
        <ArrayFieldEditor
          label="Connections"
          values={manualData.connections}
          onChange={(connections) =>
            setManualData({ ...manualData, connections })
          }
          placeholder="Add a connection..."
        />
      </CollapsibleSection>

      {/* History */}
      <CollapsibleSection title="History & Lore" defaultExpanded={false}>
        <FormField label="History">
          <textarea
            value={manualData.history}
            onChange={(e) =>
              setManualData({ ...manualData, history: e.target.value })
            }
            placeholder="Historical background of this location..."
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
          />
        </FormField>
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
            Save Location
          </>
        )}
      </button>

      {manualSaved && (
        <div className="text-center text-green-400 text-sm">
          Location saved! You can find it in the Saved Content section.
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
  const manualPreviewContent = <ManualEntryPreview entityType="location" />;

  const generatedContent = location ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {location._parseError && <ParseWarning message={location._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{location.name}</h2>
        <p className="text-sm text-text-muted capitalize">
          {location.type}
          {location.size && ` • ${location.size}`}
          {location.danger_level && ` • ${location.danger_level} danger`}
          {location.theme && ` • ${location.theme}`}
        </p>
      </div>

      {/* Description */}
      {location.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <div className="bg-background p-4 rounded border border-border">
            <p className="text-text whitespace-pre-line">
              {location.description}
            </p>
          </div>
        </div>
      )}

      {/* Features */}
      {location.features && location.features.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Map" className="w-5 h-5 text-primary" />
            Features
          </h3>
          <div className="space-y-2">
            {location.features.map((feature, i) => (
              <div
                key={i}
                className="bg-background p-3 rounded border border-primary/30"
              >
                <p className="text-text">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secrets - highlighted with amber */}
      {location.secrets && location.secrets.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Icon name="Eye" className="w-5 h-5" />
            Secrets (DM Only)
          </h3>
          <div className="space-y-2">
            {location.secrets.map((secret, i) => (
              <div
                key={i}
                className="bg-amber-500/10 p-3 rounded border border-amber-500/30"
              >
                <p className="text-text">{secret}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notable NPCs */}
      {location.npcs && location.npcs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Users" className="w-5 h-5 text-primary" />
            Notable NPCs
          </h3>
          <div className="space-y-2">
            {location.npcs.map((npc, i) => (
              <div
                key={i}
                className="bg-background p-3 rounded border border-border"
              >
                <p className="text-text">{npc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encounter Hooks - highlighted with red */}
      {location.encounters && location.encounters.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
            <Icon name="Swords" className="w-5 h-5" />
            Encounter Hooks
          </h3>
          <div className="space-y-2">
            {location.encounters.map((encounter, i) => (
              <div
                key={i}
                className="bg-red-500/10 p-3 rounded border border-red-500/30"
              >
                <p className="text-text">{encounter}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Factions */}
      {location.factions && location.factions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Shield" className="w-5 h-5 text-primary" />
            Factions
          </h3>
          <div className="space-y-2">
            {location.factions.map((faction, i) => (
              <div
                key={i}
                className="bg-background p-3 rounded border border-purple-500/30"
              >
                <p className="text-text">{faction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {location._raw && <RawDataViewer data={location._raw} />}

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
        title="Location Generator"
        description="Create detailed locations with features, secrets, and encounters"
        icon="Map"
        formTitle="Location Parameters"
        formIcon="Settings"
        resultsTitle={
          entryMode === "manual" ? "Manual Entry" : "Generated Location"
        }
        formContent={formContent}
        generatedContent={
          entryMode === "manual" ? manualPreviewContent : generatedContent
        }
        isGenerating={loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Location"
        error={error}
        hideGenerateButton={entryMode === "manual"}
      />

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        entityName={location?.name || "Location"}
        campaignId={campaignId}
      />
    </>
  );
}
