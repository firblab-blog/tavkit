import { useState } from "react";
import Icon, { IconName } from "../common/Icon";
import { apiClient } from "@/api/client";
import { logger } from "@/utils/logger";
import { Character } from "@/store/characterStore";

interface CharacterEditFormProps {
  character: Character;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CharacterFormData {
  // Basic Info
  name: string;
  race: string;
  subrace: string;
  class_info: string;
  subclass: string;
  level: number | "";
  background: string;
  alignment: string;
  experience_points: number | "";
  // Ability Scores
  strength: number | "";
  dexterity: number | "";
  constitution: number | "";
  intelligence: number | "";
  wisdom: number | "";
  charisma: number | "";
  // Combat Stats
  armor_class: number | "";
  max_hit_points: number | "";
  current_hit_points: number | "";
  temp_hit_points: number | "";
  speed: number | "";
  initiative: number | "";
  hit_dice: string;
  proficiency_bonus: number | "";
  // Personality
  personality_traits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
  // Appearance
  age: string;
  height: string;
  weight: string;
  eyes: string;
  skin: string;
  hair: string;
  appearance: string;
  // Other
  faith: string;
  lifestyle: string;
  allies_organizations: string;
  treasure: string;
  notes: string;
  // Currency
  cp: number | "";
  sp: number | "";
  ep: number | "";
  gp: number | "";
  pp: number | "";
  // Languages (comma-separated)
  languages: string;
}

const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
];

interface CollapsibleSectionProps {
  title: string;
  icon: IconName;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-background-panel hover:bg-background transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon name={icon} className="w-4 h-4 text-primary" />
          <span className="font-medium text-text">{title}</span>
        </div>
        <Icon
          name={isOpen ? "ChevronDown" : "ChevronRight"}
          className="w-4 h-4 text-text-muted"
        />
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 border-t border-border">{children}</div>
      )}
    </div>
  );
}

