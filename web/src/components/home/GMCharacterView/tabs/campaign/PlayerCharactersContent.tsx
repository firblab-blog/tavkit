import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../../../common/Icon";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { type Character } from "../../../../../store/characterStore";
import { logger } from "../../../../../utils/logger";

interface PlayerCharactersContentProps {
  campaignId: string;
}

/**
 * PlayerCharactersContent - Display player characters linked to the campaign.
 */
export default function PlayerCharactersContent({
  campaignId,
}: PlayerCharactersContentProps) {
  const navigate = useNavigate(); // Still needed for character sheet navigation
  const { fetchCampaignCharacters, unlinkCharacterFromCampaign } =
    useCampaignStore();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(
    null,
  );

  useEffect(() => {
    const loadCharacters = async () => {
      setLoading(true);
      setError(null);
      try {
        // API returns full Character objects, cast from the store's type
        const chars = (await fetchCampaignCharacters(
          campaignId,
        )) as unknown as Character[];
        setCharacters(chars || []);
      } catch (err) {
        setError("Failed to load characters");
        logger.error("Failed to load characters:", err);
      } finally {
        setLoading(false);
      }
    };
    loadCharacters();
  }, [campaignId, fetchCampaignCharacters]);

  const filteredCharacters = useMemo(() => {
    if (!searchQuery) return characters;
    const query = searchQuery.toLowerCase();
    return characters.filter(
      (char) =>
        char.name?.toLowerCase().includes(query) ||
        char.class_info?.toLowerCase().includes(query),
    );
  }, [characters, searchQuery]);

  const handleUnlink = async (character: Character) => {
    if (window.confirm(`Remove "${character.name}" from this campaign?`)) {
      try {
        await unlinkCharacterFromCampaign(campaignId, character.id);
        setCharacters((prev) => prev.filter((c) => c.id !== character.id));
        if (viewingCharacter?.id === character.id) {
          setViewingCharacter(null);
        }
      } catch (err) {
        logger.error("Failed to unlink character:", err);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search characters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
          />
        </div>
        {/* Add button removed - will be re-added with proper functionality */}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredCharacters.length === 0 && (
        <div className="text-center py-8 bg-background-panel border border-border rounded-xl">
          <Icon
            name="User"
            className="w-10 h-10 text-text-muted mx-auto mb-3"
          />
          <h3 className="text-text font-medium mb-1">
            {searchQuery
              ? "No matching characters"
              : "No player characters yet"}
          </h3>
          <p className="text-text-muted text-sm mb-4">
            {searchQuery
              ? "Try adjusting your search."
              : "Link characters from your Guild Roster to this campaign."}
          </p>
          {/* Empty state CTA removed - will be re-added with proper functionality */}
        </div>
      )}

      {/* Character Grid */}
      {!loading && filteredCharacters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCharacters.map((character) => (
            <div
              key={character.id}
              onClick={() => setViewingCharacter(character)}
              className="bg-background-panel border border-emerald-500/30 rounded-xl p-4 hover:border-emerald-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="User" className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-text font-medium truncate">
                      {character.name || "Unknown"}
                    </h4>
                    <p className="text-text-muted text-sm">
                      Level {character.level || 1}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnlink(character);
                  }}
                  className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                  title="Remove from campaign"
                >
                  <Icon name="LinkSlash" className="w-4 h-4" />
                </button>
              </div>

              {character.class_info && (
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-background rounded-lg text-xs text-text-muted">
                    {character.class_info}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewingCharacter && (
        <CharacterDetailModal
          character={viewingCharacter}
          onClose={() => setViewingCharacter(null)}
          onUnlink={() => handleUnlink(viewingCharacter)}
          onOpenFullSheet={() =>
            navigate(
              `/dashboard/gm/characters?character=${viewingCharacter.id}`,
            )
          }
        />
      )}
    </div>
  );
}

// Character Detail Modal
interface CharacterDetailModalProps {
  character: Character;
  onClose: () => void;
  onUnlink: () => void;
  onOpenFullSheet: () => void;
}

function CharacterDetailModal({
  character,
  onClose,
  onUnlink,
  onOpenFullSheet,
}: CharacterDetailModalProps) {
  const getModifier = (score: number | undefined) => {
    if (!score) return "+0";
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-5xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Icon name="User" className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-text">
                {character.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span>Level {character.level || 1}</span>
                {character.race && (
                  <>
                    <span>•</span>
                    <span>{character.race}</span>
                  </>
                )}
                {character.class_info && (
                  <>
                    <span>•</span>
                    <span>{character.class_info}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-text"
          >
            <Icon name="X" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Combat Stats Row */}
          <div className="flex flex-wrap gap-3 mb-6">
            {character.armor_class && (
              <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-text-muted">Armor Class</p>
                <p className="text-lg font-semibold text-blue-400">
                  {character.armor_class}
                </p>
              </div>
            )}
            {character.max_hp && (
              <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-xs text-text-muted">Hit Points</p>
                <p className="text-lg font-semibold text-red-400">
                  {character.current_hp ?? character.max_hp} /{" "}
                  {character.max_hp}
                </p>
              </div>
            )}
            {character.speed && (
              <div className="px-4 py-2 bg-background border border-border rounded-lg">
                <p className="text-xs text-text-muted">Speed</p>
                <p className="text-lg font-semibold text-text">
                  {character.speed} ft
                </p>
              </div>
            )}
            {character.initiative !== undefined && (
              <div className="px-4 py-2 bg-background border border-border rounded-lg">
                <p className="text-xs text-text-muted">Initiative</p>
                <p className="text-lg font-semibold text-text">
                  {character.initiative >= 0 ? "+" : ""}
                  {character.initiative}
                </p>
              </div>
            )}
            {character.proficiency_bonus && (
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-xs text-text-muted">Proficiency</p>
                <p className="text-lg font-semibold text-emerald-400">
                  +{character.proficiency_bonus}
                </p>
              </div>
            )}
          </div>

          {/* Ability Scores */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              Ability Scores
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { name: "STR", value: character.strength },
                { name: "DEX", value: character.dexterity },
                { name: "CON", value: character.constitution },
                { name: "INT", value: character.intelligence },
                { name: "WIS", value: character.wisdom },
                { name: "CHA", value: character.charisma },
              ].map((ability) => (
                <div
                  key={ability.name}
                  className="bg-background border border-border rounded-lg p-3 text-center"
                >
                  <p className="text-xs text-text-muted mb-1">{ability.name}</p>
                  <p className="text-xl font-bold text-text">
                    {ability.value || 10}
                  </p>
                  <p className="text-sm text-text-muted">
                    {getModifier(ability.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Background & Alignment */}
          {(character.background || character.alignment) && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                Background
              </h4>
              <div className="flex flex-wrap gap-2">
                {character.background && (
                  <span className="px-3 py-1 bg-background border border-border rounded-lg text-sm text-text">
                    {character.background}
                  </span>
                )}
                {character.alignment && (
                  <span className="px-3 py-1 bg-background border border-border rounded-lg text-sm text-text">
                    {character.alignment}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Personality Traits */}
          {character.personality_traits && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                Personality Traits
              </h4>
              <p className="text-text whitespace-pre-wrap">
                {character.personality_traits}
              </p>
            </div>
          )}

          {/* Ideals */}
          {character.ideals && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                Ideals
              </h4>
              <p className="text-text whitespace-pre-wrap">
                {character.ideals}
              </p>
            </div>
          )}

          {/* Bonds */}
          {character.bonds && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                Bonds
              </h4>
              <p className="text-text whitespace-pre-wrap">{character.bonds}</p>
            </div>
          )}

          {/* Flaws */}
          {character.flaws && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                Flaws
              </h4>
              <p className="text-text whitespace-pre-wrap">{character.flaws}</p>
            </div>
          )}

          {/* Backstory */}
          {character.backstory && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                Backstory
              </h4>
              <p className="text-text whitespace-pre-wrap">
                {character.backstory}
              </p>
            </div>
          )}

          {/* Notes */}
          {character.notes && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                Notes
              </h4>
              <p className="text-text whitespace-pre-wrap">{character.notes}</p>
            </div>
          )}

          {/* No additional info fallback */}
          {!character.background &&
            !character.alignment &&
            !character.personality_traits &&
            !character.ideals &&
            !character.bonds &&
            !character.flaws &&
            !character.backstory &&
            !character.notes && (
              <p className="text-text-muted italic">
                No additional character details available.
              </p>
            )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 sm:px-6 py-4 flex justify-between flex-shrink-0">
          <button
            onClick={onUnlink}
            className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            <Icon name="LinkSlash" className="w-4 h-4" />
            Unlink
          </button>
          <div className="flex gap-2">
            <button
              onClick={onOpenFullSheet}
              className="px-4 py-2 bg-background hover:bg-background-panel border border-border rounded-lg transition-colors text-sm flex items-center gap-2 text-text"
            >
              <Icon name="ExternalLink" className="w-4 h-4" />
              Full Sheet
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
