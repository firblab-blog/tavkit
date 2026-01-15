import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon, { IconName } from "../common/Icon";
import { useContextStore } from "../../store/contextStore";
import { useCampaignStore } from "../../store/campaignStore";
import PlayerOnboarding from "./PlayerOnboarding";

interface FeatureCardProps {
  icon: IconName;
  title: string;
  description: string;
  color: "emerald" | "blue" | "purple" | "amber" | "rose" | "cyan";
}

const colorClasses = {
  emerald: {
    icon: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  blue: {
    icon: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  purple: {
    icon: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  amber: {
    icon: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  rose: {
    icon: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
  cyan: {
    icon: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
};

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  const colors = colorClasses[color];

  return (
    <div
      className={`p-4 rounded-xl ${colors.bg} border ${colors.border} transition-all duration-200 hover:scale-105`}
    >
      <Icon name={icon} className={`w-8 h-8 ${colors.icon} mb-3`} />
      <h3 className="text-text font-semibold mb-1">{title}</h3>
      <p className="text-text-muted text-sm">{description}</p>
    </div>
  );
}

interface RoleCardProps {
  icon: IconName;
  title: string;
  subtitle: string;
  description: string;
  color: "amber" | "blue" | "purple";
  onClick: () => void;
}

function RoleCard({
  icon,
  title,
  subtitle,
  description,
  color,
  onClick,
}: RoleCardProps) {
  const colorStyles = {
    amber: {
      icon: "text-amber-400",
      bg: "bg-amber-500/10 hover:bg-amber-500/20",
      border: "border-amber-500/30 hover:border-amber-500/50",
      glow: "hover:shadow-amber-500/10",
    },
    blue: {
      icon: "text-blue-400",
      bg: "bg-blue-500/10 hover:bg-blue-500/20",
      border: "border-blue-500/30 hover:border-blue-500/50",
      glow: "hover:shadow-blue-500/10",
    },
    purple: {
      icon: "text-purple-400",
      bg: "bg-purple-500/10 hover:bg-purple-500/20",
      border: "border-purple-500/30 hover:border-purple-500/50",
      glow: "hover:shadow-purple-500/10",
    },
  };

  const styles = colorStyles[color];

  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-2xl ${styles.bg} border-2 ${styles.border} transition-all duration-200 hover:scale-105 hover:shadow-lg ${styles.glow} text-left group`}
    >
      <div
        className={`w-14 h-14 rounded-xl ${styles.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
      >
        <Icon name={icon} className={`w-8 h-8 ${styles.icon}`} />
      </div>
      <h3 className="text-xl font-bold text-text mb-1">{title}</h3>
      <p className={`text-sm font-medium ${styles.icon} mb-2`}>{subtitle}</p>
      <p className="text-text-muted text-sm">{description}</p>
    </button>
  );
}

/**
 * FeatureShowcase - Landing page for first-time users.
 *
 * Shows what TavKit can do and provides three clear paths:
 * 1. GM Path - Create and run your own campaign
 * 2. Player Path - Track your character in someone else's campaign
 * 3. Explore Path - Try out generators in sandbox mode
 */
export default function FeatureShowcase() {
  const navigate = useNavigate();
  const { completeOnboarding, updateContext } = useContextStore();
  const [showPlayerOnboarding, setShowPlayerOnboarding] = useState(false);

  const handleGMPath = async () => {
    // Mark onboarding as complete
    await completeOnboarding();
    // Navigate to GM dashboard and open create modal
    navigate("/dashboard/gm");
    // Open the global campaign creation modal
    useCampaignStore.getState().openCreateCampaignModal();
  };

  const handlePlayerPath = () => {
    // Show player onboarding modal
    setShowPlayerOnboarding(true);
  };

  const handleExplorePath = async () => {
    // Mark onboarding as complete
    await completeOnboarding();
    // Set context to library mode
    await updateContext({
      last_context_type: "library",
      last_campaign_id: null,
    });
    navigate("/dashboard/sandbox");
  };

  // Show player onboarding flow if selected
  if (showPlayerOnboarding) {
    return <PlayerOnboarding onBack={() => setShowPlayerOnboarding(false)} />;
  }

  return (
    <div className="h-full flex flex-col items-center px-4 py-12 bg-background relative overflow-auto">
      {/* Decorative background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/tavkit-logo-master.svg"
            alt="TavKit"
            className="h-24 w-auto"
          />
        </div>

        {/* Welcome message */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-text mb-3">
            Welcome to TavKit
          </h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            Your AI-powered companion for tabletop roleplaying games. Create,
            prepare, and run amazing adventures.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mb-10">
          <h2 className="text-center text-text-muted uppercase tracking-wider text-sm font-semibold mb-6">
            What can you do with TavKit?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FeatureCard
              icon="Sparkles"
              title="Create Content"
              description="13 AI generators for NPCs, monsters, items, locations, quests, and more."
              color="purple"
            />
            <FeatureCard
              icon="Swords"
              title="Run Sessions"
              description="Combat tracker, chase encounters, social scenes, and shopping trips."
              color="emerald"
            />
            <FeatureCard
              icon="BookOpen"
              title="Campaign Prep"
              description="Campaign ledger, session notes, and world-building tools."
              color="blue"
            />
            <FeatureCard
              icon="Users"
              title="Manage Characters"
              description="Import from D&D Beyond or create characters manually."
              color="amber"
            />
            <FeatureCard
              icon="Library"
              title="Your Library"
              description="All your saved content, organized and searchable."
              color="cyan"
            />
            <FeatureCard
              icon="MessageSquare"
              title="AI Assistant"
              description="Chat about your campaign, get ideas, and solve problems."
              color="rose"
            />
          </div>
        </div>

        {/* Role Selection - Three Paths */}
        <div className="mb-6">
          <h2 className="text-center text-text mb-6 text-lg font-medium">
            How will you use TavKit?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RoleCard
              icon="Crown"
              title="I'm a GM"
              subtitle="Run Your Campaign"
              description="Create and manage your own campaign. Full access to all GM tools, generators, and session management."
              color="amber"
              onClick={handleGMPath}
            />
            <RoleCard
              icon="Sword"
              title="I'm a Player"
              subtitle="Track Your Character"
              description="Playing in someone else's campaign? Track your character, take notes, and access player tools."
              color="blue"
              onClick={handlePlayerPath}
            />
            <RoleCard
              icon="Sparkles"
              title="Just Exploring"
              subtitle="Sandbox Mode"
              description="Try out all the generators without committing to a campaign. Perfect for experimentation."
              color="purple"
              onClick={handleExplorePath}
            />
          </div>
        </div>

        <p className="text-center text-text-muted/60 text-sm">
          You can switch between modes anytime from the context switcher
        </p>
      </div>
    </div>
  );
}
