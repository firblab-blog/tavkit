import { useState, useEffect } from "react";
import Icon from "../common/Icon";
import ItemReference from "../common/ItemReference";
import { useItemStore } from "../../store/itemStore";

interface TreasureItem {
  item_id: string;
  quantity: number;
  notes?: string;
}

interface LocationTreasureProps {
  treasure: TreasureItem[];
  onChange: (treasure: TreasureItem[]) => void;
  isEditing?: boolean;
}

/**
 * Treasure editor for Locations.
 * Displays treasure items as clickable badges and allows adding/removing items.
 */
export default function LocationTreasure({
  treasure,
  onChange,
  isEditing = false,
}: LocationTreasureProps) {
  const { items, fetchItems } = useItemStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [newQuantity, setNewQuantity] = useState(1);
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    // Fetch items if not loaded
    if (items.length === 0) {
      fetchItems();
    }
  }, [items.length, fetchItems]);

  const handleRemoveItem = (itemId: string) => {
    onChange(treasure.filter((item) => item.item_id !== itemId));
  };

  const handleAddItem = () => {
    if (!selectedItemId) return;

    // Check if item already exists
    const existingIndex = treasure.findIndex(
      (i) => i.item_id === selectedItemId,
    );
    if (existingIndex >= 0) {
      // Update quantity
      const updated = [...treasure];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + newQuantity,
        notes: newNotes || updated[existingIndex].notes,
      };
      onChange(updated);
    } else {
      // Add new item
      onChange([
        ...treasure,
        {
          item_id: selectedItemId,
          quantity: newQuantity,
          notes: newNotes || undefined,
        },
      ]);
    }

    // Reset modal
    setShowAddModal(false);
    setSelectedItemId(null);
    setNewQuantity(1);
    setNewNotes("");
    setSearchQuery("");
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (treasure.length === 0 && !isEditing) {
    return (
      <div className="text-text-muted text-sm italic">
        No treasure at this location
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Treasure items */}
      <div className="flex flex-wrap gap-2">
        {treasure.map((treasureItem) => (
          <ItemReference
            key={treasureItem.item_id}
            itemId={treasureItem.item_id}
            quantity={treasureItem.quantity}
            notes={treasureItem.notes}
            onRemove={
              isEditing
                ? () => handleRemoveItem(treasureItem.item_id)
                : undefined
            }
          />
        ))}

        {isEditing && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm
              bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30
              transition-colors"
          >
            <Icon name="Plus" className="w-3.5 h-3.5" />
            Add Treasure
          </button>
        )}
      </div>

      {/* Add treasure modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-card border border-border rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="Gem" className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-text">
                  Add Treasure
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-tavern-dark rounded transition-colors"
              >
                <Icon name="X" className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Icon
                  name="Search"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-text"
                />
              </div>

              {/* Item list */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredItems.length === 0 ? (
                  <div className="text-center text-text-muted py-4">
                    No items found. Create items in the Item Vault first.
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                        selectedItemId === item.id
                          ? "bg-amber-500/20 border border-amber-500/50"
                          : "hover:bg-tavern-dark border border-transparent"
                      }`}
                    >
                      <Icon name="Gem" className="w-4 h-4 text-amber-400" />
                      <span className="flex-1 text-text">{item.name}</span>
                      <span className="text-xs text-text-muted capitalize">
                        {item.rarity?.replace(/_/g, " ")}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Quantity and notes */}
              {selectedItemId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted block mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={newQuantity}
                      onChange={(e) =>
                        setNewQuantity(parseInt(e.target.value) || 1)
                      }
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-text"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="e.g., in locked chest"
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-text"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-text-muted hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!selectedItemId}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white rounded-lg transition-colors"
              >
                Add Treasure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
