import Icon from "@/components/common/Icon";

interface ManualEntryPreviewProps {
  entityType: string;
}

/**
 * Placeholder content shown in the preview area during manual entry mode
 */
export function ManualEntryPreview({ entityType }: ManualEntryPreviewProps) {
  return (
    <div className="text-center py-12 text-text-muted">
      <Icon name="Pencil" className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p>Fill out the form and click Save to create your {entityType}</p>
      <p className="text-sm mt-2">
        Your saved content will appear in the Saved Content section
      </p>
    </div>
  );
}
