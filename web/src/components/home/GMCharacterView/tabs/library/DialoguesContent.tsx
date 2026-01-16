import ContentListLayout from "../../../../common/ContentListLayout";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";
import {
  updateDialogue,
  UpdateDialogueRequest,
} from "../../../../../api/dialogues";

interface Dialogue {
  id: string;
  character_name: string;
  campaign_id?: string | null;
  scene_setting?: string;
  mood?: string;
  dialogue_tree?: any;
  skill_checks?: any;
  information?: any;
  information_revealed?: any;
  potential_quests?: any;
  ai_generated?: boolean;
  created_at: string;
}

interface DialoguesContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

export default function DialoguesContent({
  campaignId,
  showCampaignFilter,
}: DialoguesContentProps) {
  const { openGenerator } = useGeneratorModalStore();
  const { campaigns } = useCampaignStore();
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);
  const [editingDialogue, setEditingDialogue] = useState<Dialogue | null>(null);

  const {
    filteredItems,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCampaignId,
    setSelectedCampaignId,
    viewingItem,
    setViewingItem,
    deleteItem,
    refresh,
  } = useLibraryContent<Dialogue>({
    contentType: "dialogues",
    campaignId,
    showCampaignFilter,
    searchFields: ["character_name", "scene_setting", "mood"],
  });

  const handleDelete = async (dialogue: Dialogue) => {
    if (
      window.confirm(
        `Delete dialogue with "${dialogue.character_name}"? This cannot be undone.`,
      )
    ) {
      try {
        await deleteItem(dialogue.id);
      } catch (err) {
        logger.error("Failed to delete dialogue:", err);
      }
    }
  };

  const handleSave = async (id: string, updates: UpdateDialogueRequest) => {
    try {
      await updateDialogue(id, updates);
      await refresh();
      setEditingDialogue(null);
      setViewingItem(null);
    } catch (err) {
      logger.error("Failed to update dialogue:", err);
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      {showCampaignFilter && (
        <div className="mb-4">
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary transition-colors text-sm"
          >
            <option value="">All Content</option>
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
        searchPlaceholder="Search dialogues..."
        addButtonLabel="Add Dialogue"
        onAddClick={() => openGenerator("dialogue")}
        addButtonColor="blue"
        loading={loading}
        error={error}
        emptyIcon="MessageSquare"
        emptyTitle="No dialogues yet"
        emptyDescription="Create dialogue trees for NPC conversations."
        emptyCTALabel="Create Your First Dialogue"
        onEmptyCTAClick={() => openGenerator("dialogue")}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((dialogue) => (
            <ContentCard
              key={dialogue.id}
              title={dialogue.character_name}
              preview={dialogue.scene_setting || undefined}
              icon="MessageSquare"
              iconColor="blue"
              date={dialogue.created_at}
              badges={dialogue.mood ? [{ label: dialogue.mood }] : []}
              onClick={() => setViewingItem(dialogue)}
              onDelete={() => handleDelete(dialogue)}
              onAssign={() =>
                setAssignModalItem({
                  id: dialogue.id,
                  name: dialogue.character_name,
                  currentCampaignId: dialogue.campaign_id,
                })
              }
            />
          ))}
        </div>
      </ContentListLayout>

      {viewingItem && !editingDialogue && (
        <DialogueDetailModal
          dialogue={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
          onEdit={() => setEditingDialogue(viewingItem)}
        />
      )}

      {editingDialogue && (
        <EditDialogueModal
          dialogue={editingDialogue}
          onClose={() => {
            setEditingDialogue(null);
            setViewingItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="dialogues"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

interface DialogueDetailModalProps {
  dialogue: Dialogue;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function DialogueDetailModal({
  dialogue,
  onClose,
  onDelete,
  onEdit,
}: DialogueDetailModalProps) {
  let dialogueTree: any = null;
  let skillChecks: any[] = [];
  let information: any[] = [];
  let potentialQuests: any[] = [];

  try {
    dialogueTree = dialogue.dialogue_tree
      ? typeof dialogue.dialogue_tree === "string"
        ? JSON.parse(dialogue.dialogue_tree)
        : dialogue.dialogue_tree
      : null;
    skillChecks = dialogue.skill_checks
      ? typeof dialogue.skill_checks === "string"
        ? JSON.parse(dialogue.skill_checks)
        : dialogue.skill_checks
      : [];
    // Try information_revealed first (correct field), fall back to information
    information = dialogue.information_revealed
      ? typeof dialogue.information_revealed === "string"
        ? JSON.parse(dialogue.information_revealed)
        : dialogue.information_revealed
      : dialogue.information
        ? typeof dialogue.information === "string"
          ? JSON.parse(dialogue.information)
          : dialogue.information
        : [];
    potentialQuests = dialogue.potential_quests
      ? typeof dialogue.potential_quests === "string"
        ? JSON.parse(dialogue.potential_quests)
        : dialogue.potential_quests
      : [];
  } catch (err) {
    logger.error("Failed to parse dialogue data:", err);
  }

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="MessageSquare"
      iconColor="blue"
      title={dialogue.character_name}
      subtitle={dialogue.mood || undefined}
      onDelete={onDelete}
      onEdit={onEdit}
    >
      <div className="space-y-6">
        {dialogue.scene_setting && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Scene Setting
            </h4>
            <p className="text-text leading-relaxed">
              {dialogue.scene_setting}
            </p>
          </div>
        )}

        {/* Opening Line */}
        {dialogueTree.opening_line && (
          <div className="bg-blue-500/5 p-4 rounded-lg border border-blue-500/20">
            <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">
              Opening Line
            </h4>
            <p className="text-text italic leading-relaxed">
              &ldquo;{dialogueTree.opening_line}&rdquo;
            </p>
          </div>
        )}

        {/* Dialogue Options */}
        {dialogueTree &&
          (dialogueTree.friendly ||
            dialogueTree.neutral ||
            dialogueTree.hostile) && (
            <div>
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                Dialogue Options
              </h4>
              <div className="space-y-4">
                {/* Friendly Approach */}
                {dialogueTree.friendly && (
                  <div className="bg-emerald-500/5 p-4 rounded-lg border border-emerald-500/30">
                    <div className="mb-3">
                      <h5 className="text-emerald-400 font-semibold">
                        Friendly Approach
                      </h5>
                    </div>
                    <div className="space-y-2">
                      <p className="text-text">
                        <span className="text-text-muted font-medium">
                          Player:
                        </span>{" "}
                        &ldquo;
                        {dialogueTree.friendly.player_option ||
                          dialogueTree.friendly.player}
                        &rdquo;
                      </p>
                      <p className="text-emerald-300">
                        <span className="text-emerald-400 font-medium">
                          NPC Response:
                        </span>{" "}
                        &ldquo;
                        {dialogueTree.friendly.npc_response}
                        &rdquo;
                      </p>
                      {dialogueTree.friendly.outcome && (
                        <p className="text-text-muted text-sm italic">
                          <span className="font-medium">Outcome:</span>{" "}
                          {dialogueTree.friendly.outcome}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Neutral Approach */}
                {dialogueTree.neutral && (
                  <div className="bg-blue-500/5 p-4 rounded-lg border border-blue-500/30">
                    <div className="mb-3">
                      <h5 className="text-blue-400 font-semibold">
                        Neutral Approach
                      </h5>
                    </div>
                    <div className="space-y-2">
                      <p className="text-text">
                        <span className="text-text-muted font-medium">
                          Player:
                        </span>{" "}
                        &ldquo;
                        {dialogueTree.neutral.player_option ||
                          dialogueTree.neutral.player}
                        &rdquo;
                      </p>
                      <p className="text-blue-300">
                        <span className="text-blue-400 font-medium">
                          NPC Response:
                        </span>{" "}
                        &ldquo;
                        {dialogueTree.neutral.npc_response}
                        &rdquo;
                      </p>
                      {dialogueTree.neutral.outcome && (
                        <p className="text-text-muted text-sm italic">
                          <span className="font-medium">Outcome:</span>{" "}
                          {dialogueTree.neutral.outcome}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Hostile Approach */}
                {dialogueTree.hostile && (
                  <div className="bg-red-500/5 p-4 rounded-lg border border-red-500/30">
                    <div className="mb-3">
                      <h5 className="text-red-400 font-semibold">
                        Hostile Approach
                      </h5>
                    </div>
                    <div className="space-y-2">
                      <p className="text-text">
                        <span className="text-text-muted font-medium">
                          Player:
                        </span>{" "}
                        &ldquo;
                        {dialogueTree.hostile.player_option ||
                          dialogueTree.hostile.player}
                        &rdquo;
                      </p>
                      <p className="text-red-300">
                        <span className="text-red-400 font-medium">
                          NPC Response:
                        </span>{" "}
                        &ldquo;
                        {dialogueTree.hostile.npc_response}
                        &rdquo;
                      </p>
                      {dialogueTree.hostile.outcome && (
                        <p className="text-text-muted text-sm italic">
                          <span className="font-medium">Outcome:</span>{" "}
                          {dialogueTree.hostile.outcome}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Legacy dialogue tree format support */}
        {Array.isArray(dialogueTree) && dialogueTree.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Dialogue Options
            </h4>
            <div className="space-y-3">
              {dialogueTree.map((node: any, i: number) => (
                <div
                  key={i}
                  className="bg-background p-4 rounded-lg border border-border"
                >
                  <p className="text-text font-medium mb-2">
                    {node.prompt || node.text}
                  </p>
                  {node.responses && (
                    <ul className="list-disc list-inside text-text-muted text-sm space-y-1">
                      {node.responses.map((r: string, j: number) => (
                        <li key={j}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body Language */}
        {dialogueTree.body_language && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Body Language
            </h4>
            <p className="text-text leading-relaxed italic">
              {dialogueTree.body_language}
            </p>
          </div>
        )}

        {skillChecks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Skill Checks
            </h4>
            <div className="space-y-2">
              {skillChecks.map((check: any, i: number) => (
                <div
                  key={i}
                  className="bg-purple-500/5 p-3 rounded-lg border border-purple-500/30"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-purple-400 font-medium">
                      {check.skill || check.name}
                    </span>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm font-semibold">
                      DC {check.dc}
                    </span>
                  </div>
                  {check.success && (
                    <p className="text-text-muted text-sm mt-2">
                      <span className="text-emerald-400">Success:</span>{" "}
                      {check.success}
                    </p>
                  )}
                  {check.failure && (
                    <p className="text-text-muted text-sm mt-1">
                      <span className="text-red-400">Failure:</span>{" "}
                      {check.failure}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {information.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Information to Reveal
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {information.map((info: any, i: number) => (
                <li key={i}>
                  {typeof info === "string" ? info : info.text || info.content}
                </li>
              ))}
            </ul>
          </div>
        )}

        {potentialQuests.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Potential Quests
            </h4>
            <div className="space-y-2">
              {potentialQuests.map((quest: any, i: number) => (
                <div
                  key={i}
                  className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/30"
                >
                  <p className="text-amber-400 font-medium">
                    {typeof quest === "string"
                      ? quest
                      : quest.name || quest.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ContentDetailModal>
  );
}

interface EditDialogueModalProps {
  dialogue: Dialogue;
  onClose: () => void;
  onSave: (id: string, updates: UpdateDialogueRequest) => Promise<void>;
}

function EditDialogueModal({
  dialogue,
  onClose,
  onSave,
}: EditDialogueModalProps) {
  const [formData, setFormData] = useState({
    character_name: dialogue.character_name,
    scene_setting: dialogue.scene_setting || "",
    mood: dialogue.mood || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateDialogueRequest = {
        npc_name: formData.character_name,
        context: formData.scene_setting || undefined,
        emotional_state: formData.mood || undefined,
      };

      await onSave(dialogue.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save dialogue");
      setSaving(false);
    }
  };

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="MessageSquare"
      iconColor="blue"
      title="Edit Dialogue"
      subtitle={dialogue.character_name}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Character Name *
          </label>
          <input
            type="text"
            value={formData.character_name}
            onChange={(e) =>
              setFormData({ ...formData, character_name: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Scene Setting
          </label>
          <textarea
            value={formData.scene_setting}
            onChange={(e) =>
              setFormData({ ...formData, scene_setting: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={3}
            placeholder="Describe where and when this conversation takes place..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Mood
          </label>
          <input
            type="text"
            value={formData.mood}
            onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            placeholder="Friendly, Suspicious, Angry..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
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
    </ContentDetailModal>
  );
}
