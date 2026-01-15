import { useState, useEffect } from "react";
import Icon from "../../../../common/Icon";
import { apiClient } from "../../../../../api/client";
import { logger } from "../../../../../utils/logger";

interface CampaignMember {
  id: string;
  user_id: string;
  character_id?: string;
  role: string;
}

interface Character {
  id: string;
  name: string;
  level: number;
  class_info: string;
  max_hp: number;
  current_hp: number;
  armor_class: number;
  initiative: number;
  passive_perception: number;
}

interface PartyImporterProps {
  readonly campaignId: string;
  readonly onImport: (participants: ImportedParticipant[]) => Promise<void>;
  readonly onClose: () => void;
}

export interface ImportedParticipant {
  participant_type: "pc";
  character_id: string;
  name: string;
  max_hp: number;
  ac: number;
  initiative: number;
  initiative_bonus: number;
  passive_perception: number;
}

export default function PartyImporter({
  campaignId,
  onImport,
  onClose,
}: PartyImporterProps) {
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [characters, setCharacters] = useState<Map<string, Character>>(
    new Map(),
  );
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(
    new Set(),
  );
  const [initiativeRolls, setInitiativeRolls] = useState<Map<string, number>>(
    new Map(),
  );
  const [autoRoll, setAutoRoll] = useState(true);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPartyMembers();
  }, [campaignId]);

  const fetchPartyMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch campaign members
      const membersResponse = await apiClient.get(
        `/campaigns/${campaignId}/members`,
      );
      const membersList: CampaignMember[] = membersResponse.data.members || [];

      // Filter to only members with characters
      const membersWithCharacters = membersList.filter((m) => m.character_id);

      setMembers(membersWithCharacters);

      // Fetch character data for each member
      const characterMap = new Map<string, Character>();
      await Promise.all(
        membersWithCharacters.map(async (member) => {
          if (member.character_id) {
            try {
              const charResponse = await apiClient.get(
                `/characters/${member.character_id}`,
              );
              characterMap.set(
                member.character_id,
                charResponse.data.character,
              );
            } catch (err) {
              logger.error(
                `Failed to fetch character ${member.character_id}:`,
                err,
              );
            }
          }
        }),
      );

      setCharacters(characterMap);

      // Auto-select all by default
      setSelectedCharacterIds(new Set(Array.from(characterMap.keys())));

      // Auto-roll initiative for all
      if (autoRoll) {
        const rolls = new Map<string, number>();
        characterMap.forEach((_char, id) => {
          rolls.set(id, rollD20());
        });
        setInitiativeRolls(rolls);
      }
    } catch (err) {
      setError("Failed to load party members");
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  const rollD20 = () => Math.floor(Math.random() * 20) + 1;

  const handleToggleCharacter = (characterId: string) => {
    const newSelected = new Set(selectedCharacterIds);
    if (newSelected.has(characterId)) {
      newSelected.delete(characterId);
    } else {
      newSelected.add(characterId);
      // Auto-roll if enabled and no roll exists
      if (autoRoll && !initiativeRolls.has(characterId)) {
        setInitiativeRolls((prev) => new Map(prev).set(characterId, rollD20()));
      }
    }
    setSelectedCharacterIds(newSelected);
  };

  const handleRollInitiative = (characterId: string) => {
    setInitiativeRolls((prev) => new Map(prev).set(characterId, rollD20()));
  };

  const handleSetInitiative = (characterId: string, roll: number) => {
    setInitiativeRolls((prev) => new Map(prev).set(characterId, roll));
  };

  const handleImport = async () => {
    const participants: ImportedParticipant[] = [];

    selectedCharacterIds.forEach((charId) => {
      const char = characters.get(charId);
      if (!char) return;

      const roll = initiativeRolls.get(charId) || 10;
      const totalInitiative = roll + char.initiative;

      participants.push({
        participant_type: "pc",
        character_id: charId,
        name: char.name,
        max_hp: char.max_hp,
        ac: char.armor_class,
        initiative: totalInitiative,
        initiative_bonus: char.initiative,
        passive_perception: char.passive_perception,
      });
    });

    if (participants.length === 0) {
      setError("Please select at least one character");
      return;
    }

    setImporting(true);
    try {
      await onImport(participants);
      onClose();
    } catch {
      setError("Failed to import party members");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background-panel border border-border rounded-xl p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-panel border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-text">
              Import Party Members
            </h3>
            <p className="text-sm text-text-muted mt-0.5">
              Add player characters to combat
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-background transition-colors flex items-center justify-center"
          >
            <Icon name="X" className="w-5 h-5" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Auto-roll Toggle */}
        <div className="p-4 border-b border-border">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRoll}
              onChange={(e) => setAutoRoll(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/50"
            />
            <span className="text-text-muted text-sm">
              Auto-roll initiative (d20 + modifier)
            </span>
          </label>
        </div>

        {/* Character List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {members.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <Icon
                name="Users"
                className="w-12 h-12 mx-auto mb-2 opacity-50"
              />
              <p>No party members found in this campaign</p>
            </div>
          ) : (
            members.map((member) => {
              const char = member.character_id
                ? characters.get(member.character_id)
                : null;
              if (!char || !member.character_id) return null;

              const isSelected = selectedCharacterIds.has(member.character_id);
              const roll = initiativeRolls.get(member.character_id) || 0;
              const totalInitiative = roll + char.initiative;

              return (
                <div
                  key={member.id}
                  className={`border rounded-lg p-3 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        handleToggleCharacter(member.character_id!)
                      }
                      className="w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary/50"
                    />

                    {/* Character Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text">{char.name}</div>
                      <div className="text-sm text-text-muted">
                        Level {char.level} {char.class_info}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-sm text-text-muted">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">HP:</span>
                        <span>{char.max_hp}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon name="Shield" className="w-4 h-4" />
                        <span>{char.armor_class}</span>
                      </div>
                    </div>

                    {/* Initiative */}
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-text-muted whitespace-nowrap">
                          Init: +{char.initiative}
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={roll || ""}
                            onChange={(e) =>
                              handleSetInitiative(
                                member.character_id!,
                                Number.parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-16 px-2 py-1 bg-background border border-border rounded text-text text-center text-sm focus:border-primary focus:outline-none"
                            placeholder="d20"
                          />
                          <button
                            onClick={() =>
                              handleRollInitiative(member.character_id!)
                            }
                            className="w-7 h-7 rounded bg-primary/20 hover:bg-primary/30 text-primary transition-colors flex items-center justify-center"
                            title="Roll d20"
                          >
                            <Icon name="Dices" className="w-4 h-4" />
                          </button>
                          <div className="w-12 px-2 py-1 bg-background border border-border rounded text-text text-center text-sm font-medium">
                            {totalInitiative}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="text-sm text-text-muted">
            {selectedCharacterIds.size} character
            {selectedCharacterIds.size !== 1 ? "s" : ""} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg text-text-muted hover:text-text hover:border-text-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedCharacterIds.size === 0 || importing}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Icon name="UserPlus" className="w-4 h-4" />
                  Import {selectedCharacterIds.size} Character
                  {selectedCharacterIds.size !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
