import { useState } from "react";
import Icon from "../../common/Icon";

interface JoinCombatModalProps {
  readonly characterId: string;
  readonly characterName: string;
  readonly initiativeBonus: number;
  readonly combatName: string;
  readonly onJoin: (initiative: number) => Promise<void>;
  readonly onClose: () => void;
}

export default function JoinCombatModal({
  characterName,
  initiativeBonus,
  combatName,
  onJoin,
  onClose,
}: JoinCombatModalProps) {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [manualRoll, setManualRoll] = useState("");
  const [autoRoll, setAutoRoll] = useState<number | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const rollInitiative = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    setAutoRoll(roll);
    return roll;
  };

  const handleJoin = async () => {
    let initiative: number;

    if (mode === "auto") {
      const roll = autoRoll ?? rollInitiative();
      initiative = roll + initiativeBonus;
    } else {
      const roll = Number.parseInt(manualRoll);
      if (Number.isNaN(roll) || roll < 1 || roll > 20) {
        return;
      }
      initiative = roll + initiativeBonus;
    }

    setIsJoining(true);
    try {
      await onJoin(initiative);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setIsJoining(false);
    }
  };

  const totalInitiative =
    mode === "auto"
      ? (autoRoll ?? 0) + initiativeBonus
      : (Number.parseInt(manualRoll) || 0) + initiativeBonus;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background-panel border border-border rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Icon name="Swords" className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text">Join Combat</h3>
                <p className="text-sm text-text-muted">{combatName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text transition-colors"
            >
              <Icon name="X" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Character Info */}
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Character</p>
                <p className="font-medium text-text">{characterName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-muted">Initiative Bonus</p>
                <p className="font-bold text-primary">+{initiativeBonus}</p>
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-text">
              Roll Initiative
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("auto")}
                className={`p-3 rounded-lg border transition-all ${
                  mode === "auto"
                    ? "border-primary bg-primary/10 text-text"
                    : "border-border hover:border-text-muted text-text-muted"
                }`}
              >
                <Icon name="Dices" className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Auto Roll</span>
              </button>
              <button
                onClick={() => setMode("manual")}
                className={`p-3 rounded-lg border transition-all ${
                  mode === "manual"
                    ? "border-primary bg-primary/10 text-text"
                    : "border-border hover:border-text-muted text-text-muted"
                }`}
              >
                <Icon name="Edit" className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Manual</span>
              </button>
            </div>
          </div>

          {/* Initiative Input */}
          {mode === "auto" ? (
            <div className="space-y-3">
              <button
                onClick={rollInitiative}
                disabled={isJoining}
                className="w-full py-3 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Icon name="Dices" className="w-5 h-5" />
                {autoRoll === null ? "Roll d20" : "Reroll"}
              </button>

              {autoRoll !== null && (
                <div className="bg-background rounded-lg p-4 border border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-muted">d20 Roll</p>
                      <p className="text-2xl font-bold text-text">{autoRoll}</p>
                    </div>
                    <div className="text-2xl text-text-muted">+</div>
                    <div>
                      <p className="text-sm text-text-muted">Bonus</p>
                      <p className="text-2xl font-bold text-primary">
                        +{initiativeBonus}
                      </p>
                    </div>
                    <div className="text-2xl text-text-muted">=</div>
                    <div>
                      <p className="text-sm text-text-muted">Total</p>
                      <p className="text-3xl font-bold text-primary">
                        {totalInitiative}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm text-text-muted">
                Enter your d20 roll (1-20)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={manualRoll}
                onChange={(e) => setManualRoll(e.target.value)}
                placeholder="Roll result..."
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none text-center text-2xl font-bold"
                autoFocus
              />

              {manualRoll && !Number.isNaN(Number.parseInt(manualRoll)) && (
                <div className="bg-background rounded-lg p-4 border border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-muted">d20 Roll</p>
                      <p className="text-2xl font-bold text-text">
                        {Number.parseInt(manualRoll)}
                      </p>
                    </div>
                    <div className="text-2xl text-text-muted">+</div>
                    <div>
                      <p className="text-sm text-text-muted">Bonus</p>
                      <p className="text-2xl font-bold text-primary">
                        +{initiativeBonus}
                      </p>
                    </div>
                    <div className="text-2xl text-text-muted">=</div>
                    <div>
                      <p className="text-sm text-text-muted">Total</p>
                      <p className="text-3xl font-bold text-primary">
                        {totalInitiative}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isJoining}
            className="px-4 py-2 text-text-muted hover:text-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={
              isJoining ||
              (mode === "auto" && autoRoll === null) ||
              (mode === "manual" &&
                (!manualRoll || Number.isNaN(Number.parseInt(manualRoll))))
            }
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-2"
          >
            {isJoining ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Icon name="Swords" className="w-4 h-4" />
                Join Combat
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
