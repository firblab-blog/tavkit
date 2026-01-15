import { useState } from "react";
import Icon from "../../common/Icon";
import { usePlayerCombatStore } from "../../../store/playerCombatStore";

interface HPTrackerProps {
  characterId: string;
}

export default function HPTracker({ characterId }: HPTrackerProps) {
  const { combat, adjustHP, setTempHP, setLocalCombat } =
    usePlayerCombatStore();
  const [hpChange, setHpChange] = useState("");
  const [tempHpInput, setTempHpInput] = useState("");
  const [mode, setMode] = useState<"damage" | "heal">("damage");

  const hpPercentage =
    combat.max_hp > 0 ? (combat.current_hp / combat.max_hp) * 100 : 0;

  const getHPColor = () => {
    if (hpPercentage > 50) return "bg-emerald-500";
    if (hpPercentage > 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleHPChange = async () => {
    const amount = parseInt(hpChange);
    if (isNaN(amount) || amount === 0) return;

    const actualAmount =
      mode === "damage" ? -Math.abs(amount) : Math.abs(amount);
    await adjustHP(characterId, actualAmount);
    setHpChange("");
  };

  const handleSetTempHP = async () => {
    const amount = parseInt(tempHpInput);
    if (isNaN(amount)) return;

    await setTempHP(characterId, amount);
    setTempHpInput("");
  };

  const handleMaxHPChange = (newMax: number) => {
    setLocalCombat({
      max_hp: Math.max(1, newMax),
      current_hp: Math.min(combat.current_hp, Math.max(1, newMax)),
    });
  };

  const handleCurrentHPChange = (newCurrent: number) => {
    setLocalCombat({
      current_hp: Math.max(0, Math.min(newCurrent, combat.max_hp)),
    });
  };

  return (
    <div className="space-y-4">
      {/* HP Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-sm">HP</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={combat.current_hp}
              onChange={(e) =>
                handleCurrentHPChange(parseInt(e.target.value) || 0)
              }
              className="w-16 px-2 py-1 bg-background border border-border rounded text-text text-center font-bold text-lg focus:outline-none focus:border-primary"
            />
            <span className="text-text-muted">/</span>
            <input
              type="number"
              value={combat.max_hp}
              onChange={(e) => handleMaxHPChange(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 bg-background border border-border rounded text-text text-center focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-4 bg-background rounded-full overflow-hidden">
          <div
            className={`h-full ${getHPColor()} transition-all duration-300`}
            style={{ width: `${Math.min(100, hpPercentage)}%` }}
          />
        </div>

        {/* Temp HP */}
        {combat.temp_hp > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Icon name="Shield" className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300">+{combat.temp_hp} Temp HP</span>
          </div>
        )}
      </div>

      {/* HP Adjustment */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("damage")}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              mode === "damage"
                ? "bg-red-500 text-white"
                : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
            }`}
          >
            Damage
          </button>
          <button
            onClick={() => setMode("heal")}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              mode === "heal"
                ? "bg-emerald-500 text-white"
                : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            }`}
          >
            Heal
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            value={hpChange}
            onChange={(e) => setHpChange(e.target.value)}
            placeholder="Amount"
            min="1"
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleHPChange();
            }}
          />
          <button
            onClick={handleHPChange}
            disabled={!hpChange}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              mode === "damage"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            Apply
          </button>
        </div>

        {/* Quick buttons */}
        <div className="flex gap-2 flex-wrap">
          {[1, 5, 10].map((amount) => (
            <button
              key={amount}
              onClick={() =>
                adjustHP(characterId, mode === "damage" ? -amount : amount)
              }
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === "damage"
                  ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                  : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              }`}
            >
              {mode === "damage" ? "-" : "+"}
              {amount}
            </button>
          ))}
        </div>
      </div>

      {/* Temp HP */}
      <div className="pt-3 border-t border-border">
        <label className="text-text-muted text-sm mb-2 block">
          Temporary HP
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={tempHpInput}
            onChange={(e) => setTempHpInput(e.target.value)}
            placeholder="Set temp HP"
            min="0"
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSetTempHP}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg font-medium transition-colors"
          >
            Set
          </button>
          {combat.temp_hp > 0 && (
            <button
              onClick={() => setTempHP(characterId, 0)}
              className="px-3 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
