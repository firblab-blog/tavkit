import { useEffect, useState } from "react";
import Icon from "../../common/Icon";
import {
  useAbilityTrackingStore,
  TrackedAbility,
  CreateAbilityRequest,
  COMMON_CLASS_FEATURES,
  RechargeType,
} from "../../../store/abilityTrackingStore";

interface AbilityTrackerProps {
  characterId?: string;
}

const RECHARGE_LABELS: Record<RechargeType, string> = {
  short_rest: "Short Rest",
  long_rest: "Long Rest",
  daily: "Daily",
  dawn: "At Dawn",
  per_turn: "Per Turn",
};

const RECHARGE_COLORS: Record<RechargeType, string> = {
  short_rest: "text-blue-400",
  long_rest: "text-purple-400",
  daily: "text-amber-400",
  dawn: "text-orange-400",
  per_turn: "text-emerald-400",
};

export default function AbilityTracker({ characterId }: AbilityTrackerProps) {
  const {
    abilities,
    loading,
    error,
    fetchAbilities,
    createAbility,
    deleteAbility,
    useAbility,
    resetAbility,
    shortRest,
    longRest,
  } = useAbilityTrackingStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newAbility, setNewAbility] = useState<CreateAbilityRequest>({
    ability_name: "",
    ability_type: "class_feature",
    max_uses: 1,
    recharge_type: "long_rest",
  });
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    if (characterId) {
      fetchAbilities(characterId);
    }
  }, [characterId, fetchAbilities]);

  const handleUse = (abilityId: string) => {
    if (characterId) {
      useAbility(characterId, abilityId);
    }
  };

  const handleReset = (abilityId: string) => {
    if (characterId) {
      resetAbility(characterId, abilityId);
    }
  };

  const handleDelete = (abilityId: string) => {
    if (characterId && window.confirm("Remove this ability from tracking?")) {
      deleteAbility(characterId, abilityId);
    }
  };

  const handleAddAbility = async () => {
    if (!characterId || !newAbility.ability_name.trim()) return;

    try {
      await createAbility(characterId, newAbility);
      setShowAddModal(false);
      setNewAbility({
        ability_name: "",
        ability_type: "class_feature",
        max_uses: 1,
        recharge_type: "long_rest",
      });
      setSelectedClass(null);
    } catch {
      // Error handled by store
    }
  };

  const handleAddClassFeature = async (feature: {
    name: string;
    maxUses: number;
    recharge: RechargeType;
  }) => {
    if (!characterId) return;

    try {
      await createAbility(characterId, {
        ability_name: feature.name,
        ability_type: "class_feature",
        max_uses: feature.maxUses,
        recharge_type: feature.recharge,
      });
    } catch {
      // Error handled by store
    }
  };

  const handleShortRest = () => {
    if (
      characterId &&
      window.confirm(
        "Take a short rest? This will restore short rest abilities.",
      )
    ) {
      shortRest(characterId);
    }
  };

  const handleLongRest = () => {
    if (
      characterId &&
      window.confirm(
        "Take a long rest? This will restore all abilities and spell slots.",
      )
    ) {
      longRest(characterId);
    }
  };

  if (!characterId) {
    return (
      <div className="text-center py-8 text-text-muted">
        Select a character to track abilities.
      </div>
    );
  }

  // Group abilities by recharge type
  const groupedAbilities = abilities.reduce<
    Record<RechargeType, TrackedAbility[]>
  >(
    (acc, ability) => {
      if (!acc[ability.recharge_type]) {
        acc[ability.recharge_type] = [];
      }
      acc[ability.recharge_type].push(ability);
      return acc;
    },
    {} as Record<RechargeType, TrackedAbility[]>,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-background-panel border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <Icon name="Zap" className="w-5 h-5 text-amber-400" />
            Abilities & Features
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-sm flex items-center gap-1 transition-colors"
          >
            <Icon name="Plus" className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Rest Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleShortRest}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="Clock" className="w-4 h-4" />
            Short Rest
          </button>
          <button
            onClick={handleLongRest}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="Moon" className="w-4 h-4" />
            Long Rest
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Empty State */}
      {abilities.length === 0 && (
        <div className="text-center py-8 bg-background-panel border border-border rounded-xl">
          <Icon name="Zap" className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h4 className="text-text font-medium mb-1">No Abilities Tracked</h4>
          <p className="text-text-muted text-sm mb-4">
            Add class features, racial abilities, or item charges to track.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
          >
            Add First Ability
          </button>
        </div>
      )}

      {/* Abilities by Recharge Type */}
      {Object.entries(groupedAbilities).map(([recharge, rechargeAbilities]) => (
        <div
          key={recharge}
          className="bg-background-panel border border-border rounded-xl p-4"
        >
          <h4
            className={`text-sm font-medium mb-3 ${RECHARGE_COLORS[recharge as RechargeType]}`}
          >
            {RECHARGE_LABELS[recharge as RechargeType]}
          </h4>
          <div className="space-y-2">
            {rechargeAbilities.map((ability) => (
              <div
                key={ability.id}
                className="flex items-center gap-3 p-3 bg-background rounded-lg"
              >
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className="text-text font-medium">
                    {ability.ability_name}
                  </span>
                  {ability.notes && (
                    <span className="text-text-muted text-sm ml-2">
                      ({ability.notes})
                    </span>
                  )}
                </div>

                {/* Usage indicators */}
                {ability.max_uses > 0 ? (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: ability.max_uses }).map((_, idx) => {
                      const isUsed = idx < ability.current_uses;
                      return (
                        <button
                          key={idx}
                          onClick={() =>
                            isUsed
                              ? handleReset(ability.id)
                              : handleUse(ability.id)
                          }
                          disabled={loading}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            isUsed
                              ? "bg-gray-600/30 border-gray-500/50 hover:border-amber-400"
                              : "bg-amber-500/20 border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/30"
                          }`}
                          title={isUsed ? "Click to restore" : "Click to use"}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-emerald-400 text-sm">Unlimited</span>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(ability.id)}
                  className="p-1 text-text-muted hover:text-red-400 transition-colors"
                >
                  <Icon name="Trash2" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add Ability Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setShowAddModal(false)
          }
        >
          <div className="bg-background-panel border border-border rounded-xl w-full max-w-md">
            {/* Header */}
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text">Add Ability</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-background rounded text-text-muted hover:text-text"
              >
                <Icon name="X" className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Quick Add from Class */}
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">
                  Quick Add from Class
                </label>
                <select
                  value={selectedClass || ""}
                  onChange={(e) => setSelectedClass(e.target.value || null)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
                >
                  <option value="">Select a class...</option>
                  {Object.keys(COMMON_CLASS_FEATURES).map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass &&
                COMMON_CLASS_FEATURES[selectedClass]?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {COMMON_CLASS_FEATURES[selectedClass].map((feature) => (
                      <button
                        key={feature.name}
                        onClick={() => handleAddClassFeature(feature)}
                        disabled={abilities.some(
                          (a) => a.ability_name === feature.name,
                        )}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + {feature.name}
                      </button>
                    ))}
                  </div>
                )}

              <div className="border-t border-border pt-4">
                <p className="text-sm text-text-muted mb-3">
                  Or add a custom ability:
                </p>

                {/* Name */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={newAbility.ability_name}
                    onChange={(e) =>
                      setNewAbility({
                        ...newAbility,
                        ability_name: e.target.value,
                      })
                    }
                    placeholder="Ability name"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Max Uses and Recharge */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">
                      Max Uses
                    </label>
                    <input
                      type="number"
                      value={newAbility.max_uses}
                      onChange={(e) =>
                        setNewAbility({
                          ...newAbility,
                          max_uses: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      min="0"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">
                      Recharge
                    </label>
                    <select
                      value={newAbility.recharge_type}
                      onChange={(e) =>
                        setNewAbility({
                          ...newAbility,
                          recharge_type: e.target.value as RechargeType,
                        })
                      }
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
                    >
                      <option value="short_rest">Short Rest</option>
                      <option value="long_rest">Long Rest</option>
                      <option value="daily">Daily</option>
                      <option value="dawn">At Dawn</option>
                      <option value="per_turn">Per Turn</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <input
                    type="text"
                    value={newAbility.notes || ""}
                    onChange={(e) =>
                      setNewAbility({ ...newAbility, notes: e.target.value })
                    }
                    placeholder="Notes (optional)"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-5 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-text-muted hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAbility}
                disabled={!newAbility.ability_name.trim() || loading}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Add Ability
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
