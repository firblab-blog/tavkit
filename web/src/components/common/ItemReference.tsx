import { useState, useRef } from 'react'
import Icon from './Icon'
import { Item, getRarityColor } from '../../api/items'
import { useItemStore } from '../../store/itemStore'

interface ItemReferenceProps {
  itemId: string
  quantity?: number
  notes?: string
  onRemove?: () => void
  showQuantity?: boolean
  className?: string
}

/**
 * Clickable item badge with hover preview.
 * Used for displaying item references in NPCs, locations, etc.
 */
export default function ItemReference({
  itemId,
  quantity = 1,
  notes,
  onRemove,
  showQuantity = true,
  className = '',
}: ItemReferenceProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { fetchItem, getItemById } = useItemStore()

  const handleMouseEnter = async () => {
    // First check if we already have the item in the store
    const cachedItem = getItemById(itemId)
    if (cachedItem) {
      setItem(cachedItem)
      timeoutRef.current = setTimeout(() => setShowPreview(true), 300)
      return
    }

    // Fetch the item
    setLoading(true)
    const fetchedItem = await fetchItem(itemId)
    setLoading(false)
    if (fetchedItem) {
      setItem(fetchedItem)
      timeoutRef.current = setTimeout(() => setShowPreview(true), 300)
    }
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setShowPreview(false)
  }

  const getTypeIcon = (
    type?: string
  ):
    | 'Sword'
    | 'Shield'
    | 'FlaskConical'
    | 'Gem'
    | 'Wrench'
    | 'Scroll'
    | 'Crown'
    | 'Sparkles'
    | 'Package' => {
    switch (type) {
      case 'weapon':
        return 'Sword'
      case 'armor':
        return 'Shield'
      case 'consumable':
        return 'FlaskConical'
      case 'treasure':
        return 'Gem'
      case 'tool':
        return 'Wrench'
      case 'quest_item':
        return 'Scroll'
      case 'relic':
        return 'Crown'
      case 'wondrous':
        return 'Sparkles'
      default:
        return 'Package'
    }
  }

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm cursor-pointer
          bg-tavern-dark/50 hover:bg-tavern-dark border border-border hover:border-primary/50
          transition-colors ${item ? getRarityColor(item.rarity) : 'text-text'}`}
      >
        {loading ? (
          <Icon name="Loader2" className="w-3.5 h-3.5 animate-spin" />
        ) : item ? (
          <Icon name={getTypeIcon(item.type)} className="w-3.5 h-3.5" />
        ) : (
          <Icon name="Package" className="w-3.5 h-3.5 text-text-muted" />
        )}
        <span>{item?.name || 'Loading...'}</span>
        {showQuantity && quantity > 1 && (
          <span className="text-text-muted text-xs">x{quantity}</span>
        )}
      </span>

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-0.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
          title="Remove"
        >
          <Icon name="X" className="w-3 h-3" />
        </button>
      )}

      {/* Hover preview */}
      {showPreview && item && (
        <div
          className="absolute z-50 left-0 top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-xl p-3"
          style={{ minWidth: '18rem' }}
        >
          <div className="flex items-start gap-3 mb-2">
            <div className={`p-2 rounded-lg bg-tavern-dark/50 ${getRarityColor(item.rarity)}`}>
              <Icon name={getTypeIcon(item.type)} className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold ${getRarityColor(item.rarity)}`}>{item.name}</h4>
              <p className="text-xs text-text-muted capitalize">
                {item.rarity?.replace(/_/g, ' ')} {item.type?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {item.description && (
            <p className="text-sm text-text-muted line-clamp-3 mb-2">{item.description}</p>
          )}

          {notes && (
            <div className="text-xs text-text-muted bg-tavern-dark/30 rounded px-2 py-1 mt-2">
              <span className="font-medium">Note:</span> {notes}
            </div>
          )}

          {item.value && (
            <div className="flex items-center gap-1 text-xs text-amber-400 mt-2">
              <Icon name="Gem" className="w-3 h-3" />
              <span>{item.value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
