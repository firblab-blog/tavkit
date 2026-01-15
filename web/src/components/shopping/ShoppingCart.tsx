import { useState } from "react";
import Icon from "../common/Icon";
import { CartItem, HAGGLING_SKILLS } from "./ShoppingSession";

interface ShoppingCartProps {
  items: CartItem[];
  discountPercentage: number;
  onAddItem: (data: {
    character_name: string;
    item_name: string;
    quantity: number;
    base_price: string;
  }) => void;
  onUpdateItem: (itemId: string, updates: Partial<CartItem>) => void;
  onRemoveItem: (itemId: string) => void;
  onStartHaggling: (data: {
    item_name: string;
    character_name: string;
    starting_price: string;
    party_offer: string;
    skill_check_type: string;
    max_rounds: number;
  }) => void;
  disabled?: boolean;
}

export default function ShoppingCart({
  items,
  discountPercentage,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onStartHaggling,
  disabled = false,
}: ShoppingCartProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [characterName, setCharacterName] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [basePrice, setBasePrice] = useState("");
  const [showHaggleForm, setShowHaggleForm] = useState<string | null>(null);
  const [haggleOffer, setHaggleOffer] = useState("");
  const [haggleSkill, setHaggleSkill] = useState("Persuasion");

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName.trim() || !itemName.trim() || !basePrice.trim()) return;

    onAddItem({
      character_name: characterName.trim(),
      item_name: itemName.trim(),
      quantity,
      base_price: basePrice.trim(),
    });

    setItemName("");
    setQuantity(1);
    setBasePrice("");
  };

  const handleStartHaggle = (item: CartItem) => {
    if (!haggleOffer.trim()) return;

    onStartHaggling({
      item_name: item.item_name,
      character_name: item.character_name,
      starting_price: item.base_price,
      party_offer: haggleOffer.trim(),
      skill_check_type: haggleSkill,
      max_rounds: 3,
    });

    setShowHaggleForm(null);
    setHaggleOffer("");
  };

  const calculateItemPrice = (item: CartItem) => {
    const priceStr = item.negotiated_price || item.base_price;
    const price = parseFloat(priceStr.replace(/[^\d.]/g, ""));
    if (isNaN(price)) return priceStr;

    // Apply discount if no negotiated price
    if (!item.negotiated_price && discountPercentage !== 0) {
      const adjustedPrice = price * (1 - discountPercentage / 100);
      return `${adjustedPrice.toFixed(2)} gp`;
    }

    return `${price.toFixed(2)} gp`;
  };

  const calculateTotal = () => {
    let total = 0;
    for (const item of items) {
      if (!item.purchased) continue;
      const priceStr = item.negotiated_price || item.base_price;
      const price = parseFloat(priceStr.replace(/[^\d.]/g, ""));
      if (!isNaN(price)) {
        let adjustedPrice = price;
        if (!item.negotiated_price && discountPercentage !== 0) {
          adjustedPrice = price * (1 - discountPercentage / 100);
        }
        total += adjustedPrice * item.quantity;
      }
    }
    return total.toFixed(2);
  };

  const purchasedItems = items.filter((i) => i.purchased);
  const unpurchasedItems = items.filter((i) => !i.purchased);

  return (
    <div className="bg-background-panel border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Icon name="Package" className="w-4 h-4 text-primary" />
          Shopping Cart
        </h3>
        {!disabled && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1.5 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-primary"
          >
            <Icon name={showAddForm ? "X" : "Plus"} className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Add Item Form */}
      {showAddForm && !disabled && (
        <form
          onSubmit={handleAddItem}
          className="p-4 border-b border-border bg-background/50"
        >
          <div className="space-y-3">
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Character buying..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Item name..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <input
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                min={1}
                className="w-16 px-3 py-2 bg-background border border-border rounded-lg text-text text-center focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="Price"
                className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted text-center focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={
                !characterName.trim() || !itemName.trim() || !basePrice.trim()
              }
              className="w-full px-3 py-2 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Add to Cart
            </button>
          </div>
        </form>
      )}

      {/* Cart Items */}
      {items.length === 0 ? (
        <div className="p-6 text-center text-text-muted">
          <Icon name="Package" className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Cart is empty</p>
          <p className="text-sm mt-1">Add items to start shopping</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {/* Unpurchased Items */}
          {unpurchasedItems.length > 0 && (
            <div>
              {unpurchasedItems.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Purchase Toggle */}
                    <button
                      onClick={() =>
                        !disabled && onUpdateItem(item.id, { purchased: true })
                      }
                      disabled={disabled}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors border-border hover:border-emerald-500/50 ${
                        disabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      title="Mark as purchased"
                    />

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">
                          {item.item_name}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-xs text-text-muted">
                            x{item.quantity}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-text-muted">
                        For: {item.character_name}
                        {item.negotiated_price && (
                          <span className="ml-2 text-emerald-400">
                            (Haggled: {item.negotiated_price})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="font-medium text-text">
                        {calculateItemPrice(item)}
                      </div>
                      {!item.negotiated_price && discountPercentage !== 0 && (
                        <div className="text-xs text-text-muted line-through">
                          {item.base_price}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {!disabled && (
                      <div className="flex items-center gap-1">
                        {!item.negotiated_price && (
                          <button
                            onClick={() =>
                              setShowHaggleForm(
                                showHaggleForm === item.id ? null : item.id,
                              )
                            }
                            className="p-1.5 hover:bg-primary/20 text-text-muted hover:text-primary rounded transition-colors"
                            title="Haggle"
                          >
                            <Icon name="MessageSquare" className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 hover:bg-red-500/20 text-text-muted hover:text-red-400 rounded transition-colors"
                          title="Remove"
                        >
                          <Icon name="Trash2" className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Haggle Form */}
                  {showHaggleForm === item.id && !disabled && (
                    <div className="mt-3 pl-9 p-3 bg-background rounded-lg">
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={haggleOffer}
                            onChange={(e) => setHaggleOffer(e.target.value)}
                            placeholder="Your offer..."
                            className="flex-1 px-3 py-2 bg-background-panel border border-border rounded-lg text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
                          />
                          <select
                            value={haggleSkill}
                            onChange={(e) => setHaggleSkill(e.target.value)}
                            className="px-3 py-2 bg-background-panel border border-border rounded-lg text-text text-sm focus:border-primary focus:outline-none"
                          >
                            {HAGGLING_SKILLS.map((skill) => (
                              <option key={skill.value} value={skill.value}>
                                {skill.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => handleStartHaggle(item)}
                          disabled={!haggleOffer.trim()}
                          className="w-full px-3 py-2 bg-primary hover:bg-primary/90 text-background text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          Start Haggling
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Purchased Items */}
          {purchasedItems.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-emerald-500/10 text-xs font-medium text-emerald-400 uppercase">
                Purchased ({purchasedItems.length})
              </div>
              {purchasedItems.map((item) => (
                <div key={item.id} className="p-4 bg-emerald-500/5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        !disabled && onUpdateItem(item.id, { purchased: false })
                      }
                      disabled={disabled}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-emerald-500 border-emerald-500"
                    >
                      <Icon name="Check" className="w-3 h-3 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-text">
                        {item.item_name}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-xs text-text-muted ml-2">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-emerald-400">
                      {calculateItemPrice(item)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Total */}
      {purchasedItems.length > 0 && (
        <div className="p-4 border-t border-border bg-background/50">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text">Total Purchased</span>
            <span className="text-xl font-bold text-emerald-400">
              {calculateTotal()} gp
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
