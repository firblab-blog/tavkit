import { useState } from "react";
import Icon from "../../common/Icon";
import NPCsMet from "./NPCsMet";
import LocationsVisited from "./LocationsVisited";
import RevealedContent from "../reveals/RevealedContent";

type SubTab = "npcs" | "locations" | "gm_shared";

export default function EncountersTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("npcs");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text flex items-center gap-2">
          <Icon name="Users" className="w-5 h-5 text-blue-400" />
          Encounters
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Keep track of NPCs you&apos;ve met and locations you&apos;ve visited.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveSubTab("npcs")}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2
            ${
              activeSubTab === "npcs"
                ? "text-blue-400 border-b-2 border-blue-400 -mb-[3px]"
                : "text-text-muted hover:text-text"
            }`}
        >
          <Icon name="User" className="w-4 h-4" />
          NPCs Met
        </button>
        <button
          onClick={() => setActiveSubTab("locations")}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2
            ${
              activeSubTab === "locations"
                ? "text-emerald-400 border-b-2 border-emerald-400 -mb-[3px]"
                : "text-text-muted hover:text-text"
            }`}
        >
          <Icon name="MapPin" className="w-4 h-4" />
          Locations Visited
        </button>
        <button
          onClick={() => setActiveSubTab("gm_shared")}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2
            ${
              activeSubTab === "gm_shared"
                ? "text-purple-400 border-b-2 border-purple-400 -mb-[3px]"
                : "text-text-muted hover:text-text"
            }`}
        >
          <Icon name="Eye" className="w-4 h-4" />
          GM Shared
        </button>
      </div>

      {/* Content */}
      {activeSubTab === "npcs" && <NPCsMet />}
      {activeSubTab === "locations" && <LocationsVisited />}
      {activeSubTab === "gm_shared" && <RevealedContent />}
    </div>
  );
}
