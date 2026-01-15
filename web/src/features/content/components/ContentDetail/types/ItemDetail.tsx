// Item content detail view

interface DamageDice {
  count?: number;
  die?: number;
  bonus?: number;
}

interface ItemValue {
  amount?: number;
  currency?: string;
}

interface ItemWeight {
  amount?: number;
  unit?: string;
}

interface ItemProperties {
  damage_dice?: DamageDice;
  [key: string]: unknown;
}

interface ItemData {
  name: string;
  type: string;
  rarity?: string;
  requires_attunement?: boolean;
  description?: string;
  properties?: string | ItemProperties;
  origin?: string;
  curse?: string;
  value?: string | number | ItemValue;
  weight?: number | ItemWeight;
}

interface ItemDetailProps {
  item: ItemData;
}

function parseJSON<T>(value: string | T | undefined): T | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function getRarityClasses(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case "common":
      return "bg-gray-700/50 text-gray-300";
    case "uncommon":
      return "bg-green-900/30 text-green-400";
    case "rare":
      return "bg-blue-900/30 text-blue-400";
    case "very_rare":
      return "bg-purple-900/30 text-purple-400";
    case "legendary":
      return "bg-orange-900/30 text-orange-400";
    default:
      return "bg-primary/20 text-primary";
  }
}

function formatDamageDice(dice: DamageDice): string {
  if (dice.count && dice.die) {
    return `${dice.count}d${dice.die}${dice.bonus ? ` + ${dice.bonus}` : ""}`;
  }
  return JSON.stringify(dice);
}

function formatPropertyValue(key: string, val: unknown): string {
  if (key === "damage_dice" && typeof val === "object" && val !== null) {
    return formatDamageDice(val as DamageDice);
  }
  if (typeof val === "object" && val !== null) {
    return JSON.stringify(val);
  }
  return String(val);
}

export function ItemDetail({ item }: ItemDetailProps) {
  const properties = parseJSON<ItemProperties>(item.properties);
  const value = parseJSON<ItemValue>(item.value as string | ItemValue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-text mb-3">{item.name}</h2>
        <div className="flex gap-2 flex-wrap mb-3">
          <span className="px-3 py-1 bg-primary/30 text-text rounded-lg text-sm capitalize">
            {item.type}
          </span>
          {item.rarity && (
            <span
              className={`px-3 py-1 rounded-lg text-sm capitalize ${getRarityClasses(item.rarity)}`}
            >
              {item.rarity.replace("_", " ")}
            </span>
          )}
          {item.requires_attunement && (
            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm">
              Requires Attunement
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">
            Description
          </h3>
          <p className="text-text leading-relaxed whitespace-pre-wrap">
            {item.description}
          </p>
        </div>
      )}

      {/* Properties */}
      {properties && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Properties
          </h3>
          <div className="bg-surface p-4 rounded-lg border border-border space-y-2">
            {Object.entries(properties).map(([key, val]) => (
              <div key={key} className="flex justify-between">
                <span className="text-text-muted capitalize">
                  {key.replace(/_/g, " ")}
                </span>
                <span className="text-text">
                  {formatPropertyValue(key, val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Origin */}
      {item.origin && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Origin</h3>
          <p className="text-text leading-relaxed whitespace-pre-wrap">
            {item.origin}
          </p>
        </div>
      )}

      {/* Curse */}
      {item.curse && (
        <div>
          <h3 className="text-lg font-semibold text-red-400 mb-2">Curse</h3>
          <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30">
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {item.curse}
            </p>
          </div>
        </div>
      )}

      {/* Value & Weight */}
      {(value || item.value !== undefined || item.weight !== undefined) && (
        <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
          <div className="flex gap-6">
            {(value || item.value !== undefined) && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                  Value
                </div>
                <div className="text-text text-lg">
                  {typeof value === "object" && value !== null
                    ? `${value.amount} ${value.currency || "gp"}`
                    : typeof item.value === "number"
                      ? `${item.value} gp`
                      : value || String(item.value)}
                </div>
              </div>
            )}
            {item.weight !== undefined && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                  Weight
                </div>
                <div className="text-text text-lg">
                  {typeof item.weight === "object" &&
                  (item.weight as ItemWeight).amount
                    ? `${(item.weight as ItemWeight).amount} ${(item.weight as ItemWeight).unit || "lb"}`
                    : `${item.weight} lb`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
