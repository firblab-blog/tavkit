import Icon from "../common/Icon";

interface MoodTrackerProps {
  currentMood: number;
  startingMood: number;
  successCount: number;
  failureCount: number;
  successThreshold: number;
  onMoodChange: (mood: number) => void;
  disabled?: boolean;
}

export default function MoodTracker({
  currentMood,
  startingMood,
  successCount,
  failureCount,
  successThreshold,
  onMoodChange,
  disabled = false,
}: MoodTrackerProps) {
  const getMoodLabel = (mood: number) => {
    if (mood <= -4) return "Hostile";
    if (mood <= -2) return "Unfriendly";
    if (mood <= 0) return "Indifferent";
    if (mood <= 2) return "Friendly";
    return "Helpful";
  };

  const getMoodColor = (mood: number) => {
    if (mood <= -4) return "text-red-500";
    if (mood <= -2) return "text-orange-500";
    if (mood <= 0) return "text-gray-400";
    if (mood <= 2) return "text-emerald-500";
    return "text-blue-500";
  };

  const getMoodEmoji = (mood: number) => {
    if (mood <= -4) return "😠";
    if (mood <= -2) return "😒";
    if (mood <= 0) return "😐";
    if (mood <= 2) return "🙂";
    return "😊";
  };

  // Calculate mood bar position (normalized to 0-100%)
  const moodPosition = ((currentMood + 5) / 10) * 100;

  return (
    <div className="bg-background-panel border border-border rounded-xl p-4 space-y-4">
      {/* Mood Display */}
      <div className="text-center">
        <div className="text-4xl mb-2">{getMoodEmoji(currentMood)}</div>
        <h3 className={`text-xl font-bold ${getMoodColor(currentMood)}`}>
          {getMoodLabel(currentMood)}
        </h3>
        <p className="text-sm text-text-muted">
          Current Mood: {currentMood > 0 ? "+" : ""}
          {currentMood}
        </p>
      </div>

      {/* Mood Bar */}
      <div className="relative">
        <div className="h-3 bg-gradient-to-r from-red-500 via-gray-500 to-emerald-500 rounded-full overflow-hidden" />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-background-panel rounded-full shadow-lg transition-all"
          style={{ left: `calc(${moodPosition}% - 8px)` }}
        />
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>-5</span>
          <span>0</span>
          <span>+5</span>
        </div>
      </div>

      {/* Manual Mood Adjustment */}
      {!disabled && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onMoodChange(Math.max(-5, currentMood - 1))}
            disabled={currentMood <= -5}
            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
            title="Decrease Mood"
          >
            <Icon name="ChevronDown" className="w-4 h-4" />
          </button>
          <span className="text-sm text-text-muted">Adjust Mood</span>
          <button
            onClick={() => onMoodChange(Math.min(5, currentMood + 1))}
            disabled={currentMood >= 5}
            className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
            title="Increase Mood"
          >
            <Icon name="ChevronUp" className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Progress Tracking */}
      <div className="border-t border-border pt-4 space-y-3">
        {/* Successes */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-text-muted">Successes</span>
            <span className="text-emerald-400 font-medium">
              {successCount} / {successThreshold}
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${Math.min(100, (successCount / successThreshold) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Failures */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-text-muted">Failures</span>
            <span className="text-red-400 font-medium">{failureCount} / 3</span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${Math.min(100, (failureCount / 3) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Starting Mood Reference */}
      <div className="text-xs text-center text-text-muted border-t border-border pt-3">
        Started at:{" "}
        <span className={getMoodColor(startingMood)}>
          {getMoodLabel(startingMood)} ({startingMood > 0 ? "+" : ""}
          {startingMood})
        </span>
      </div>
    </div>
  );
}
