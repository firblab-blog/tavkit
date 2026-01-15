import { useState } from "react";
import Icon from "../common/Icon";
import type { IconName } from "../common/Icon";
import { SOCIAL_SKILLS } from "./SocialEncounters";

interface SkillCheckPanelProps {
  onAddCheck: (data: {
    character_name: string;
    skill: string;
    dc: number;
    roll: number;
    modifier: number;
    approach?: string;
  }) => void;
}

export default function SkillCheckPanel({ onAddCheck }: SkillCheckPanelProps) {
  const [characterName, setCharacterName] = useState("");
  const [skill, setSkill] = useState("Persuasion");
  const [dc, setDc] = useState(15);
  const [roll, setRoll] = useState<number | "">("");
  const [modifier, setModifier] = useState(0);
  const [approach, setApproach] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName.trim() || roll === "") return;

    onAddCheck({
      character_name: characterName.trim(),
      skill,
      dc,
      roll: roll as number,
      modifier,
      approach: approach.trim() || undefined,
    });

    // Reset form (keep character name and modifier for convenience)
    setRoll("");
    setApproach("");
  };

  const handleRollD20 = () => {
    const result = Math.floor(Math.random() * 20) + 1;
    setRoll(result);
  };

  const total = typeof roll === "number" ? roll + modifier : 0;
  const wouldSucceed = typeof roll === "number" && total >= dc;

  const getSkillIcon = (skillName: string): IconName => {
    switch (skillName) {
      case "Persuasion":
        return "Smile";
      case "Deception":
        return "Eye";
      case "Intimidation":
        return "Zap";
      case "Insight":
        return "Sparkles";
      case "Performance":
        return "Dices";
      default:
        return "MessageSquare";
    }
  };

  return (
    <div className="bg-background-panel border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-background/50 transition-colors"
      >
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Icon name="Dices" className="w-5 h-5 text-primary" />
          Record Skill Check
        </h3>
        <Icon
          name={isExpanded ? "ChevronUp" : "ChevronDown"}
          className="w-5 h-5 text-text-muted"
        />
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="p-4 pt-0 space-y-4">
          {/* Character Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Character
            </label>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Who is making the check?"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              required
            />
          </div>

          {/* Skill Selection */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Skill
            </label>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_SKILLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSkill(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    skill === s
                      ? "bg-primary text-background"
                      : "bg-background text-text-muted hover:text-text border border-border hover:border-primary/40"
                  }`}
                >
                  <Icon name={getSkillIcon(s)} className="w-3.5 h-3.5" />
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* DC and Roll */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                DC
              </label>
              <input
                type="number"
                value={dc}
                onChange={(e) => setDc(parseInt(e.target.value) || 10)}
                min={1}
                max={30}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-center focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Roll
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={roll}
                  onChange={(e) =>
                    setRoll(e.target.value ? parseInt(e.target.value) : "")
                  }
                  min={1}
                  max={20}
                  placeholder="d20"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text text-center placeholder:text-text-muted focus:border-primary focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={handleRollD20}
                  className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
                  title="Roll d20"
                >
                  <Icon name="Dices" className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Modifier
              </label>
              <input
                type="number"
                value={modifier}
                onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-center focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Total Preview */}
          {typeof roll === "number" && (
            <div
              className={`p-3 rounded-lg text-center ${
                wouldSucceed
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-red-500/10 border border-red-500/30"
              }`}
            >
              <span className="text-sm text-text-muted">Total: </span>
              <span
                className={`text-xl font-bold ${wouldSucceed ? "text-emerald-400" : "text-red-400"}`}
              >
                {total}
              </span>
              <span className="text-sm text-text-muted ml-2">
                ({roll} + {modifier}) vs DC {dc}
              </span>
              <span
                className={`ml-2 text-sm font-medium ${wouldSucceed ? "text-emerald-400" : "text-red-400"}`}
              >
                {wouldSucceed ? "✓ Success" : "✗ Failure"}
              </span>
            </div>
          )}

          {/* Approach (Optional) */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Approach <span className="text-text-muted">(optional)</span>
            </label>
            <input
              type="text"
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
              placeholder="What did they say or do?"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!characterName.trim() || roll === ""}
            className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Icon name="Plus" className="w-4 h-4" />
            Record Check
          </button>
        </form>
      )}
    </div>
  );
}
