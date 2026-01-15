import ContentListLayout from "../../../../common/ContentListLayout";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";

interface Dialogue {
  id: string;
  character_name: string;
  campaign_id?: string | null;
  scene_setting?: string;
  mood?: string;
  dialogue_tree?: any;
  skill_checks?: any;
  information?: any;
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

      {viewingItem && (
        <DialogueDetailModal
          dialogue={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
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
}

function DialogueDetailModal({
  dialogue,
  onClose,
  onDelete,
}: DialogueDetailModalProps) {
  let dialogueTree: any[] = [];
  let skillChecks: any[] = [];
  let information: any[] = [];
  let potentialQuests: any[] = [];

  try {
    dialogueTree = dialogue.dialogue_tree
      ? typeof dialogue.dialogue_tree === "string"
        ? JSON.parse(dialogue.dialogue_tree)
        : dialogue.dialogue_tree
      : [];
    skillChecks = dialogue.skill_checks
      ? typeof dialogue.skill_checks === "string"
        ? JSON.parse(dialogue.skill_checks)
        : dialogue.skill_checks
      : [];
    information = dialogue.information
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

        {dialogueTree.length > 0 && (
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

        {skillChecks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Skill Checks
            </h4>
            <div className="space-y-2">
              {skillChecks.map((check: any, i: number) => (
                <div
                  key={i}
                  className="bg-background p-3 rounded-lg border border-border flex justify-between items-center"
                >
                  <span className="text-text">{check.skill || check.name}</span>
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-sm">
                    DC {check.dc}
                  </span>
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
