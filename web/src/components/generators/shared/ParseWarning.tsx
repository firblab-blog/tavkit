import Icon from "@/components/common/Icon";

interface ParseWarningProps {
  message: string;
}

/**
 * Warning banner for parse/format issues in AI responses
 */
export function ParseWarning({ message }: ParseWarningProps) {
  return (
    <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
      <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-2">
        <Icon name="AlertCircle" className="w-5 h-5" />
        Response Format Warning
      </div>
      <p className="text-text-muted text-sm">{message}</p>
    </div>
  );
}
