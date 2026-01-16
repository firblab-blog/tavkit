import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../common/Icon";
import { useContextStore } from "../../store/contextStore";
import { useCampaignStore } from "../../store/campaignStore";
import { storeEvents, CAMPAIGN_CHANGED } from "../../lib/storeEvents";
import { GAME_SYSTEMS } from "../../constants/gameSystems";

interface PlayerOnboardingProps {
  onBack: () => void;
}

type OnboardingPath = "select" | "join" | "track";

/**
 * PlayerOnboarding - Flow for setting up a player campaign.
 *
 * Two paths:
 * 1. Join TavKit Campaign - Enter invite code from GM
 * 2. Track External Game - Create local campaign for games not in TavKit
 */
export default function PlayerOnboarding({ onBack }: PlayerOnboardingProps) {
  const navigate = useNavigate();
  const { completeOnboarding, updateContextSync, persistContext, userContext } =
    useContextStore();
  const {
    addCampaign,
    setActiveCampaignSync,
    persistActiveCampaign,
    joinCampaign,
  } = useCampaignStore();

  const [path, setPath] = useState<OnboardingPath>("select");

  // Join path state
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Track path state
  const [campaignName, setCampaignName] = useState("");
  const [gameSystem, setGameSystem] = useState(
    "Dungeons & Dragons 5th Edition",
  );
  const [characterName, setCharacterName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleJoinCampaign = async () => {
    if (!inviteCode.trim()) {
      setJoinError("Please enter an invite code");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const previousCampaignId = userContext?.last_campaign_id ?? null;
      const previousContextType = userContext?.last_context_type ?? null;

      // Join the campaign via invite code
      const campaign = await joinCampaign(inviteCode.trim());

      // Complete onboarding (fire and forget - non-blocking)
      completeOnboarding().catch(() => {});

      // 1. Update BOTH stores synchronously BEFORE navigation
      updateContextSync({
        last_context_type: "player_campaign",
        last_campaign_id: campaign.id,
        last_character_id: null,
      });
      setActiveCampaignSync(campaign.id);

      // 2. Emit CAMPAIGN_CHANGED event for cache invalidation
      storeEvents.emit(CAMPAIGN_CHANGED, {
        campaignId: campaign.id,
        previousCampaignId,
        contextType: "player_campaign",
        previousContextType,
      });

      // 3. Navigate to player home
      navigate("/dashboard/player");

      // 4. Persist to backend in background
      persistActiveCampaign(campaign.id).catch(() => {});
      persistContext({
        last_context_type: "player_campaign",
        last_campaign_id: campaign.id,
        last_character_id: null,
      }).catch(() => {});
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Failed to join campaign",
      );
      setIsJoining(false);
    }
  };

  const handleCreateTracking = async () => {
    if (!campaignName.trim()) {
      setCreateError("Please enter a campaign name");
      return;
    }
    if (!characterName.trim()) {
      setCreateError("Please enter your character name");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const previousCampaignId = userContext?.last_campaign_id ?? null;
      const previousContextType = userContext?.last_context_type ?? null;

      // Create the campaign with player role
      const campaign = await addCampaign({
        name: campaignName.trim(),
        game_system: gameSystem,
        role: "player",
        is_active: true,
      });

      // Complete onboarding (fire and forget - non-blocking)
      completeOnboarding().catch(() => {});

      // 1. Update BOTH stores synchronously BEFORE navigation
      updateContextSync({
        last_context_type: "player_campaign",
        last_campaign_id: campaign.id,
        last_character_id: null,
      });
      setActiveCampaignSync(campaign.id);

      // 2. Emit CAMPAIGN_CHANGED event for cache invalidation
      storeEvents.emit(CAMPAIGN_CHANGED, {
        campaignId: campaign.id,
        previousCampaignId,
        contextType: "player_campaign",
        previousContextType,
      });

      // 3. Navigate to player home - character creation will happen there
      navigate("/dashboard/player", {
        state: { createCharacter: characterName.trim() },
      });

      // 4. Persist to backend in background
      persistActiveCampaign(campaign.id).catch(() => {});
      persistContext({
        last_context_type: "player_campaign",
        last_campaign_id: campaign.id,
        last_character_id: null,
      }).catch(() => {});
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create campaign",
      );
      setIsCreating(false);
    }
  };

  // Path Selection View
  if (path === "select") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-12 bg-background relative overflow-auto">
        {/* Decorative background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-2xl">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-muted hover:text-text mb-6 transition-colors"
          >
            <Icon name="ArrowLeft" className="w-4 h-4" />
            Back
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-4">
              <Icon name="Sword" className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">
              How are you playing?
            </h1>
            <p className="text-text-muted">
              Choose how you want to set up your player experience
            </p>
          </div>

          {/* Path Selection Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Join TavKit Campaign */}
            <button
              onClick={() => setPath("join")}
              className="group p-6 bg-background-panel border border-border rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon name="Link" className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">
                Join TavKit Campaign
              </h3>
              <p className="text-sm text-text-muted mb-4">
                Your GM uses TavKit and gave you an invite code. Join their
                campaign to see shared content and collaborate.
              </p>
              <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                <span>Enter invite code</span>
                <Icon
                  name="ArrowRight"
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                />
              </div>
            </button>

            {/* Track External Game */}
            <button
              onClick={() => setPath("track")}
              className="group p-6 bg-background-panel border border-border rounded-xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon name="BookOpen" className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">
                Track External Game
              </h3>
              <p className="text-sm text-text-muted mb-4">
                Your GM doesn't use TavKit, but you want to track your
                character, take notes, and use player tools.
              </p>
              <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                <span>Create local tracker</span>
                <Icon
                  name="ArrowRight"
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join TavKit Campaign View
  if (path === "join") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-12 bg-background relative overflow-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-lg">
          {/* Back Button */}
          <button
            onClick={() => setPath("select")}
            className="flex items-center gap-2 text-text-muted hover:text-text mb-6 transition-colors"
          >
            <Icon name="ArrowLeft" className="w-4 h-4" />
            Back
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-4">
              <Icon name="Link" className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">
              Join TavKit Campaign
            </h1>
            <p className="text-text-muted">
              Enter the invite code your GM shared with you
            </p>
          </div>

          {/* Form */}
          <div className="bg-background-panel border border-border rounded-xl p-6 space-y-6">
            {/* Invite Code */}
            <div>
              <label
                htmlFor="inviteCode"
                className="block text-sm font-medium text-text mb-2"
              >
                Invite Code
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter 12-character code"
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-center text-lg tracking-wider font-mono"
                autoFocus
                maxLength={12}
              />
              <p className="text-xs text-text-muted mt-2 text-center">
                Ask your GM for the invite code if you don't have one
              </p>
            </div>

            {/* Error */}
            {joinError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {joinError}
              </div>
            )}

            {/* Join Button */}
            <button
              onClick={handleJoinCampaign}
              disabled={isJoining || !inviteCode.trim()}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <Icon name="Loader2" className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Icon name="UserPlus" className="w-5 h-5" />
                  Join Campaign
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-background-panel border border-border rounded-xl flex items-start gap-3">
            <Icon
              name="Info"
              className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
            />
            <div className="text-sm">
              <p className="text-text font-medium mb-1">When you join:</p>
              <ul className="text-text-muted space-y-1">
                <li>• You'll see content your GM shares with the party</li>
                <li>• Your character can be linked to the campaign</li>
                <li>• You can collaborate with other players</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Track External Game View
  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-12 bg-background relative overflow-auto">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Back Button */}
        <button
          onClick={() => setPath("select")}
          className="flex items-center gap-2 text-text-muted hover:text-text mb-6 transition-colors"
        >
          <Icon name="ArrowLeft" className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-4">
            <Icon name="BookOpen" className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">
            Track Your Campaign
          </h1>
          <p className="text-text-muted">
            Set up a local tracker for your character and campaign notes
          </p>
        </div>

        {/* Form */}
        <div className="bg-background-panel border border-border rounded-xl p-6 space-y-6">
          {/* Campaign Name */}
          <div>
            <label
              htmlFor="campaignName"
              className="block text-sm font-medium text-text mb-2"
            >
              Campaign Name
            </label>
            <input
              id="campaignName"
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Curse of Strahd, Dave's Homebrew"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
              autoFocus
            />
            <p className="text-xs text-text-muted mt-2">
              What does your GM call the campaign?
            </p>
          </div>

          {/* Game System */}
          <div>
            <label
              htmlFor="gameSystem"
              className="block text-sm font-medium text-text mb-2"
            >
              Game System
            </label>
            <select
              id="gameSystem"
              value={gameSystem}
              onChange={(e) => setGameSystem(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
            >
              {GAME_SYSTEMS.map((system) => (
                <option key={system} value={system}>
                  {system}
                </option>
              ))}
            </select>
          </div>

          {/* Character Name */}
          <div>
            <label
              htmlFor="characterName"
              className="block text-sm font-medium text-text mb-2"
            >
              Your Character's Name
            </label>
            <input
              id="characterName"
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="e.g., Thorin Ironforge"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
            />
            <p className="text-xs text-text-muted mt-2">
              You can add more details to your character sheet later
            </p>
          </div>

          {/* Error */}
          {createError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {createError}
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreateTracking}
            disabled={
              isCreating || !campaignName.trim() || !characterName.trim()
            }
            className="w-full px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <Icon name="Loader2" className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Icon name="Plus" className="w-5 h-5" />
                Create Campaign Tracker
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-background-panel border border-border rounded-xl flex items-start gap-3">
          <Icon
            name="Info"
            className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
          />
          <div className="text-sm">
            <p className="text-text font-medium mb-1">What you can do:</p>
            <ul className="text-text-muted space-y-1">
              <li>• Track your character stats, inventory, and spells</li>
              <li>• Take session notes and journal entries</li>
              <li>• Create NPCs, locations, and other content</li>
              <li>• Use the AI assistant for character advice</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
