import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Icon from "../../../../common/Icon";
import {
  useCampaignStore,
  type CampaignContent,
} from "../../../../../store/campaignStore";
import {
  useCharacterStore,
  type Character,
} from "../../../../../store/characterStore";
import { logger } from "../../../../../utils/logger";
import { authFetch } from "../../../../../utils/authFetch";
import { getApiUrl } from "../../../../../config/api";
import {
  updateCampaignContent,
  UpdateCampaignContentRequest,
} from "../../../../../api/campaignContent";
import CampaignContentEditorModal from "../../../../campaign/CampaignContentEditorModal";

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
  const {
    fetchCampaignCharacters,
    unlinkCharacterFromCampaign,
    linkCharacterToCampaign,
    createCampaignContent,
    fetchCampaignContent,
    deleteCampaignContent,
  } = useCampaignStore();
  const { characters: allUserCharacters, fetchCharacters: fetchAllCharacters } =
    useCharacterStore();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [importedContent, setImportedContent] = useState<CampaignContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(
    null,
  );
  const [viewingContent, setViewingContent] = useState<CampaignContent | null>(
    null,
  );
  const [editingContent, setEditingContent] = useState<CampaignContent | null>(
    null,
  );
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch both linked characters and imported content in parallel
        const [chars, content] = await Promise.all([
          fetchCampaignCharacters(campaignId) as unknown as Promise<
            Character[]
          >,
          fetchCampaignContent(campaignId, "pcs"),
        ]);
        setCharacters(chars || []);
        setImportedContent(content || []);
      } catch (err) {
        setError("Failed to load characters");
        logger.error("Failed to load characters:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [campaignId, fetchCampaignCharacters, fetchCampaignContent]);

  const filteredCharacters = useMemo(() => {
    if (!searchQuery) return characters;
    const query = searchQuery.toLowerCase();
    return characters.filter(
      (char) =>
        char.name?.toLowerCase().includes(query) ||
        char.class_info?.toLowerCase().includes(query),
    );
  }, [characters, searchQuery]);

  const filteredContent = useMemo(() => {
    if (!searchQuery) return importedContent;
    const query = searchQuery.toLowerCase();
    return importedContent.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query),
    );
  }, [importedContent, searchQuery]);

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

  const handleDeleteContent = async (item: CampaignContent) => {
    if (window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
      try {
        await deleteCampaignContent(campaignId, item.id);
        setImportedContent((prev) => prev.filter((c) => c.id !== item.id));
        if (viewingContent?.id === item.id) {
          setViewingContent(null);
        }
      } catch (err) {
        logger.error("Failed to delete content:", err);
      }
    }
  };

  const handleSaveContent = async (
    contentId: string,
    updates: UpdateCampaignContentRequest,
  ) => {
    try {
      await updateCampaignContent(campaignId, contentId, updates);
      await refreshData();
      setEditingContent(null);
      setViewingContent(null);
    } catch (err) {
      logger.error("Failed to update content:", err);
      throw err;
    }
  };

  const refreshData = useCallback(async () => {
    try {
      const [chars, content] = await Promise.all([
        fetchCampaignCharacters(campaignId) as unknown as Promise<Character[]>,
        fetchCampaignContent(campaignId, "pcs"),
      ]);
      setCharacters(chars || []);
      setImportedContent(content || []);
    } catch (err) {
      logger.error("Failed to refresh data:", err);
    }
  }, [campaignId, fetchCampaignCharacters, fetchCampaignContent]);

  const handleLinkCharacter = useCallback(
    async (characterId: string) => {
      try {
        await linkCharacterToCampaign(campaignId, characterId);
        await refreshData();
      } catch (err) {
        logger.error("Failed to link character:", err);
        throw err;
      }
    },
    [campaignId, linkCharacterToCampaign, refreshData],
  );

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let content = "";
      const fileType = file.type;
      const fileName = file.name.replace(/\.[^/.]+$/, "");

      // Handle different file types
      if (fileType.startsWith("image/")) {
        // Convert image to base64
        const reader = new FileReader();
        content = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        // Store as campaign content (character portrait)
        await createCampaignContent(campaignId, {
          section: "pcs",
          subsection: null,
          title: fileName,
          content: content,
          type: "imported",
          file_name: file.name,
        });
      } else {
        // Read text files
        content = await file.text();
        // eslint-disable-next-line no-control-regex
        content = content.replace(/\x00/g, "");

        // Try to parse as JSON (D&D Beyond export or character data)
        if (fileType === "application/json" || file.name.endsWith(".json")) {
          try {
            const jsonData = JSON.parse(content);
            // Check if it looks like a character export
            if (
              jsonData.name &&
              (jsonData.race || jsonData.classes || jsonData.stats)
            ) {
              // Create a character via the characters endpoint
              const characterBody: any = {
                name: jsonData.name,
                race: jsonData.race || "",
                class_info:
                  jsonData.classes?.[0]?.definition?.name ||
                  jsonData.class ||
                  "",
                level: jsonData.classes?.[0]?.level || jsonData.level || 1,
                background:
                  jsonData.background?.definition?.name ||
                  jsonData.background ||
                  "",
                backstory:
                  jsonData.notes?.backstory || jsonData.backstory || "",
              };

              // Try to extract stats if present
              if (jsonData.stats) {
                characterBody.stats = jsonData.stats;
              }

              const response = await authFetch(getApiUrl("/characters"), {
                method: "POST",
                body: JSON.stringify(characterBody),
              });

              if (response.ok) {
                const newChar = await response.json();
                // Link the character to this campaign
                await authFetch(
                  getApiUrl(
                    `/campaigns/${campaignId}/characters/${newChar.id}`,
                  ),
                  {
                    method: "POST",
                  },
                );
              } else {
                throw new Error("Failed to create character from JSON");
              }
            } else {
              // Not a recognized character format, store as content
              await createCampaignContent(campaignId, {
                section: "pcs",
                subsection: null,
                title: fileName,
                content: content,
                type: "imported",
                file_name: file.name,
              });
            }
          } catch (parseError) {
            // JSON parsing failed, store as plain content
            logger.warn(
              "Failed to parse JSON as character data, storing as content:",
              parseError,
            );
            await createCampaignContent(campaignId, {
              section: "pcs",
              subsection: null,
              title: fileName,
              content: content,
              type: "imported",
              file_name: file.name,
            });
          }
        } else {
          // Text, markdown files - store as campaign content (backstory, notes)
          await createCampaignContent(campaignId, {
            section: "pcs",
            subsection: null,
            title: fileName,
            content: content,
            type: "imported",
            file_name: file.name,
          });
        }
      }

      await refreshData();
    } catch (error) {
      logger.error("File upload failed:", error);
      alert("Failed to import file");
    } finally {
      setUploading(false);
      event.target.value = "";
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors text-sm"
          >
            <Icon name="Link" className="w-4 h-4" />
            Link from Roster
          </button>
          <input
            type="file"
            id="pcs-file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
            accept=".txt,.md,.markdown,.json,image/*,.jpg,.jpeg,.png,.gif,.webp"
          />
          <label
            htmlFor="pcs-file-upload"
            className="flex items-center gap-2 px-4 py-2 bg-background-panel hover:bg-background border border-border text-text font-medium rounded-lg transition-colors text-sm cursor-pointer"
          >
            <Icon name="Upload" className="w-4 h-4" />
            {uploading ? "Importing..." : "Import File"}
          </label>
        </div>
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

      {/* Empty State - only show when BOTH characters and content are empty */}
      {!loading &&
        filteredCharacters.length === 0 &&
        filteredContent.length === 0 && (
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
                : "Link characters from your Guild Roster or import character notes."}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setShowLinkModal(true)}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors text-sm inline-flex items-center gap-2"
              >
                <Icon name="Link" className="w-4 h-4" />
                Link Characters
              </button>
              <button
                onClick={() => setShowEditorModal(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm inline-flex items-center gap-2"
              >
                <Icon name="Plus" className="w-4 h-4" />
                Add Note
              </button>
            </div>
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

      {/* Imported Content Section */}
      {!loading && filteredContent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Character Notes & Files
            </h3>
            <button
              onClick={() => setShowEditorModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors text-sm"
            >
              <Icon name="Plus" className="w-4 h-4" />
              Add Note
            </button>
          </div>
          {filteredContent.map((item) => (
            <div
              key={item.id}
              onClick={() => setViewingContent(item)}
              className="bg-background-panel border border-emerald-500/30 rounded-xl p-4 hover:border-emerald-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon
                      name="FileText"
                      className="w-5 h-5 text-emerald-400"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-text font-medium">{item.title}</h4>
                    {item.content && (
                      <p className="text-text-muted text-sm mt-1 line-clamp-2">
                        {item.content.substring(0, 150)}...
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteContent(item);
                  }}
                  className="p-1.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400 flex-shrink-0"
                >
                  <Icon name="Trash2" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Character Modal */}
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

      {/* View Content Modal */}
      {viewingContent && !editingContent && (
        <ContentDetailModal
          item={viewingContent}
          onClose={() => setViewingContent(null)}
          onDelete={() => handleDeleteContent(viewingContent)}
          onEdit={() => setEditingContent(viewingContent)}
        />
      )}

      {/* Edit Content Modal */}
      {editingContent && (
        <EditContentModal
          item={editingContent}
          onClose={() => {
            setEditingContent(null);
            setViewingContent(null);
          }}
          onSave={handleSaveContent}
        />
      )}

      {/* Create Content Modal */}
      <CampaignContentEditorModal
        isOpen={showEditorModal}
        onClose={() => setShowEditorModal(false)}
        campaignId={campaignId}
        section="pcs"
        onSaved={refreshData}
      />

      {/* Link from Roster Modal */}
      {showLinkModal && (
        <LinkFromRosterModal
          linkedCharacterIds={characters.map((c) => c.id)}
          allUserCharacters={allUserCharacters}
          fetchAllCharacters={fetchAllCharacters}
          onLink={handleLinkCharacter}
          onClose={() => setShowLinkModal(false)}
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

// Link from Roster Modal
interface LinkFromRosterModalProps {
  linkedCharacterIds: string[];
  allUserCharacters: Character[];
  fetchAllCharacters: (forceRefresh?: boolean) => Promise<void>;
  onLink: (characterId: string) => Promise<void>;
  onClose: () => void;
}

function LinkFromRosterModal({
  linkedCharacterIds,
  allUserCharacters,
  fetchAllCharacters,
  onLink,
  onClose,
}: LinkFromRosterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Fetch all user characters when modal opens (without campaign filter)
  useEffect(() => {
    const loadRoster = async () => {
      setLoadingRoster(true);
      try {
        // Fetch all characters (no campaign filter) to show the full roster
        await fetchAllCharacters(true);
      } catch (err) {
        logger.error("Failed to fetch roster:", err);
      } finally {
        setLoadingRoster(false);
      }
    };
    loadRoster();
  }, [fetchAllCharacters]);

  // Filter out already-linked characters and apply search
  const availableCharacters = useMemo(() => {
    const unlinked = allUserCharacters.filter(
      (char) => !linkedCharacterIds.includes(char.id),
    );
    if (!searchQuery) return unlinked;
    const query = searchQuery.toLowerCase();
    return unlinked.filter(
      (char) =>
        char.name?.toLowerCase().includes(query) ||
        char.class_info?.toLowerCase().includes(query) ||
        char.race?.toLowerCase().includes(query),
    );
  }, [allUserCharacters, linkedCharacterIds, searchQuery]);

  const handleLink = async (characterId: string) => {
    setLinking(characterId);
    try {
      await onLink(characterId);
    } catch (err) {
      alert("Failed to link character. Please try again.");
    } finally {
      setLinking(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-text">
              Link Characters from Roster
            </h3>
            <p className="text-sm text-text-muted">
              Select characters to add to this campaign
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-text"
          >
            <Icon name="X" className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border">
          <div className="relative">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            />
            <input
              type="text"
              placeholder="Search your characters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Character List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingRoster ? (
            <div className="flex items-center justify-center py-8">
              <Icon
                name="Loader2"
                className="w-6 h-6 text-primary animate-spin"
              />
            </div>
          ) : availableCharacters.length === 0 ? (
            <div className="text-center py-8">
              <Icon
                name="Users"
                className="w-10 h-10 text-text-muted mx-auto mb-3"
              />
              <p className="text-text-muted">
                {searchQuery
                  ? "No matching characters found"
                  : allUserCharacters.length === 0
                    ? "No characters in your roster yet. Create some in the Guild Roster first."
                    : "All your characters are already linked to this campaign."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableCharacters.map((character) => (
                <div
                  key={character.id}
                  className="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="User" className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-text font-medium truncate">
                        {character.name || "Unknown"}
                      </h4>
                      <p className="text-text-muted text-sm truncate">
                        Level {character.level || 1}
                        {character.race && ` • ${character.race}`}
                        {character.class_info && ` • ${character.class_info}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLink(character.id)}
                    disabled={linking === character.id}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    {linking === character.id ? (
                      <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon name="Plus" className="w-4 h-4" />
                    )}
                    Link
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-background hover:bg-background-panel border border-border text-text font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Content Detail Modal
interface ContentDetailModalProps {
  item: CampaignContent;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function ContentDetailModal({
  item,
  onClose,
  onDelete,
  onEdit,
}: ContentDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-5xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Icon name="FileText" className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-text">
                {item.title}
              </h3>
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
          {item.content ? (
            <div className="prose prose-invert prose-tavern max-w-none">
              <ReactMarkdown>
                {item.content.replace(/\\n/g, "\n")}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-text-muted italic">No content</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 sm:px-6 py-4 flex justify-between flex-shrink-0">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            <Icon name="Trash2" className="w-4 h-4" />
            Delete
          </button>
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="px-4 py-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              <Icon name="Edit" className="w-4 h-4" />
              Edit
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

// Edit Content Modal
interface EditContentModalProps {
  item: CampaignContent;
  onClose: () => void;
  onSave: (
    contentId: string,
    updates: UpdateCampaignContentRequest,
  ) => Promise<void>;
}

function EditContentModal({ item, onClose, onSave }: EditContentModalProps) {
  const [formData, setFormData] = useState({
    title: item.title,
    content: item.content || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateCampaignContentRequest = {
        title: formData.title,
        content: formData.content || undefined,
      };

      await onSave(item.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save content");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Icon name="FileText" className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-text">
                Edit Character Note
              </h3>
              <p className="text-sm text-text-muted">{item.title}</p>
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
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary font-mono text-sm"
              rows={20}
              placeholder="Character notes, backstory, use Markdown formatting..."
            />
            <p className="text-xs text-text-muted mt-1">
              Supports Markdown formatting
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-text-muted hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
