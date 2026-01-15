import ContentListLayout from "../../../../common/ContentListLayout";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import { useState } from "react";
import { logger } from "@/utils/logger";

interface NPC {
  id: string;
  name: string;
  campaign_id?: string | null;
  race?: string;
  class?: string;
  personality?: string;
  backstory?: string;
  stats?: any;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
}

interface NPCsContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

export default function NPCsContent({
  campaignId,
  showCampaignFilter,
}: NPCsContentProps) {
  const { campaigns } = useCampaignStore();
  const { openGenerator } = useGeneratorModalStore();
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
  } = useLibraryContent<NPC>({
    contentType: "npcs",
    campaignId,
    showCampaignFilter,
    searchFields: ["name", "race", "class", "personality"],
  });

  const handleDelete = async (npc: NPC) => {
    if (window.confirm(`Delete "${npc.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(npc.id);
      } catch (err) {
        logger.error("Failed to delete NPC:", err);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Campaign Filter */}
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
        searchPlaceholder="Search NPCs..."
        addButtonLabel="Add NPC"
        onAddClick={() => openGenerator("npc")}
        addButtonColor="emerald"
        loading={loading}
        error={error}
        emptyIcon="Users"
        emptyTitle="No NPCs yet"
        emptyDescription="Create memorable NPCs for your campaign."
        emptyCTALabel="Create Your First NPC"
        onEmptyCTAClick={() => openGenerator("npc")}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((npc) => (
            <ContentCard
              key={npc.id}
              title={npc.name}
              preview={npc.personality || undefined}
              icon="Users"
              iconColor="emerald"
              date={npc.created_at}
              badges={[
                ...(npc.race ? [{ label: npc.race }] : []),
                ...(npc.class ? [{ label: npc.class }] : []),
              ]}
              onClick={() => setViewingItem(npc)}
              onDelete={() => handleDelete(npc)}
              onAssign={() =>
                setAssignModalItem({
                  id: npc.id,
                  name: npc.name,
                  currentCampaignId: npc.campaign_id,
                })
              }
            />
          ))}
        </div>
      </ContentListLayout>

      {/* Detail Modal */}
      {viewingItem && (
        <NPCDetailModal
          npc={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
        />
      )}

      {/* Assign Campaign Modal */}
      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="npcs"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

// NPC Detail Modal
interface NPCDetailModalProps {
  npc: NPC;
  onClose: () => void;
  onDelete: () => void;
}

function NPCDetailModal({ npc, onClose, onDelete }: NPCDetailModalProps) {
  let stats = null;
  try {
    if (npc.stats) {
      stats = typeof npc.stats === "string" ? JSON.parse(npc.stats) : npc.stats;
    }
  } catch (error) {
    logger.error("Failed to parse NPC stats:", error);
  }

  const subtitle = [npc.race, npc.class].filter(Boolean).join(" ");

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Users"
      iconColor="emerald"
      title={npc.name}
      subtitle={subtitle || undefined}
      onDelete={onDelete}
    >
      <div className="space-y-6">
        {npc.personality && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Personality
            </h4>
            <p className="text-text leading-relaxed">{npc.personality}</p>
          </div>
        )}

        {npc.backstory && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Backstory
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {npc.backstory}
            </p>
          </div>
        )}

        {stats && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Statistics
            </h4>

            {/* Level and Alignment */}
            <div className="grid grid-cols-2 gap-4">
              {stats.level && (
                <div className="bg-background p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                    Level
                  </div>
                  <div className="text-2xl font-bold text-text">
                    {stats.level}
                  </div>
                </div>
              )}
              {stats.alignment && (
                <div className="bg-background p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                    Alignment
                  </div>
                  <div className="text-lg font-semibold text-text">
                    {stats.alignment}
                  </div>
                </div>
              )}
            </div>

            {/* Ability Scores */}
            {stats.abilities && (
              <div>
                <h5 className="text-sm font-medium text-text-muted mb-2">
                  Ability Scores
                </h5>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.entries(stats.abilities).map(
                    ([ability, score]: [string, any]) => (
                      <div
                        key={ability}
                        className="bg-background p-3 rounded-lg border border-border text-center"
                      >
                        <div className="text-xs text-text-muted uppercase">
                          {ability}
                        </div>
                        <div className="text-2xl font-bold text-text">
                          {score}
                        </div>
                        <div className="text-xs text-text-muted">
                          {Math.floor((score - 10) / 2) >= 0 ? "+" : ""}
                          {Math.floor((score - 10) / 2)}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Skills */}
            {stats.skills && stats.skills.length > 0 && (
              <div className="bg-background p-4 rounded-lg border border-border">
                <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
                  Skills
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.skills.map((skill: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment */}
            {stats.equipment && stats.equipment.length > 0 && (
              <div className="bg-background p-4 rounded-lg border border-border">
                <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
                  Equipment
                </div>
                <ul className="list-disc list-inside text-text space-y-1">
                  {stats.equipment.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Plot Hooks */}
            {stats.plot_hooks && stats.plot_hooks.length > 0 && (
              <div className="bg-background p-4 rounded-lg border border-border">
                <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
                  Plot Hooks
                </div>
                <ul className="list-disc list-inside text-text space-y-1">
                  {stats.plot_hooks.map((hook: string, i: number) => (
                    <li key={i}>{hook}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!npc.personality && !npc.backstory && !stats && (
          <p className="text-text-muted italic">No additional details</p>
        )}
      </div>
    </ContentDetailModal>
  );
}
