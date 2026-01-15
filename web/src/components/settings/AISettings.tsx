import { useState, useEffect } from "react";
import Icon from "../common/Icon";
import { authFetch } from "@/utils/authFetch";
import AIConfiguration from "../admin/AIConfiguration";
import { GAME_SYSTEMS } from "../../constants/gameSystems";

export default function AISettings() {
  const [gameSystem, setGameSystem] = useState(
    "Dungeons & Dragons 5th Edition",
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await authFetch("/api/v1/users/me");
      const userData = await res.json();
      if (userData.game_system) {
        setGameSystem(userData.game_system);
      }
    } catch {
      // Use default if fetch fails
    }
  };

  const handleSaveGameSystem = async () => {
    setSuccess("");
    setError("");
    setSaving(true);

    try {
      const res = await authFetch("/api/v1/users/me", {
        method: "PUT",
        body: JSON.stringify({
          game_system: gameSystem,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save game system");
      }

      setSuccess(
        "Game system saved! This will be applied to all artificer toolkit generators.",
      );
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save game system",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Global Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <Icon name="AlertCircle" className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <Icon name="Check" className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Game System */}
      <section>
        <h3 className="text-lg font-semibold text-text mb-2">Game System</h3>
        <p className="text-sm text-text-muted mb-4">
          Set the default RPG system for AI-generated content
        </p>

        <div className="space-y-2">
          {GAME_SYSTEMS.map((system) => (
            <button
              key={system}
              onClick={() => setGameSystem(system)}
              className={`w-full px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left ${
                gameSystem === system
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-background hover:border-primary/40 text-text"
              }`}
            >
              {system}
            </button>
          ))}
        </div>

        <button
          onClick={handleSaveGameSystem}
          disabled={saving}
          className="mt-4 px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? "Saving..." : "Save Game System"}
        </button>
      </section>

      {/* AI Configuration Component */}
      <AIConfiguration />
    </div>
  );
}
