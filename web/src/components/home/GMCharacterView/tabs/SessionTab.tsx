import { useNavigate } from "react-router-dom";
import Icon, { IconName } from "../../../common/Icon";

interface SessionTabProps {
  campaignId: string; // Reserved for future use (e.g., active combat status)
}

interface SessionTool {
  label: string;
  description: string;
  icon: IconName;
  path: string;
  color: string;
}

const SESSION_TOOLS: SessionTool[] = [
  {
    label: "Guild Roster",
    description: "Manage party characters",
    icon: "Users",
    path: "/dashboard/gm/characters",
    color: "purple",
  },
  {
    label: "Combat Tracker",
    description: "Run combat encounters with initiative tracking",
    icon: "Swords",
    path: "/dashboard/gm/combat",
    color: "red",
  },
  {
    label: "Chase Manager",
    description: "Track pursuits and chases",
    icon: "ArrowRight",
    path: "/dashboard/gm/chase",
    color: "orange",
  },
  {
    label: "Session Chat",
    description: "AI assistant for your session",
    icon: "MessageCircle",
    path: "/dashboard/gm/chat",
    color: "blue",
  },
  {
    label: "Social Encounter",
    description: "Run social scenes and interactions",
    icon: "Smile",
    path: "/dashboard/gm/social",
    color: "pink",
  },
  {
    label: "Tavern Session",
    description: "Manage tavern visits and downtime",
    icon: "Beer",
    path: "/dashboard/gm/tavern-session",
    color: "amber",
  },
  {
    label: "Shopping",
    description: "Run shopping sessions",
    icon: "Store",
    path: "/dashboard/gm/shopping",
    color: "emerald",
  },
];

const colorClasses: Record<
  string,
  { bg: string; text: string; border: string; hover: string }
> = {
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    hover: "hover:border-red-500/50",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
    hover: "hover:border-orange-500/50",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    hover: "hover:border-blue-500/50",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    hover: "hover:border-purple-500/50",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    hover: "hover:border-amber-500/50",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    hover: "hover:border-emerald-500/50",
  },
  pink: {
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    border: "border-pink-500/30",
    hover: "hover:border-pink-500/50",
  },
};

/**
 * SessionTab - Session tools for running games.
 *
 * Shows:
 * - Grid of session tools (Combat Tracker, Chase Manager, etc.)
 * - Each card navigates to the full tool page
 * - Color-coded by tool type
 */
export default function SessionTab({
  campaignId: _campaignId,
}: SessionTabProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">GM Tools</h3>
        <p className="text-text-muted text-sm">
          Tools for running your game. Click any tool to open it.
        </p>
      </div>

      {/* Session Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SESSION_TOOLS.map((tool) => {
          const colors = colorClasses[tool.color];
          return (
            <button
              key={tool.path}
              onClick={() => navigate(tool.path)}
              className={`p-5 rounded-xl border ${colors.border} ${colors.bg} ${colors.hover} hover:scale-105 transition-all text-left group`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon name={tool.icon} className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-text mb-1">{tool.label}</h4>
                  <p className="text-text-muted text-sm">{tool.description}</p>
                </div>
                <Icon
                  name="ArrowRight"
                  className={`w-4 h-4 ${colors.text} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Tips */}
      <div className="bg-background-panel border border-border rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Icon
            name="Info"
            className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
          />
          <div>
            <p className="text-text font-medium mb-1">Session Tips</p>
            <ul className="text-text-muted text-sm space-y-1">
              <li>
                • Use <strong>Combat Tracker</strong> for initiative and HP
                tracking
              </li>
              <li>
                • The <strong>Chat</strong> tab can help generate content on the
                fly
              </li>
              <li>
                • Run <strong>Social Encounters</strong> for negotiation and
                diplomacy scenes
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
