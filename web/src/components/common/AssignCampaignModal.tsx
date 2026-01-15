import { useState } from "react";
import Icon from "./Icon";
import { useCampaignStore } from "../../store/campaignStore";
import { apiClient } from "@/api/client";

interface AssignCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: string;
  contentId: string;
  contentName: string;
  currentCampaignId?: string | null;
  onSuccess: () => void;
}

export default function AssignCampaignModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentName,
  currentCampaignId,
  onSuccess,
}: AssignCampaignModalProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    currentCampaignId || "library",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { campaigns } = useCampaignStore();

  if (!isOpen) return null;

  const handleAssign = async () => {
    setLoading(true);
    setError("");

    try {
      // "library" means set campaign_id to null (Personal Library)
      const campaignId =
        selectedCampaignId === "library" ? null : selectedCampaignId;

      await apiClient.patch(`/${contentType}/${contentId}/campaign`, {
        campaign_id: campaignId,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || "Failed to assign campaign",
      );
    } finally {
      setLoading(false);
    }
  };

  // Check if the selected campaign is different from current
  const hasChanged =
    (selectedCampaignId === "library" && currentCampaignId !== null) ||
    (selectedCampaignId !== "library" &&
      selectedCampaignId !== currentCampaignId);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background-panel border border-border rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="FolderInput" className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">
              Assign to Campaign
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
            Assign <span className="text-text font-medium">{contentName}</span>{" "}
            to a campaign or your Personal Library.
          </p>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-text-muted text-sm font-medium mb-2">
              Select Destination
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary transition-colors"
            >
              <option value="library">Personal Library</option>
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
            onClick={handleAssign}
            disabled={loading || !hasChanged}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              hasChanged
                ? "bg-primary text-white hover:bg-primary/80"
                : "bg-background text-text-muted cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Icon name="Check" className="w-4 h-4" />
                Assign
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
