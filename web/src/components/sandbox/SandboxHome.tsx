import { useNavigate } from "react-router-dom";
import Icon, { IconName } from "../common/Icon";
import { useUISettingsStore } from "../../store/uiSettingsStore";
import { LibraryContentTab } from "../home/GMCharacterView/tabs/library";

interface GeneratorCardProps {
  label: string;
  path: string;
  icon: IconName;
  description: string;
  color: "purple" | "blue" | "emerald" | "amber" | "rose" | "cyan";
}

const colorClasses = {
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20 hover:border-purple-500/40",
    icon: "text-purple-400",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20 hover:border-blue-500/40",
    icon: "text-blue-400",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    icon: "text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20 hover:border-amber-500/40",
    icon: "text-amber-400",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20 hover:border-rose-500/40",
    icon: "text-rose-400",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20 hover:border-cyan-500/40",
    icon: "text-cyan-400",
  },
};

function GeneratorCard({
  label,
  path,
  icon,
  description,
  color,
}: GeneratorCardProps) {
  const navigate = useNavigate();
  const colors = colorClasses[color];

  return (
    <button
      onClick={() => navigate(path)}
      className={`p-4 rounded-xl ${colors.bg} border ${colors.border} transition-all duration-200 text-left hover:scale-105 group`}
    >
      <Icon
        name={icon}
        className={`w-8 h-8 ${colors.icon} mb-3 group-hover:scale-110 transition-transform`}
      />
      <h3 className="text-text font-semibold mb-1">{label}</h3>
      <p className="text-text-muted text-sm">{description}</p>
    </button>
  );
}

/**
 * SandboxHome - Personal Library landing page.
 *
 * Full experience for creating content without a campaign:
 * - Full library browser with campaign filter dropdown
 * - Generator grid with all 13 generators
 */
export default function SandboxHome() {
  const enabledGenerators = useUISettingsStore(
    (state) => state.enabledGenerators,
  );

  // All generators with their properties
  const allGenerators: {
    key: string;
    label: string;
    path: string;
    icon: IconName;
    description: string;
    color: GeneratorCardProps["color"];
  }[] = [
    {
      key: "npc",
      label: "NPCs",
      path: "/dashboard/sandbox/generator/npc",
      icon: "Users",
      description: "Generate characters",
      color: "purple",
    },
    {
      key: "monster",
      label: "Monsters",
      path: "/dashboard/sandbox/generator/monster",
      icon: "Skull",
      description: "Create creatures",
      color: "rose",
    },
    {
      key: "encounter",
      label: "Encounters",
      path: "/dashboard/sandbox/generator/encounter",
      icon: "Swords",
      description: "Plan battles",
      color: "amber",
    },
    {
      key: "location",
      label: "Locations",
      path: "/dashboard/sandbox/generator/location",
      icon: "Map",
      description: "Build places",
      color: "emerald",
    },
    {
      key: "item",
      label: "Items",
      path: "/dashboard/sandbox/generator/item",
      icon: "Package",
      description: "Forge treasures",
      color: "amber",
    },
    {
      key: "quest",
      label: "Quests",
      path: "/dashboard/sandbox/generator/quest",
      icon: "Scroll",
      description: "Design adventures",
      color: "blue",
    },
    {
      key: "dialogue",
      label: "Dialogues",
      path: "/dashboard/sandbox/generator/dialogue",
      icon: "MessageSquare",
      description: "Write conversations",
      color: "cyan",
    },
    {
      key: "rumor",
      label: "Rumors",
      path: "/dashboard/sandbox/generator/rumor",
      icon: "MessageCircle",
      description: "Spread whispers",
      color: "purple",
    },
    {
      key: "tavern",
      label: "Taverns",
      path: "/dashboard/sandbox/generator/tavern",
      icon: "Beer",
      description: "Generate establishments",
      color: "amber",
    },
    {
      key: "merchant",
      label: "Merchants",
      path: "/dashboard/sandbox/generator/merchant",
      icon: "Store",
      description: "Create shops",
      color: "emerald",
    },
    {
      key: "trap",
      label: "Traps",
      path: "/dashboard/sandbox/generator/trap",
      icon: "AlertCircle",
      description: "Design hazards",
      color: "rose",
    },
    {
      key: "critter",
      label: "Critters",
      path: "/dashboard/sandbox/generator/critter",
      icon: "Shield",
      description: "Generate companions",
      color: "cyan",
    },
    {
      key: "chase",
      label: "Chases",
      path: "/dashboard/sandbox/generator/chase",
      icon: "ArrowRight",
      description: "Create pursuits",
      color: "blue",
    },
  ];

  // Filter to only enabled generators
  const enabledGeneratorsList = allGenerators.filter(
    (g) => enabledGenerators[g.key as keyof typeof enabledGenerators],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Icon name="Library" className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-text">
                Personal Library
              </h1>
            </div>
            <p className="text-text-muted">
              Create content without a campaign. Assign to campaigns later from
              Saved Content.
            </p>
          </div>
        </div>

        {/* Library Content with Campaign Filter - use dropdown to filter by campaign or view all */}
        <LibraryContentTab showCampaignFilter={true} />

        {/* Generators Grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Sparkles" className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-text">Create Content</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {enabledGeneratorsList.map((generator) => (
              <GeneratorCard
                key={generator.key}
                label={generator.label}
                path={generator.path}
                icon={generator.icon}
                description={generator.description}
                color={generator.color}
              />
            ))}
          </div>
        </div>

        {/* Tip */}
        <div className="bg-background-panel border border-border rounded-xl p-4 flex items-start gap-3">
          <Icon
            name="Info"
            className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
          />
          <div>
            <p className="text-text font-medium">Tip: Organize your content</p>
            <p className="text-text-muted text-sm mt-1">
              Content created here goes to your Personal Library. Use the
              "Assign to Campaign" button in Saved Content to move items to a
              specific campaign.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
