import { useMemo } from "react";
import type { ChaseParticipant } from "../../types/chase";
import { getParticipantIcon } from "../../types/chase";

interface DistanceTrackerProps {
  participants: ChaseParticipant[];
  catchThreshold: number;
  escapeThreshold: number;
  terrain: string;
}

export default function DistanceTracker({
  participants,
  catchThreshold,
  escapeThreshold,
  terrain,
}: DistanceTrackerProps) {
  // Calculate the track length and positions
  const trackData = useMemo(() => {
    const pursuers = participants.filter((p) => p.role === "pursuer");
    const quarry = participants.filter((p) => p.role === "quarry");

    if (pursuers.length === 0 || quarry.length === 0) {
      return { spaces: 10, participants: [] };
    }

    // Calculate average positions
    const pursuerAvg =
      pursuers.reduce((sum, p) => sum + p.current_position, 0) /
      pursuers.length;
    const quarryAvg =
      quarry.reduce((sum, p) => sum + p.current_position, 0) / quarry.length;

    // Determine track range
    const minPos = Math.min(pursuerAvg, quarryAvg) - 2;
    const maxPos = Math.max(pursuerAvg, quarryAvg) + 2;
    const trackLength = Math.max(escapeThreshold + 3, maxPos - minPos + 4);

    // Map participants to track positions
    const participantPositions = participants.map((p) => ({
      ...p,
      relativePosition: ((p.current_position - minPos) / trackLength) * 100,
    }));

    return {
      spaces: Math.ceil(trackLength),
      participants: participantPositions,
      catchPosition: (catchThreshold / trackLength) * 100,
      escapePosition: (escapeThreshold / trackLength) * 100,
    };
  }, [participants, catchThreshold, escapeThreshold]);

  // Get terrain emoji/icon
  const terrainIcon = useMemo(() => {
    const icons: Record<string, string> = {
      urban: "🏙️",
      rooftops: "🏘️",
      forest: "🌲",
      mountains: "⛰️",
      desert: "🏜️",
      swamp: "🐊",
      snow: "❄️",
      underground: "⚒️",
      waterways: "🌊",
      magical: "✨",
    };
    return icons[terrain] || "🗺️";
  }, [terrain]);

  return (
    <div className="p-6 bg-stone-800/50 rounded-lg border border-stone-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
          <span className="text-2xl">{terrainIcon}</span>
          Distance Track
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-stone-400">Catch ({catchThreshold})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-stone-400">Escape ({escapeThreshold})</span>
          </div>
        </div>
      </div>

      {/* Visual Track */}
      <div className="relative">
        {/* Track Base */}
        <div className="h-16 bg-gradient-to-r from-stone-700 via-stone-600 to-stone-700 rounded-lg relative overflow-hidden border-2 border-stone-600">
          {/* Distance markers */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: trackData.spaces }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-stone-700/50 last:border-r-0"
              />
            ))}
          </div>

          {/* Catch threshold indicator */}
          {catchThreshold > 0 && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-green-500/50"
              style={{ left: `${trackData.catchPosition}%` }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-green-400 font-medium whitespace-nowrap">
                Catch
              </div>
            </div>
          )}

          {/* Escape threshold indicator */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-red-500/50"
            style={{ left: `${trackData.escapePosition}%` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-red-400 font-medium whitespace-nowrap">
              Escape
            </div>
          </div>

          {/* Participant tokens */}
          {trackData.participants.map((p) => (
            <div
              key={p.id}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-in-out"
              style={{ left: `${p.relativePosition}%` }}
              title={`${p.name} - ${p.role}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
                  p.role === "quarry"
                    ? "bg-amber-600 border-amber-400 shadow-lg shadow-amber-500/50"
                    : "bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/50"
                } ${p.stamina === 0 ? "opacity-50 grayscale" : ""}`}
              >
                {getParticipantIcon(p)}
              </div>

              {/* Movement indicator */}
              {p.movement_this_round !== 0 && (
                <div
                  className={`absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap ${
                    p.movement_this_round > 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {p.movement_this_round > 0 ? "+" : ""}
                  {p.movement_this_round}
                </div>
              )}

              {/* Name label */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-stone-300 whitespace-nowrap font-medium">
                {p.name}
              </div>
            </div>
          ))}
        </div>

        {/* Space labels */}
        <div className="flex justify-between mt-12 px-2 text-xs text-stone-500">
          <span>0</span>
          <span>{Math.floor(trackData.spaces / 2)}</span>
          <span>{trackData.spaces}</span>
        </div>
      </div>

      {/* Distance info */}
      <div className="mt-6 flex items-center justify-center gap-8 text-sm">
        {trackData.participants
          .filter((p) => p.role === "quarry")
          .map((quarry) => {
            const pursuers = trackData.participants.filter(
              (p) => p.role === "pursuer",
            );
            const avgPursuerPos =
              pursuers.reduce((sum, p) => sum + p.current_position, 0) /
              pursuers.length;
            const distance = Math.abs(quarry.current_position - avgPursuerPos);

            return (
              <div key={quarry.id} className="text-center">
                <div className="text-stone-400">Distance to {quarry.name}</div>
                <div className="text-2xl font-bold text-amber-400">
                  {distance.toFixed(1)} spaces
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  ~{Math.round(distance * 30)}-{Math.round(distance * 60)} feet
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
