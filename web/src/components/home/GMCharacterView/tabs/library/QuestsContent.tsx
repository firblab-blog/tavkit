import ContentListLayout from "../../../../common/ContentListLayout";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";

interface Quest {
  id: string;
  title: string;
  campaign_id?: string | null;
  type: string;
  category?: string;
  description?: string;
  objectives?: any;
  rewards?: any;
  complications?: any;
  npcs_involved?: any;
  locations_involved?: any;
  faction_alignment?: string;
  party_level?: number;
  status: string;
  moral_ambiguity?: boolean;
  combat_intensity?: string;
  time_limit?: string;
  ai_generated?: boolean;
  created_at: string;
}

interface QuestsContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  available: { bg: "bg-green-500/10", text: "text-green-400" },
  active: { bg: "bg-blue-500/10", text: "text-blue-400" },
  completed: { bg: "bg-purple-500/10", text: "text-purple-400" },
  failed: { bg: "bg-red-500/10", text: "text-red-400" },
};

export default function QuestsContent({
  campaignId,
  showCampaignFilter,
}: QuestsContentProps) {
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
  } = useLibraryContent<Quest>({
    contentType: "quests",
    campaignId,
    showCampaignFilter,
    searchFields: ["title", "type", "description"],
  });

  const handleDelete = async (quest: Quest) => {
    if (window.confirm(`Delete "${quest.title}"? This cannot be undone.`)) {
      try {
        await deleteItem(quest.id);
      } catch (err) {
        logger.error("Failed to delete quest:", err);
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
        searchPlaceholder="Search quests..."
        addButtonLabel="Add Quest"
        onAddClick={() => openGenerator("quest")}
        addButtonColor="amber"
        loading={loading}
        error={error}
        emptyIcon="Scroll"
        emptyTitle="No quests yet"
        emptyDescription="Create adventures and story hooks."
        emptyCTALabel="Create Your First Quest"
        onEmptyCTAClick={() => openGenerator("quest")}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((quest) => {
            const statusColor =
              statusColors[quest.status] || statusColors.available;
            return (
              <ContentCard
                key={quest.id}
                title={quest.title}
                preview={quest.description || undefined}
                icon="Scroll"
                iconColor="amber"
                date={quest.created_at}
                badges={[
                  { label: quest.type },
                  {
                    label: quest.status,
                    color: statusColor.text,
                    bgColor: statusColor.bg,
                  },
                ]}
                onClick={() => setViewingItem(quest)}
                onDelete={() => handleDelete(quest)}
                onAssign={() =>
                  setAssignModalItem({
                    id: quest.id,
                    name: quest.title,
                    currentCampaignId: quest.campaign_id,
                  })
                }
              />
            );
          })}
        </div>
      </ContentListLayout>

      {viewingItem && (
        <QuestDetailModal
          quest={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="quests"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

interface QuestDetailModalProps {
  quest: Quest;
  onClose: () => void;
  onDelete: () => void;
}

function QuestDetailModal({ quest, onClose, onDelete }: QuestDetailModalProps) {
  let objectives: any[] = [];
  let rewards: any = null;
  let complications: any[] = [];

  try {
    objectives = quest.objectives
      ? typeof quest.objectives === "string"
        ? JSON.parse(quest.objectives)
        : quest.objectives
      : [];
    rewards = quest.rewards
      ? typeof quest.rewards === "string"
        ? JSON.parse(quest.rewards)
        : quest.rewards
      : null;
    complications = quest.complications
      ? typeof quest.complications === "string"
        ? JSON.parse(quest.complications)
        : quest.complications
      : [];
  } catch (err) {
    logger.error("Failed to parse quest data:", err);
  }

  const statusColor = statusColors[quest.status] || statusColors.available;

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Scroll"
      iconColor="amber"
      title={quest.title}
      subtitle={quest.type}
      onDelete={onDelete}
    >
      <div className="space-y-6">
        {/* Status and Info Row */}
        <div className="flex flex-wrap gap-3">
          <div
            className={`px-4 py-2 ${statusColor.bg} border border-amber-500/30 rounded-lg`}
          >
            <p className="text-xs text-text-muted">Status</p>
            <p
              className={`text-lg font-semibold ${statusColor.text} capitalize`}
            >
              {quest.status}
            </p>
          </div>
          {quest.party_level && (
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              <p className="text-xs text-text-muted">Party Level</p>
              <p className="text-lg font-semibold text-text">
                {quest.party_level}
              </p>
            </div>
          )}
          {quest.combat_intensity && (
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              <p className="text-xs text-text-muted">Combat</p>
              <p className="text-lg font-semibold text-text capitalize">
                {quest.combat_intensity}
              </p>
            </div>
          )}
        </div>

        {quest.description && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {quest.description}
            </p>
          </div>
        )}

        {objectives.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Objectives
            </h4>
            <ul className="space-y-2">
              {objectives.map((obj: any, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-amber-500/10 text-amber-400 rounded flex items-center justify-center text-sm flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-text">
                    {typeof obj === "string" ? obj : obj.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {rewards && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Rewards
            </h4>
            <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30">
              {rewards.gold && (
                <p className="text-amber-400 font-semibold">
                  {rewards.gold} gold pieces
                </p>
              )}
              {rewards.xp && <p className="text-amber-400">XP: {rewards.xp}</p>}
              {rewards.items && rewards.items.length > 0 && (
                <ul className="list-disc list-inside text-text mt-2">
                  {rewards.items.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              {typeof rewards === "string" && (
                <p className="text-amber-400">{rewards}</p>
              )}
            </div>
          </div>
        )}

        {complications.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Potential Complications
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {complications.map((c: any, i: number) => (
                <li key={i}>{typeof c === "string" ? c : c.description}</li>
              ))}
            </ul>
          </div>
        )}

        {quest.time_limit && (
          <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30">
            <p className="text-red-400 font-medium">
              Time Limit: {quest.time_limit}
            </p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  );
}
