// AI Generation Form for NPCs

import { Dispatch, SetStateAction } from "react";
import { FormField } from "@/components/ui/FormField";
import CampaignSelector from "@/components/common/CampaignSelector";
import AISettings from "@/components/generators/AISettings";
import type { AIGenerationSettings } from "../hooks/useGenerator";

export interface NPCFormData {
  race: string;
  class: string;
  level: number;
  role: string;
  personality: string;
  special_requests: string;
}

interface NPCAIFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  formData: NPCFormData;
  setFormData: Dispatch<SetStateAction<NPCFormData>>;
  aiSettings: AIGenerationSettings;
  setAiSettings: (settings: AIGenerationSettings) => void;
}

export function NPCAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: NPCAIFormProps) {
  return (
    <>
      <AISettings generatorType="npc" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      <FormField label="Race">
        <select
          value={formData.race}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, race: e.target.value }))
          }
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
          value={formData.class}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, class: e.target.value }))
          }
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
          value={formData.level}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              level: parseInt(e.target.value) || 1,
            }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Role">
        <select
          value={formData.role}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, role: e.target.value }))
          }
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
          value={formData.personality}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, personality: e.target.value }))
          }
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
          value={formData.special_requests}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              special_requests: e.target.value,
            }))
          }
          placeholder="e.g., 'Has a clockwork pet owl' or 'Searching for their missing sibling'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  );
}
