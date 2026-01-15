interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  entityName: string;
  campaignId: string | null;
}

/**
 * Reusable save confirmation modal for generators
 */
export function SaveModal({
  isOpen,
  onClose,
  onSave,
  entityName,
  campaignId,
}: SaveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background-panel rounded-lg border border-border p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-text mb-4">Save Content</h3>
        <p className="text-text-muted mb-6">
          Save "{entityName}" to your collection?{" "}
          {campaignId && "It will be linked to your selected campaign."}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text hover:bg-background-panel transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
