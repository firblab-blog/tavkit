import { useState } from "react";
import Icon from "../common/Icon";
import { RELATIONSHIP_LEVELS } from "./ShoppingSession";

interface ShoppingSetupProps {
  onStart: (data: {
    merchant_id: string;
    merchant_name: string;
    relationship_level: string;
    merchant_mood: number;
  }) => void;
  isLoading: boolean;
}

export default function ShoppingSetup({
  onStart,
  isLoading,
}: ShoppingSetupProps) {
  const [merchantName, setMerchantName] = useState("");
  const [relationshipLevel, setRelationshipLevel] = useState("neutral");
  const [merchantMood, setMerchantMood] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantName.trim()) return;

    onStart({
      merchant_id: `merchant-${Date.now()}`,
      merchant_name: merchantName.trim(),
      relationship_level: relationshipLevel,
      merchant_mood: merchantMood,
    });
  };

  const getMoodLabel = (mood: number) => {
    if (mood <= -4) return "Hostile";
    if (mood <= -2) return "Irritated";
    if (mood <= 0) return "Neutral";
    if (mood <= 2) return "Pleasant";
    return "Delighted";
  };

  const getMoodColor = (mood: number) => {
    if (mood <= -4) return "text-red-500";
    if (mood <= -2) return "text-orange-500";
    if (mood <= 0) return "text-gray-400";
    if (mood <= 2) return "text-emerald-500";
    return "text-blue-500";
  };

  const selectedRelationship = RELATIONSHIP_LEVELS.find(
    (r) => r.value === relationshipLevel,
  );

  return (
    <div className="bg-background-panel border border-border rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-bold text-text flex items-center gap-2">
          <Icon name="Store" className="w-5 h-5 text-primary" />
          Start Shopping Session
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Track purchases, haggle for discounts, and manage merchant
          relationships.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Merchant Name */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Merchant/Shop Name
          </label>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="e.g., Barthen's Provisions, The Magic Shoppe"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            required
          />
        </div>

        {/* Relationship Level */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Relationship with Party
            {selectedRelationship && (
              <span className="ml-2 text-xs text-text-muted">
                ({selectedRelationship.discount > 0 ? "+" : ""}
                {selectedRelationship.discount}% price adjustment)
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIP_LEVELS.map((rel) => (
              <button
                key={rel.value}
                type="button"
                onClick={() => setRelationshipLevel(rel.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  relationshipLevel === rel.value
                    ? rel.color + " border-current"
                    : "border-border text-text-muted hover:border-primary/40"
                }`}
              >
                {rel.label}
              </button>
            ))}
          </div>
        </div>

        {/* Merchant Mood */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Starting Mood:{" "}
            <span className={getMoodColor(merchantMood)}>
              {getMoodLabel(merchantMood)}
            </span>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="-5"
              max="5"
              value={merchantMood}
              onChange={(e) => setMerchantMood(parseInt(e.target.value))}
              className="flex-1"
            />
            <span
              className={`w-16 text-center font-bold text-lg ${getMoodColor(merchantMood)}`}
            >
              {merchantMood > 0 ? "+" : ""}
              {merchantMood}
            </span>
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>Hostile</span>
            <span>Delighted</span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !merchantName.trim()}
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
              Begin Shopping
            </>
          )}
        </button>
      </form>
    </div>
  );
}
