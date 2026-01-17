import { useState, useEffect, useCallback } from "react";
import ContentListLayout from "../../../../common/ContentListLayout";
import ContentCard from "../../../../common/ContentCard";
import Icon from "../../../../common/Icon";
import CharacterSheet from "../../../../character/CharacterSheet";
import ManualCharacterForm from "../../../../character/ManualCharacterForm";
import ImportCharacter from "../../../../character/ImportCharacter";
import { useCharacterStore, Character } from "../../../../../store/characterStore";
import { useCampaignStore, Campaign } from "../../../../../store/campaignStore";
import { apiClient } from "@/api/client";
import { logger } from "@/utils/logger";

/**
 * LinkCharacterModal - Modal to link a character to one or more campaigns.
 * Uses the campaign_characters junction table (many-to-many relationship).
 */
interface LinkCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: { id: string; name: string };
  campaigns: Campaign[];
  onLink: (campaignId: string) => Promise<void>;
}

function LinkCharacterModal({
  isOpen,
  onClose,
  character,
  campaigns,
  onLink,
}: LinkCharacterModalProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleLink = async () => {
    if (!selectedCampaignId) return;

    setLoading(true);
    setError("");

    try {
      await onLink(selectedCampaignId);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || "Failed to link character to campaign"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background-panel border border-border rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="FolderInput" className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">
              Link to Campaign
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background rounded-lg transition-colors"
          >
            <Icon name="X" className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-text-muted">
            Link <span className="text-text font-medium">{character.name}</span>{" "}
            to a campaign. Characters can be linked to multiple campaigns.
          </p>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-text-muted text-sm font-medium mb-2">
              Select Campaign
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">Choose a campaign...</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={loading || !selectedCampaignId}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              selectedCampaignId
                ? "bg-primary text-white hover:bg-primary/80"
                : "bg-background text-text-muted cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Icon name="Link" className="w-4 h-4" />
                Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CharactersContentProps {
  /** Campaign ID to filter characters (optional - if not provided, shows all user's characters) */
  campaignId?: string;
  /** Show campaign filter dropdown */
  showCampaignFilter?: boolean;
}

/**
 * CharactersContent - Browse and manage player characters in the Library tab.
 *
 * When campaignId is provided:
 * - Shows only characters linked to that campaign
 * - "Delete" unlinks from campaign (character remains in personal library)
 * - New characters are automatically linked to the campaign
 *
 * When no campaignId (sandbox/library mode):
 * - Shows all user's characters
 * - "Delete" permanently removes the character
 * - New characters are not linked to any campaign
 */
export default function CharactersContent({
  campaignId,
  showCampaignFilter = true,
}: CharactersContentProps) {
  const { characters, fetchCharacters, loading, error, deleteCharacter } =
    useCharacterStore();
  const { campaigns, unlinkCharacterFromCampaign, linkCharacterToCampaign } = useCampaignStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaignId || ""
  );
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(
    null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMethod, setCreateMethod] = useState<
    "choose" | "manual" | "import"
  >("choose");
  const [linkModalCharacter, setLinkModalCharacter] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Determine effective campaign filter
  // If campaignId prop is provided, use it (locked to that campaign)
  // Otherwise use the dropdown selection
  const effectiveCampaignId = campaignId || selectedCampaignId || undefined;

  // Fetch characters on mount and when campaign changes
  useEffect(() => {
    fetchCharacters(false, effectiveCampaignId);
  }, [fetchCharacters, effectiveCampaignId]);

  // Filter characters by search query
  const filteredCharacters = characters.filter((char) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      char.name.toLowerCase().includes(query) ||
      char.race?.toLowerCase().includes(query) ||
      char.class_info?.toLowerCase().includes(query) ||
      char.background?.toLowerCase().includes(query)
    );
  });

  const handleDelete = async (character: Character) => {
    // Different behavior based on context
    if (campaignId) {
      // Campaign context: unlink from campaign
      if (
        !window.confirm(
          `Remove "${character.name}" from this campaign? The character will still be available in your personal library.`
        )
      ) {
        return;
      }

      try {
        await unlinkCharacterFromCampaign(campaignId, character.id);
        deleteCharacter(character.id); // Remove from local state
        if (viewingCharacter?.id === character.id) {
          setViewingCharacter(null);
        }
      } catch (err) {
        logger.error("Failed to unlink character:", err);
        alert("Failed to remove character from campaign. Please try again.");
      }
    } else {
      // Sandbox/library context: permanent delete
      if (
        !window.confirm(
          `Permanently delete "${character.name}"? This cannot be undone.`
        )
      ) {
        return;
      }

      try {
        await apiClient.delete(`/characters/${character.id}`);
        deleteCharacter(character.id);
        if (viewingCharacter?.id === character.id) {
          setViewingCharacter(null);
        }
      } catch (err) {
        logger.error("Failed to delete character:", err);
        alert("Failed to delete character. Please try again.");
      }
    }
  };

  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    setCreateMethod("choose");
    fetchCharacters(true, effectiveCampaignId);
  }, [fetchCharacters, effectiveCampaignId]);

  const refresh = useCallback(() => {
    fetchCharacters(true, effectiveCampaignId);
  }, [fetchCharacters, effectiveCampaignId]);

  return (
    <div className="space-y-4">
      {/* Campaign Filter (only when not locked to a campaign) */}
      {showCampaignFilter && !campaignId && (
        <div className="mb-4">
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary transition-colors text-sm"
          >
            <option value="">All Characters</option>
            <option value="library">Personal Library (No Campaign)</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <ContentListLayout
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search characters..."
        addButtonLabel="Add Character"
        onAddClick={() => setShowCreateModal(true)}
        addButtonColor="blue"
        loading={loading}
        error={error}
        emptyIcon="Users"
        emptyTitle="No characters yet"
        emptyDescription="Create memorable characters for your campaign."
        emptyCTALabel="Create Your First Character"
        onEmptyCTAClick={() => setShowCreateModal(true)}
        hasItems={filteredCharacters.length > 0}
      >
        <div className="space-y-3">
          {filteredCharacters.map((character) => (
            <ContentCard
              key={character.id}
              title={character.name}
              preview={
                character.backstory ||
                `Level ${character.level} ${character.race} ${character.class_info}`
              }
              icon="User"
              iconColor="blue"
              date={character.created_at}
              badges={[
                { label: `Level ${character.level}` },
                ...(character.race ? [{ label: character.race }] : []),
                ...(character.class_info
                  ? [{ label: character.class_info }]
                  : []),
              ]}
              onClick={() => setViewingCharacter(character)}
              onDelete={() => handleDelete(character)}
              onAssign={
                !campaignId
                  ? () =>
                      setLinkModalCharacter({
                        id: character.id,
                        name: character.name,
                      })
                  : undefined
              }
            />
          ))}
        </div>
      </ContentListLayout>

      {/* Character Detail Modal */}
      {viewingCharacter && (
        <div
          className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingCharacter(null);
          }}
        >
          <div className="bg-background-panel border border-border rounded-xl w-full max-w-4xl my-8 relative">
            {/* Modal Header */}
            <div className="sticky top-0 bg-background-panel border-b border-border rounded-t-xl px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <Icon name="FileText" className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-text">Character Sheet</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(viewingCharacter)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-text-muted hover:text-red-400"
                  title={campaignId ? "Remove from Campaign" : "Delete"}
                >
                  <Icon name="Trash2" className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewingCharacter(null)}
                  className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
                >
                  <Icon name="X" className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Character Sheet Content */}
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
              <CharacterSheet
                character={viewingCharacter}
                onUpdate={refresh}
                onClose={() => setViewingCharacter(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Character Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-panel border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {createMethod === "choose" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-text">
                    Create New Character
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateMethod("choose");
                    }}
                    className="text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="X" className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-text-muted mb-6">
                  Choose how you'd like to add your character:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setCreateMethod("manual")}
                    className="flex flex-col items-center gap-4 p-6 border-2 border-border hover:border-primary rounded-lg transition-all group"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Icon name="FileEdit" className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-text mb-2">
                        Create Manually
                      </h3>
                      <p className="text-sm text-text-muted">
                        Build your character from scratch with our step-by-step
                        form
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setCreateMethod("import")}
                    className="flex flex-col items-center gap-4 p-6 border-2 border-border hover:border-primary rounded-lg transition-all group"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Icon name="Upload" className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-text mb-2">
                        Import from D&D Beyond
                      </h3>
                      <p className="text-sm text-text-muted">
                        Import an existing character from your D&D Beyond
                        account
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}

            {createMethod === "manual" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCreateMethod("choose")}
                    className="flex items-center gap-2 text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="ArrowLeft" className="w-4 h-4" />
                    Back
                  </button>
                  <h2 className="text-xl font-bold text-text">
                    Create Character Manually
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateMethod("choose");
                    }}
                    className="text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="X" className="w-5 h-5" />
                  </button>
                </div>

                <ManualCharacterForm
                  onSuccess={handleCreateSuccess}
                  onCancel={() => setCreateMethod("choose")}
                  campaignId={campaignId}
                />
              </>
            )}

            {createMethod === "import" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCreateMethod("choose")}
                    className="flex items-center gap-2 text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="ArrowLeft" className="w-4 h-4" />
                    Back
                  </button>
                  <h2 className="text-xl font-bold text-text">
                    Import from D&D Beyond
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateMethod("choose");
                    }}
                    className="text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="X" className="w-5 h-5" />
                  </button>
                </div>

                <ImportCharacter
                  onSuccess={handleCreateSuccess}
                  onCancel={() => setCreateMethod("choose")}
                  campaignId={campaignId}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Link Character to Campaign Modal */}
      {linkModalCharacter && (
        <LinkCharacterModal
          isOpen={true}
          onClose={() => setLinkModalCharacter(null)}
          character={linkModalCharacter}
          campaigns={campaigns}
          onLink={async (targetCampaignId) => {
            await linkCharacterToCampaign(targetCampaignId, linkModalCharacter.id);
            refresh();
          }}
        />
      )}
    </div>
  );
}