export default function CharacterEditForm({
  character,
  onSuccess,
  onCancel,
}: CharacterEditFormProps) {
  // Initialize form with character data
  const [formData, setFormData] = useState<CharacterFormData>({
    name: character.name || "",
    race: character.race || "",
    subrace: "",
    class_info: character.class_info || "",
    subclass: "",
    level: character.level || 1,
    background: character.background || "",
    alignment: character.alignment || "",
    experience_points: character.experience || 0,
    strength: character.strength || 10,
    dexterity: character.dexterity || 10,
    constitution: character.constitution || 10,
    intelligence: character.intelligence || 10,
    wisdom: character.wisdom || 10,
    charisma: character.charisma || 10,
    armor_class: character.armor_class || 10,
    max_hit_points: character.max_hp || "",
    current_hit_points: character.current_hp || "",
    temp_hit_points: character.temp_hp || "",
    speed: character.speed || 30,
    initiative: character.initiative || "",
    hit_dice: character.hit_dice || "",
    proficiency_bonus: character.proficiency_bonus || 2,
    personality_traits: character.personality_traits || "",
    ideals: character.ideals || "",
    bonds: character.bonds || "",
    flaws: character.flaws || "",
    backstory: character.backstory || "",
    age: "",
    height: "",
    weight: "",
    eyes: "",
    skin: "",
    hair: "",
    appearance: character.appearance || "",
    faith: "",
    lifestyle: "",
    allies_organizations: "",
    treasure: "",
    notes: character.notes || "",
    cp: (character.currency as any)?.cp || "",
    sp: (character.currency as any)?.sp || "",
    ep: (character.currency as any)?.ep || "",
    gp: (character.currency as any)?.gp || "",
    pp: (character.currency as any)?.pp || "",
    languages: character.languages?.join(", ") || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (
    field: keyof CharacterFormData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (
    field: keyof CharacterFormData,
    value: string,
  ) => {
    const numValue = value === "" ? "" : parseInt(value, 10);
    if (
      value === "" ||
      (!isNaN(numValue as number) && (numValue as number) >= 0)
    ) {
      setFormData((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Character name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Build the request payload
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        race: formData.race.trim() || "",
        class_info: formData.class_info.trim() || "",
        level: formData.level || 1,
      };

      // Basic Info
      if (formData.subrace.trim()) payload.subrace = formData.subrace.trim();
      if (formData.subclass.trim()) payload.subclass = formData.subclass.trim();
      if (formData.background.trim())
        payload.background = formData.background.trim();
      if (formData.alignment) payload.alignment = formData.alignment;
      payload.experience_points = formData.experience_points || 0;

      // Ability scores
      payload.strength = formData.strength || 10;
      payload.dexterity = formData.dexterity || 10;
      payload.constitution = formData.constitution || 10;
      payload.intelligence = formData.intelligence || 10;
      payload.wisdom = formData.wisdom || 10;
      payload.charisma = formData.charisma || 10;

      // Combat stats
      payload.armor_class = formData.armor_class || 10;
      payload.max_hit_points = formData.max_hit_points || 0;
      payload.current_hit_points =
        formData.current_hit_points || formData.max_hit_points || 0;
      payload.temp_hit_points = formData.temp_hit_points || 0;
      payload.speed = formData.speed || 30;
      payload.initiative = formData.initiative || 0;
      if (formData.hit_dice.trim()) payload.hit_dice = formData.hit_dice.trim();
      payload.proficiency_bonus = formData.proficiency_bonus || 2;

      // Personality & Background
      if (formData.personality_traits.trim())
        payload.personality_traits = formData.personality_traits.trim();
      if (formData.ideals.trim()) payload.ideals = formData.ideals.trim();
      if (formData.bonds.trim()) payload.bonds = formData.bonds.trim();
      if (formData.flaws.trim()) payload.flaws = formData.flaws.trim();
      if (formData.backstory.trim())
        payload.backstory = formData.backstory.trim();

      // Appearance
      if (formData.age.trim()) payload.age = formData.age.trim();
      if (formData.height.trim()) payload.height = formData.height.trim();
      if (formData.weight.trim()) payload.weight = formData.weight.trim();
      if (formData.eyes.trim()) payload.eyes = formData.eyes.trim();
      if (formData.skin.trim()) payload.skin = formData.skin.trim();
      if (formData.hair.trim()) payload.hair = formData.hair.trim();
      if (formData.appearance.trim())
        payload.appearance = formData.appearance.trim();

      // Other
      if (formData.faith.trim()) payload.faith = formData.faith.trim();
      if (formData.lifestyle) payload.lifestyle = formData.lifestyle;
      if (formData.allies_organizations.trim())
        payload.allies_organizations = formData.allies_organizations.trim();
      if (formData.treasure.trim()) payload.treasure = formData.treasure.trim();
      if (formData.notes.trim()) payload.notes = formData.notes.trim();

      // Currency
      const currency: Record<string, number> = {};
      if (formData.cp !== "" && formData.cp > 0) currency.cp = formData.cp;
      if (formData.sp !== "" && formData.sp > 0) currency.sp = formData.sp;
      if (formData.ep !== "" && formData.ep > 0) currency.ep = formData.ep;
      if (formData.gp !== "" && formData.gp > 0) currency.gp = formData.gp;
      if (formData.pp !== "" && formData.pp > 0) currency.pp = formData.pp;
      if (Object.keys(currency).length > 0) payload.currency = currency;

      // Languages
      if (formData.languages.trim()) {
        const langs = formData.languages
          .split(",")
          .map((l) => l.trim())
          .filter((l) => l);
        if (langs.length > 0) payload.languages = langs;
      }

      const response = await apiClient.put(
        `/characters/${character.id}`,
        payload,
      );
      logger.debug("Character updated successfully:", response.data);
      onSuccess();
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to update character",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Required: Character Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-text mb-2"
        >
          Character Name <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="Enter character name"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={loading}
          autoFocus
        />
      </div>

      {/* Basic Info Section - Always visible */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="race"
            className="block text-sm font-medium text-text mb-2"
          >
            Race
          </label>
          <input
            id="race"
            type="text"
            value={formData.race}
            onChange={(e) => handleInputChange("race", e.target.value)}
            placeholder="e.g., Human, Elf"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="subrace"
            className="block text-sm font-medium text-text mb-2"
          >
            Subrace
          </label>
          <input
            id="subrace"
            type="text"
            value={formData.subrace}
            onChange={(e) => handleInputChange("subrace", e.target.value)}
            placeholder="e.g., High Elf"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="class_info"
            className="block text-sm font-medium text-text mb-2"
          >
            Class
          </label>
          <input
            id="class_info"
            type="text"
            value={formData.class_info}
            onChange={(e) => handleInputChange("class_info", e.target.value)}
            placeholder="e.g., Fighter, Wizard"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="subclass"
            className="block text-sm font-medium text-text mb-2"
          >
            Subclass
          </label>
          <input
            id="subclass"
            type="text"
            value={formData.subclass}
            onChange={(e) => handleInputChange("subclass", e.target.value)}
            placeholder="e.g., Champion"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="level"
            className="block text-sm font-medium text-text mb-2"
          >
            Level
          </label>
          <input
            id="level"
            type="number"
            min="1"
            max="20"
            value={formData.level}
            onChange={(e) => handleNumberChange("level", e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="background"
            className="block text-sm font-medium text-text mb-2"
          >
            Background
          </label>
          <input
            id="background"
            type="text"
            value={formData.background}
            onChange={(e) => handleInputChange("background", e.target.value)}
            placeholder="e.g., Soldier"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="experience_points"
            className="block text-sm font-medium text-text mb-2"
          >
            XP
          </label>
          <input
            id="experience_points"
            type="number"
            min="0"
            value={formData.experience_points}
            onChange={(e) =>
              handleNumberChange("experience_points", e.target.value)
            }
            placeholder="0"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="alignment"
          className="block text-sm font-medium text-text mb-2"
        >
          Alignment
        </label>
        <select
          id="alignment"
          value={formData.alignment}
          onChange={(e) => handleInputChange("alignment", e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={loading}
        >
          <option value="">Select alignment...</option>
          {ALIGNMENTS.map((alignment) => (
            <option key={alignment} value={alignment}>
              {alignment}
            </option>
          ))}
        </select>
      </div>

      {/* Ability Scores */}
      <CollapsibleSection
        title="Ability Scores"
        icon="Dices"
        defaultOpen={true}
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "strength", label: "STR" },
            { key: "dexterity", label: "DEX" },
            { key: "constitution", label: "CON" },
            { key: "intelligence", label: "INT" },
            { key: "wisdom", label: "WIS" },
            { key: "charisma", label: "CHA" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label
                htmlFor={key}
                className="block text-xs font-medium text-text-muted mb-1 text-center"
              >
                {label}
              </label>
              <input
                id={key}
                type="number"
                min="1"
                max="30"
                value={formData[key as keyof CharacterFormData]}
                onChange={(e) =>
                  handleNumberChange(
                    key as keyof CharacterFormData,
                    e.target.value,
                  )
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-center focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Combat Stats */}
      <CollapsibleSection title="Combat Stats" icon="Swords" defaultOpen={true}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="armor_class"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Armor Class
            </label>
            <input
              id="armor_class"
              type="number"
              min="0"
              value={formData.armor_class}
              onChange={(e) =>
                handleNumberChange("armor_class", e.target.value)
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="max_hit_points"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Max HP
            </label>
            <input
              id="max_hit_points"
              type="number"
              min="1"
              value={formData.max_hit_points}
              onChange={(e) =>
                handleNumberChange("max_hit_points", e.target.value)
              }
              placeholder="—"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="current_hit_points"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Current HP
            </label>
            <input
              id="current_hit_points"
              type="number"
              min="0"
              value={formData.current_hit_points}
              onChange={(e) =>
                handleNumberChange("current_hit_points", e.target.value)
              }
              placeholder="—"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="speed"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Speed
            </label>
            <input
              id="speed"
              type="number"
              min="0"
              value={formData.speed}
              onChange={(e) => handleNumberChange("speed", e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="proficiency_bonus"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Proficiency
            </label>
            <input
              id="proficiency_bonus"
              type="number"
              min="1"
              max="9"
              value={formData.proficiency_bonus}
              onChange={(e) =>
                handleNumberChange("proficiency_bonus", e.target.value)
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="hit_dice"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Hit Dice
            </label>
            <input
              id="hit_dice"
              type="text"
              value={formData.hit_dice}
              onChange={(e) => handleInputChange("hit_dice", e.target.value)}
              placeholder="e.g., 1d10"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Personality & Background */}
      <CollapsibleSection
        title="Personality & Background"
        icon="User"
        defaultOpen={false}
      >
        <div>
          <label
            htmlFor="personality_traits"
            className="block text-xs font-medium text-text-muted mb-1"
          >
            Personality Traits
          </label>
          <textarea
            id="personality_traits"
            value={formData.personality_traits}
            onChange={(e) =>
              handleInputChange("personality_traits", e.target.value)
            }
            placeholder="What makes your character unique?"
            rows={2}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            disabled={loading}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="ideals"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Ideals
            </label>
            <textarea
              id="ideals"
              value={formData.ideals}
              onChange={(e) => handleInputChange("ideals", e.target.value)}
              placeholder="What do they believe in?"
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="bonds"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Bonds
            </label>
            <textarea
              id="bonds"
              value={formData.bonds}
              onChange={(e) => handleInputChange("bonds", e.target.value)}
              placeholder="What connections do they have?"
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={loading}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="flaws"
            className="block text-xs font-medium text-text-muted mb-1"
          >
            Flaws
          </label>
          <textarea
            id="flaws"
            value={formData.flaws}
            onChange={(e) => handleInputChange("flaws", e.target.value)}
            placeholder="What are their weaknesses?"
            rows={2}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="backstory"
            className="block text-xs font-medium text-text-muted mb-1"
          >
            Backstory
          </label>
          <textarea
            id="backstory"
            value={formData.backstory}
            onChange={(e) => handleInputChange("backstory", e.target.value)}
            placeholder="Your character's history..."
            rows={4}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            disabled={loading}
          />
        </div>
      </CollapsibleSection>

      {/* Appearance */}
      <CollapsibleSection title="Appearance" icon="Eye" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="age"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Age
            </label>
            <input
              id="age"
              type="text"
              value={formData.age}
              onChange={(e) => handleInputChange("age", e.target.value)}
              placeholder="e.g., 25"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="height"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Height
            </label>
            <input
              id="height"
              type="text"
              value={formData.height}
              onChange={(e) => handleInputChange("height", e.target.value)}
              placeholder={"e.g., 5'10\""}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="weight"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Weight
            </label>
            <input
              id="weight"
              type="text"
              value={formData.weight}
              onChange={(e) => handleInputChange("weight", e.target.value)}
              placeholder="e.g., 180 lbs"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="eyes"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Eyes
            </label>
            <input
              id="eyes"
              type="text"
              value={formData.eyes}
              onChange={(e) => handleInputChange("eyes", e.target.value)}
              placeholder="e.g., Blue"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="skin"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Skin
            </label>
            <input
              id="skin"
              type="text"
              value={formData.skin}
              onChange={(e) => handleInputChange("skin", e.target.value)}
              placeholder="e.g., Fair"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="hair"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Hair
            </label>
            <input
              id="hair"
              type="text"
              value={formData.hair}
              onChange={(e) => handleInputChange("hair", e.target.value)}
              placeholder="e.g., Black"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="appearance"
            className="block text-xs font-medium text-text-muted mb-1"
          >
            Appearance Description
          </label>
          <textarea
            id="appearance"
            value={formData.appearance}
            onChange={(e) => handleInputChange("appearance", e.target.value)}
            placeholder="Describe your character's appearance..."
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            disabled={loading}
          />
        </div>
      </CollapsibleSection>

      {/* Currency */}
      <CollapsibleSection title="Currency" icon="Package" defaultOpen={false}>
        <div className="grid grid-cols-5 gap-2">
          {[
            { key: "cp", label: "CP" },
            { key: "sp", label: "SP" },
            { key: "ep", label: "EP" },
            { key: "gp", label: "GP" },
            { key: "pp", label: "PP" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label
                htmlFor={key}
                className="block text-xs font-medium text-text-muted mb-1 text-center"
              >
                {label}
              </label>
              <input
                id={key}
                type="number"
                min="0"
                value={formData[key as keyof CharacterFormData]}
                onChange={(e) =>
                  handleNumberChange(
                    key as keyof CharacterFormData,
                    e.target.value,
                  )
                }
                placeholder="0"
                className="w-full px-2 py-2 bg-background border border-border rounded-lg text-text text-center placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Other Details */}
      <CollapsibleSection
        title="Other Details"
        icon="FileText"
        defaultOpen={false}
      >
        <div>
          <label
            htmlFor="languages"
            className="block text-xs font-medium text-text-muted mb-1"
          >
            Languages (comma-separated)
          </label>
          <input
            id="languages"
            type="text"
            value={formData.languages}
            onChange={(e) => handleInputChange("languages", e.target.value)}
            placeholder="e.g., Common, Elvish, Dwarvish"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="notes"
            className="block text-xs font-medium text-text-muted mb-1"
          >
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder="Any additional notes about your character..."
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            disabled={loading}
          />
        </div>
      </CollapsibleSection>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons - Sticky at bottom */}
      <div className="flex gap-3 pt-4 sticky bottom-0 bg-background-panel pb-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !formData.name.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <Icon name="Loader2" className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Icon name="Save" className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
