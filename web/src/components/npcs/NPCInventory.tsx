import { useState, useEffect } from "react";
import Icon from "../common/Icon";
import ItemReference from "../common/ItemReference";
import { useItemStore } from "../../store/itemStore";

interface InventoryItem {
  item_id: string;
  quantity: number;
  notes?: string;
}

interface NPCInventoryProps {
  inventory: InventoryItem[];
  onChange: (inventory: InventoryItem[]) => void;
  isEditing?: boolean;
}

/**
 * Inventory editor for NPCs.
 * Displays current inventory as clickable item badges and allows adding/removing items.
 */
export default function NPCInventory({
  inventory,
  onChange,
  isEditing = false,
}: NPCInventoryProps) {
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
    onChange(inventory.filter((item) => item.item_id !== itemId));
  };

  const handleAddItem = () => {
    if (!selectedItemId) return;

    // Check if item already exists in inventory
    const existingIndex = inventory.findIndex(
      (i) => i.item_id === selectedItemId,
    );
    if (existingIndex >= 0) {
      // Update quantity
      const updated = [...inventory];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + newQuantity,
        notes: newNotes || updated[existingIndex].notes,
      };
      onChange(updated);
    } else {
      // Add new item
      onChange([
        ...inventory,
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

  if (inventory.length === 0 && !isEditing) {
    return (
      <div className="text-text-muted text-sm italic">
        No items in inventory
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Inventory items */}
      <div className="flex flex-wrap gap-2">
        {inventory.map((invItem) => (
          <ItemReference
            key={invItem.item_id}
            itemId={invItem.item_id}
            quantity={invItem.quantity}
            notes={invItem.notes}
            onRemove={
              isEditing ? () => handleRemoveItem(invItem.item_id) : undefined
            }
          />
        ))}

        {isEditing && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm
              bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30
              transition-colors"
          >
            <Icon name="Plus" className="w-3.5 h-3.5" />
            Add Item
          </button>
        )}
      </div>

      {/* Add item modal */}
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
              <h3 className="text-lg font-semibold text-text">
                Add Item to Inventory
              </h3>
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
                          ? "bg-primary/20 border border-primary/50"
                          : "hover:bg-tavern-dark border border-transparent"
                      }`}
                    >
                      <Icon
                        name="Package"
                        className="w-4 h-4 text-text-muted"
                      />
                      <span className="flex-1 text-text">{item.name}</span>
                      <span className="text-xs text-text-muted capitalize">
                        {item.type?.replace(/_/g, " ")}
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
                      placeholder="e.g., hidden pocket"
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
                className="px-4 py-2 bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-white rounded-lg transition-colors"
              >
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
