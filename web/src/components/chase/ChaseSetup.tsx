import { useState } from "react";
import Icon from "../common/Icon";
import CampaignSelector from "../common/CampaignSelector";
import { useCampaignStore } from "../../store/campaignStore";
import {
  CHASE_TYPES,
  TERRAIN_TYPES,
  DIFFICULTY_LEVELS,
  type CreateChaseRequest,
} from "../../types/chase";
import { apiClient } from "@/api/client";
import { logger } from "@/utils/logger";

interface ChaseSetupProps {
  onStartChase?: (chaseId: string) => void;
  onCancel: () => void;
}

export default function ChaseSetup({
  onStartChase,
  onCancel,
}: ChaseSetupProps) {
  const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [chaseType, setChaseType] = useState("foot_chase");
  const [terrain, setTerrain] = useState("urban");
  const [difficulty, setDifficulty] = useState("medium");
  const [description, setDescription] = useState("");
  const [startingDistance, setStartingDistance] = useState(3);
  const [catchThreshold, setCatchThreshold] = useState(0);
  const [escapeThreshold, setEscapeThreshold] = useState(7);
  const [maxRounds, setMaxRounds] = useState<number | undefined>(undefined);
  const [hasTimeLimit, setHasTimeLimit] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const request: CreateChaseRequest = {
        campaign_id: activeCampaignId || undefined,
        name,
        chase_type: chaseType,
        terrain,
        difficulty,
        description: description || undefined,
        starting_distance: startingDistance,
        catch_threshold: catchThreshold,
        escape_threshold: escapeThreshold,
        max_rounds: hasTimeLimit ? maxRounds : undefined,
      };

      logger.debug("Creating chase:", request);

      const response = await apiClient.post("/chases", request);

      if (onStartChase) {
        onStartChase(response.data.id);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || "Failed to create chase",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <Icon
              name="AlertCircle"
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
            />
            <div className="flex-1">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* TODO: Template Selection UI */}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="p-4 bg-background-panel rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-text mb-4">
              Basic Information
            </h3>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="campaignSelect"
                  className="block text-sm font-medium text-text mb-2"
                >
                  Campaign (Optional)
                </label>
                <CampaignSelector
                  selectedCampaignId={activeCampaignId || null}
                  onSelect={() => {
                    /* Campaign selection handled by store */
                  }}
                />
              </div>

              {/* Chase Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-text mb-2"
                >
                  Chase Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Rooftop Pursuit, Forest Hunt"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>
          </div>

          {/* Chase Type & Terrain */}
          <div className="p-4 bg-background-panel rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-text mb-4">
              Chase Configuration
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="chaseType"
                    className="block text-sm font-medium text-text mb-2"
                  >
                    Chase Type *
                  </label>
                  <select
                    id="chaseType"
                    value={chaseType}
                    onChange={(e) => setChaseType(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
                  >
                    {CHASE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="terrain"
                    className="block text-sm font-medium text-text mb-2"
                  >
                    Terrain *
                  </label>
                  <select
                    id="terrain"
                    value={terrain}
                    onChange={(e) => setTerrain(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
                  >
                    {TERRAIN_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label
                  htmlFor="difficulty"
                  className="block text-sm font-medium text-text mb-2"
                >
                  Difficulty *
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
                >
                  {DIFFICULTY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-text mb-2"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the chase scenario..."
                  rows={3}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Distance Settings */}
          <div className="p-4 bg-background-panel rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <Icon name="MapPin" className="w-5 h-5 text-primary" />
              Distance Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="startingDistance"
                  className="block text-sm font-medium text-text mb-2"
                >
                  Starting Distance: {startingDistance} spaces
                </label>
                <input
                  type="range"
                  id="startingDistance"
                  min="1"
                  max="10"
                  value={startingDistance}
                  onChange={(e) =>
                    setStartingDistance(parseInt(e.target.value))
                  }
                  className="w-full"
                />
                <p className="text-xs text-text-muted mt-1">
                  Initial gap between pursuer and quarry (~
                  {startingDistance * 30}-{startingDistance * 60} feet)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="catchThreshold"
                    className="block text-sm font-medium text-text mb-2"
                  >
                    Catch at: {catchThreshold} spaces
                  </label>
                  <input
                    type="range"
                    id="catchThreshold"
                    min="0"
                    max="2"
                    value={catchThreshold}
                    onChange={(e) =>
                      setCatchThreshold(parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Distance to catch quarry
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="escapeThreshold"
                    className="block text-sm font-medium text-text mb-2"
                  >
                    Escape at: {escapeThreshold} spaces
                  </label>
                  <input
                    type="range"
                    id="escapeThreshold"
                    min="5"
                    max="15"
                    value={escapeThreshold}
                    onChange={(e) =>
                      setEscapeThreshold(parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Distance for quarry to escape
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Time Limit */}
          <div className="p-4 bg-background-panel rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="hasTimeLimit"
                checked={hasTimeLimit}
                onChange={(e) => setHasTimeLimit(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
              />
              <label
                htmlFor="hasTimeLimit"
                className="text-sm font-medium text-text"
              >
                Enable Time Limit
              </label>
            </div>

            {hasTimeLimit && (
              <div>
                <label
                  htmlFor="maxRounds"
                  className="block text-sm font-medium text-text mb-2"
                >
                  Maximum Rounds
                </label>
                <input
                  type="number"
                  id="maxRounds"
                  value={maxRounds || 5}
                  onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                  min="1"
                  max="20"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-text-muted mt-1">
                  Chase ends after this many rounds (gates close, reinforcements
                  arrive, etc.)
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-background-panel hover:bg-tavern-dark text-text rounded-lg transition-colors border border-border"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name}
                className="px-6 py-2 bg-primary hover:bg-primary/80 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Icon name="ChevronRight" className="w-4 h-4" />
                    Start Chase
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
