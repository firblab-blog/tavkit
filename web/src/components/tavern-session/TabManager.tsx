import { useState } from "react";
import Icon from "../common/Icon";
import { TavernTab } from "./TavernSession";

interface TabManagerProps {
  tabs: TavernTab[];
  onAddTab: (data: {
    character_name: string;
    items_ordered: { name: string; price: string }[];
    total_cost: string;
  }) => void;
  onUpdateTab: (tabId: string, updates: Partial<TavernTab>) => void;
  disabled?: boolean;
}

export default function TabManager({
  tabs,
  onAddTab,
  onUpdateTab,
  disabled = false,
}: TabManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [characterName, setCharacterName] = useState("");
  const [items, setItems] = useState<{ name: string; price: string }[]>([
    { name: "", price: "" },
  ]);

  const handleAddItem = () => {
    setItems([...items, { name: "", price: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: "name" | "price",
    value: string,
  ) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateTotal = () => {
    let total = 0;
    for (const item of items) {
      const price = parseFloat(item.price.replace(/[^\d.]/g, ""));
      if (!isNaN(price)) {
        total += price;
      }
    }
    return total.toFixed(2);
  };

  const handleAddTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName.trim()) return;

    const validItems = items.filter(
      (item) => item.name.trim() && item.price.trim(),
    );
    if (validItems.length === 0) return;

    onAddTab({
      character_name: characterName.trim(),
      items_ordered: validItems,
      total_cost: `${calculateTotal()} gp`,
    });

    setCharacterName("");
    setItems([{ name: "", price: "" }]);
    setShowAddForm(false);
  };

  const unpaidTabs = tabs.filter((t) => !t.paid);
  const paidTabs = tabs.filter((t) => t.paid);

  const totalUnpaid = unpaidTabs.reduce((acc, tab) => {
    const cost = parseFloat(tab.total_cost.replace(/[^\d.]/g, ""));
    return acc + (isNaN(cost) ? 0 : cost);
  }, 0);

  return (
    <div className="bg-background-panel border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text flex items-center gap-2">
            <Icon name="Scroll" className="w-4 h-4 text-primary" />
            Tavern Tabs
          </h3>
          {totalUnpaid > 0 && (
            <p className="text-xs text-text-muted mt-0.5">
              Outstanding:{" "}
              <span className="text-primary font-medium">
                {totalUnpaid.toFixed(2)} gp
              </span>
            </p>
          )}
        </div>
        {!disabled && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1.5 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-primary"
          >
            <Icon name={showAddForm ? "X" : "Plus"} className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Add Tab Form */}
      {showAddForm && !disabled && (
        <form
          onSubmit={handleAddTab}
          className="p-4 border-b border-border bg-background/50"
        >
          <div className="space-y-3">
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Character name..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              autoFocus
            />

            <div className="space-y-2">
              <label className="block text-xs text-text-muted">
                Items Ordered
              </label>
              {items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      handleItemChange(index, "name", e.target.value)
                    }
                    placeholder="Item name..."
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={item.price}
                    onChange={(e) =>
                      handleItemChange(index, "price", e.target.value)
                    }
                    placeholder="Price"
                    className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-text-muted text-center focus:border-primary focus:outline-none"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Icon name="X" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddItem}
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                <Icon name="Plus" className="w-3 h-3" />
                Add item
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-text-muted">Total:</span>
              <span className="font-bold text-text">{calculateTotal()} gp</span>
            </div>

            <button
              type="submit"
              disabled={
                !characterName.trim() ||
                items.filter((i) => i.name && i.price).length === 0
              }
              className="w-full px-3 py-2 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Create Tab
            </button>
          </div>
        </form>
      )}

      {/* Tabs List */}
      {tabs.length === 0 ? (
        <div className="p-6 text-center text-text-muted">
          <Icon name="Scroll" className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No tabs started yet</p>
          <p className="text-sm mt-1">Track character orders and payments</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {/* Unpaid Tabs */}
          {unpaidTabs.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-amber-500/10 text-xs font-medium text-amber-400 uppercase">
                Unpaid ({unpaidTabs.length})
              </div>
              {unpaidTabs.map((tab) => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  onUpdate={(updates) => onUpdateTab(tab.id, updates)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}

          {/* Paid Tabs */}
          {paidTabs.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-emerald-500/10 text-xs font-medium text-emerald-400 uppercase">
                Paid ({paidTabs.length})
              </div>
              {paidTabs.map((tab) => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  onUpdate={(updates) => onUpdateTab(tab.id, updates)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabItem({
  tab,
  onUpdate,
  disabled,
}: {
  tab: TavernTab;
  onUpdate: (updates: Partial<TavernTab>) => void;
  disabled?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const items = Array.isArray(tab.items_ordered) ? tab.items_ordered : [];

  return (
    <div className={`p-4 ${tab.paid ? "bg-emerald-500/5" : ""}`}>
      <div className="flex items-center gap-3">
        {/* Paid Toggle */}
        <button
          onClick={() => !disabled && onUpdate({ paid: !tab.paid })}
          disabled={disabled}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            tab.paid
              ? "bg-emerald-500 border-emerald-500"
              : "border-border hover:border-emerald-500/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          title={tab.paid ? "Mark as unpaid" : "Mark as paid"}
        >
          {tab.paid && <Icon name="Check" className="w-3 h-3 text-white" />}
        </button>

        {/* Tab Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-text">{tab.character_name}</span>
            <span
              className={`font-bold ${tab.paid ? "text-emerald-400" : "text-primary"}`}
            >
              {tab.total_cost}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-background rounded transition-colors text-text-muted"
        >
          <Icon
            name={isExpanded ? "ChevronUp" : "ChevronDown"}
            className="w-4 h-4"
          />
        </button>
      </div>

      {/* Expanded Items */}
      {isExpanded && (
        <div className="mt-3 pl-9">
          <div className="bg-background rounded-lg p-3 space-y-1">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-text-muted">{item.name}</span>
                <span className="text-text">{item.price}</span>
              </div>
            ))}
            <div className="border-t border-border pt-1 mt-2 flex items-center justify-between font-medium">
              <span className="text-text-muted">Total</span>
              <span className="text-text">{tab.total_cost}</span>
            </div>
          </div>
          {tab.notes && (
            <p className="text-xs text-text-muted mt-2 italic">{tab.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
