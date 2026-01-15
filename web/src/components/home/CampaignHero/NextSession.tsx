import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "../../common/Icon";

interface NextSessionProps {
  campaignId: string;
}

export default function NextSession({ campaignId }: NextSessionProps) {
  const [nextSessionDate, setNextSessionDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(`next-session-${campaignId}`);
    if (stored) {
      setNextSessionDate(new Date(stored));
    }
  }, [campaignId]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isModalOpen]);

  const formatSessionDate = (date: Date) => {
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInMs < 0) {
      return {
        text: "Session was scheduled for " + date.toLocaleDateString(),
        subtext: "Past session",
        status: "past",
      };
    }

    if (diffInDays === 0) {
      if (diffInHours <= 0) {
        return {
          text: "Session starts soon!",
          subtext: "Get ready to run!",
          status: "imminent",
        };
      }
      return {
        text: `Session in ${diffInHours} hour${diffInHours === 1 ? "" : "s"}`,
        subtext: `Today at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
        status: "today",
      };
    }

    if (diffInDays === 1) {
      return {
        text: "Session tomorrow",
        subtext: `at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
        status: "soon",
      };
    }

    if (diffInDays < 7) {
      return {
        text: `Session in ${diffInDays} days`,
        subtext: date.toLocaleDateString([], {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        status: "soon",
      };
    }

    return {
      text: date.toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      subtext: `at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
      status: "future",
    };
  };

  const openModal = () => {
    if (nextSessionDate) {
      const d = nextSessionDate;
      setDateValue(d.toISOString().split("T")[0]);
      setTimeValue(d.toTimeString().slice(0, 5));
    } else {
      // Default to next Saturday at 7pm
      const today = new Date();
      const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
      const nextSaturday = new Date(today);
      nextSaturday.setDate(today.getDate() + daysUntilSaturday);
      setDateValue(nextSaturday.toISOString().split("T")[0]);
      setTimeValue("19:00");
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (dateValue) {
      const dateTimeStr = timeValue
        ? `${dateValue}T${timeValue}`
        : `${dateValue}T19:00`;
      const date = new Date(dateTimeStr);
      if (!isNaN(date.getTime())) {
        setNextSessionDate(date);
        localStorage.setItem(`next-session-${campaignId}`, date.toISOString());
        setIsModalOpen(false);
      }
    }
  };

  const handleClearDate = () => {
    setNextSessionDate(null);
    localStorage.removeItem(`next-session-${campaignId}`);
    setIsModalOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  // Quick select buttons for common times
  const quickSelectDays = [
    { label: "Today", days: 0 },
    { label: "Tomorrow", days: 1 },
    { label: "This Weekend", days: (6 - new Date().getDay() + 7) % 7 || 7 },
    { label: "Next Week", days: 7 },
  ];

  const handleQuickSelect = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    setDateValue(date.toISOString().split("T")[0]);
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-background-panel border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Icon name="Calendar" className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text">
                  Schedule Session
                </h3>
                <p className="text-sm text-text-muted">
                  When's your next game?
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
            >
              <Icon name="X" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Quick Select */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Quick Select
            </label>
            <div className="grid grid-cols-4 gap-2">
              {quickSelectDays.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleQuickSelect(option.days)}
                  className="px-2 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:border-amber-500/40 hover:bg-amber-500/10 text-text-muted hover:text-amber-400 transition-all"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Time Input */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Time
            </label>
            <div className="relative">
              <input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all [color-scheme:dark]"
              />
            </div>
            {/* Common Times */}
            <div className="flex gap-2 mt-2">
              {["18:00", "19:00", "20:00", "21:00"].map((time) => (
                <button
                  key={time}
                  onClick={() => setTimeValue(time)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    timeValue === time
                      ? "border-amber-500 bg-amber-500/20 text-amber-400"
                      : "border-border bg-background hover:border-amber-500/40 text-text-muted hover:text-text"
                  }`}
                >
                  {new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background border-t border-border px-6 py-4">
          <div className="flex items-center justify-between">
            {nextSessionDate ? (
              <button
                onClick={handleClearDate}
                className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Icon name="Trash2" className="w-4 h-4" />
                Clear
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-text-muted hover:text-text hover:bg-background-panel rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!dateValue}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-background font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name="Check" className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const modal = isModalOpen ? createPortal(modalContent, document.body) : null;

  // No session scheduled state
  if (!nextSessionDate) {
    return (
      <>
        <div className="bg-background/50 border border-border/50 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon name="Calendar" className="w-5 h-5 text-text-muted" />
              <span className="text-text-muted text-sm sm:text-base">
                No upcoming session scheduled
              </span>
            </div>
            <button
              onClick={openModal}
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 hover:border-amber-500/60 text-amber-400 text-sm font-medium rounded-lg transition-all flex items-center gap-2 flex-shrink-0"
            >
              <Icon name="Plus" className="w-4 h-4" />
              <span className="hidden sm:inline">Schedule Session</span>
              <span className="sm:hidden">Schedule</span>
            </button>
          </div>
        </div>
        {modal}
      </>
    );
  }

  // Session scheduled state
  const { text, subtext, status } = formatSessionDate(nextSessionDate);
  const statusStyles = {
    past: {
      container: "bg-background/50 border-text-muted/20",
      icon: "text-text-muted",
      text: "text-text-muted",
    },
    imminent: {
      container: "bg-red-500/10 border-red-500/40 animate-pulse",
      icon: "text-red-400",
      text: "text-red-400",
    },
    today: {
      container: "bg-yellow-500/10 border-yellow-500/40",
      icon: "text-yellow-400",
      text: "text-yellow-400",
    },
    soon: {
      container: "bg-amber-500/10 border-amber-500/40",
      icon: "text-amber-400",
      text: "text-amber-400",
    },
    future: {
      container: "bg-blue-500/10 border-blue-500/40",
      icon: "text-blue-400",
      text: "text-blue-400",
    },
  };

  const styles = statusStyles[status as keyof typeof statusStyles];

  return (
    <>
      <div className={`border-2 rounded-xl p-4 ${styles.container}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${styles.container}`}
            >
              <Icon name="Calendar" className={`w-5 h-5 ${styles.icon}`} />
            </div>
            <div className="min-w-0">
              <p className={`font-semibold ${styles.text}`}>{text}</p>
              {subtext && (
                <p className="text-sm text-text-muted truncate">{subtext}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={openModal}
              className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
              title="Edit session"
            >
              <Icon name="Edit" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {modal}
    </>
  );
}
