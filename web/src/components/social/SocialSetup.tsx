import { useState } from "react";
import Icon from "../common/Icon";
import { ENCOUNTER_TYPES } from "./SocialEncounters";

interface SocialSetupProps {
  onStart: (data: {
    name: string;
    encounter_type: string;
    goal: string;
    starting_mood: number;
    success_threshold: number;
    npc_id?: string;
    dialogue_id?: string;
  }) => void;
  isLoading: boolean;
}

export default function SocialSetup({ onStart, isLoading }: SocialSetupProps) {
  const [name, setName] = useState("");
  const [encounterType, setEncounterType] = useState("negotiation");
  const [goal, setGoal] = useState("");
  const [startingMood, setStartingMood] = useState(0);
  const [successThreshold, setSuccessThreshold] = useState(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !goal.trim()) return;

    onStart({
      name: name.trim(),
      encounter_type: encounterType,
      goal: goal.trim(),
      starting_mood: startingMood,
      success_threshold: successThreshold,
    });
  };

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

  return (
    <div className="bg-background-panel border border-border rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-bold text-text flex items-center gap-2">
          <Icon name="Users" className="w-5 h-5 text-primary" />
          Start Social Encounter
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Set up a social encounter to track negotiations, persuasion attempts,
          and other social challenges.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Encounter Name */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Encounter Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Negotiating with the Merchant Prince"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            required
          />
        </div>

        {/* Encounter Type */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Encounter Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ENCOUNTER_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setEncounterType(type.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  encounterType === type.value
                    ? "border-primary bg-primary/10 text-text"
                    : "border-border text-text-muted hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon name={type.icon} className="w-4 h-4" />
                  <span className="font-medium">{type.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Goal
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What is the party trying to achieve?"
            className="w-full h-24 px-4 py-3 bg-background border border-border rounded-lg text-text placeholder:text-text-muted resize-none focus:border-primary focus:outline-none"
            required
          />
        </div>

        {/* Starting Mood */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Starting NPC Mood:{" "}
            <span className={getMoodColor(startingMood)}>
              {getMoodLabel(startingMood)}
            </span>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="-5"
              max="5"
              value={startingMood}
              onChange={(e) => setStartingMood(parseInt(e.target.value))}
              className="flex-1"
            />
            <span
              className={`w-16 text-center font-bold text-lg ${getMoodColor(startingMood)}`}
            >
              {startingMood > 0 ? "+" : ""}
              {startingMood}
            </span>
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>Hostile</span>
            <span>Helpful</span>
          </div>
        </div>

        {/* Success Threshold */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Successes Needed: {successThreshold}
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="10"
              value={successThreshold}
              onChange={(e) => setSuccessThreshold(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="w-16 text-center font-bold text-lg text-primary">
              {successThreshold}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            The party needs {successThreshold} successful checks to achieve
            their goal. 3 failures or reaching -5 mood ends the encounter
            unfavorably.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !name.trim() || !goal.trim()}
          className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Icon name="Loader2" className="w-5 h-5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Icon name="Play" className="w-5 h-5" />
              Begin Encounter
            </>
          )}
        </button>
      </form>
    </div>
  );
}
