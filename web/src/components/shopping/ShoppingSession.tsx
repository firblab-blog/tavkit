import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../common/Icon'
import type { IconName } from '../common/Icon'
import ShoppingSetup from './ShoppingSetup'
import MerchantPanel from './MerchantPanel'
import ShoppingCart from './ShoppingCart'
import HagglingPanel from './HagglingPanel'
import { useCampaignStore } from '../../store/campaignStore'
import { logger } from '../../utils/logger'

export interface ShoppingEncounter {
  id: string
  session_id: string
  merchant_id: string
  merchant_mood: number
  relationship_level: string
  discount_percentage: number
  status: 'active' | 'completed'
  total_purchased?: string
  notes?: string
  created_at: string
}

export interface CartItem {
  id: string
  encounter_id: string
  character_name: string
  item_name: string
  item_data?: unknown
  quantity: number
  base_price: string
  negotiated_price?: string
  purchased: boolean
}

export interface HagglingSession {
  id: string
  encounter_id: string
  item_name: string
  character_name: string
  starting_price: string
  party_offer: string
  merchant_counter?: string
  max_rounds: number
  rounds: number
  skill_check_type: string
  roll_total?: number
  success?: boolean
  final_price?: string
  mood_change: number
  notes?: string
  created_at: string
}

export const RELATIONSHIP_LEVELS: {
  value: string
  label: string
  discount: number
  color: string
}[] = [
  { value: 'hostile', label: 'Hostile', discount: -20, color: 'text-red-400 bg-red-500/20' },
  {
    value: 'unfriendly',
    label: 'Unfriendly',
    discount: -10,
    color: 'text-orange-400 bg-orange-500/20',
  },
  { value: 'neutral', label: 'Neutral', discount: 0, color: 'text-gray-400 bg-gray-500/20' },
  {
    value: 'friendly',
    label: 'Friendly',
    discount: 5,
    color: 'text-emerald-400 bg-emerald-500/20',
  },
  { value: 'allied', label: 'Allied', discount: 10, color: 'text-blue-400 bg-blue-500/20' },
]

export const HAGGLING_SKILLS: { value: string; label: string; icon: IconName }[] = [
  { value: 'Persuasion', label: 'Persuasion', icon: 'Smile' },
  { value: 'Deception', label: 'Deception', icon: 'Eye' },
  { value: 'Intimidation', label: 'Intimidation', icon: 'Zap' },
]

export default function ShoppingSession() {
  const navigate = useNavigate()
  const getActiveCampaign = useCampaignStore((state) => state.getActiveCampaign)
  const activeCampaign = getActiveCampaign()
  const [encounter, setEncounter] = useState<ShoppingEncounter | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [hagglingSessions, setHagglingSessions] = useState<HagglingSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'cart' | 'haggling'>('cart')

  // Create a temporary session ID for standalone encounters
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`shopping-${Date.now()}`)
    }
  }, [sessionId])

  const handleCreateEncounter = async (data: {
    merchant_id: string
    merchant_name: string
    relationship_level: string
    merchant_mood: number
  }) => {
    if (!sessionId) return

    setIsLoading(true)
    try {
      const relationship = RELATIONSHIP_LEVELS.find((r) => r.value === data.relationship_level)
      const response = await fetch('/api/v1/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          session_id: sessionId,
          merchant_id: data.merchant_id,
          merchant_mood: data.merchant_mood,
          relationship_level: data.relationship_level,
          discount_percentage: relationship?.discount || 0,
          status: 'active',
        }),
      })

      if (response.ok) {
        const newEncounter = await response.json()
        setEncounter(newEncounter)
        setShowSetup(false)
      }
    } catch (error) {
      logger.error('Failed to create encounter:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateEncounter = async (updates: Partial<ShoppingEncounter>) => {
    if (!encounter) return

    try {
      const response = await fetch(`/api/v1/shopping/${encounter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updated = await response.json()
        setEncounter(updated)
      }
    } catch (error) {
      logger.error('Failed to update encounter:', error)
    }
  }

  const handleAddCartItem = async (itemData: {
    character_name: string
    item_name: string
    quantity: number
    base_price: string
  }) => {
    if (!encounter) return

    try {
      const response = await fetch(`/api/v1/shopping/${encounter.id}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...itemData,
          purchased: false,
        }),
      })

      if (response.ok) {
        const newItem = await response.json()
        setCartItems((prev) => [...prev, newItem])
      }
    } catch (error) {
      logger.error('Failed to add cart item:', error)
    }
  }

  const handleUpdateCartItem = async (itemId: string, updates: Partial<CartItem>) => {
    try {
      const response = await fetch(`/api/v1/shopping/${encounter?.id}/cart/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        setCartItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i)))
      }
    } catch (error) {
      logger.error('Failed to update cart item:', error)
    }
  }

  const handleRemoveCartItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/v1/shopping/${encounter?.id}/cart/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setCartItems((prev) => prev.filter((i) => i.id !== itemId))
      }
    } catch (error) {
      logger.error('Failed to remove cart item:', error)
    }
  }

  const handleStartHaggling = async (data: {
    item_name: string
    character_name: string
    starting_price: string
    party_offer: string
    skill_check_type: string
    max_rounds: number
  }) => {
    if (!encounter) return

    try {
      const response = await fetch(`/api/v1/shopping/${encounter.id}/haggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          mood_change: 0,
        }),
      })

      if (response.ok) {
        const newSession = await response.json()
        setHagglingSessions((prev) => [...prev, newSession])
        setActiveTab('haggling')
      }
    } catch (error) {
      logger.error('Failed to start haggling:', error)
    }
  }

  const handleUpdateHaggling = async (sessionId: string, updates: Partial<HagglingSession>) => {
    try {
      const response = await fetch(`/api/v1/shopping/${encounter?.id}/haggle/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        setHagglingSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s))
        )

        // Update merchant mood if there's a mood change
        if (updates.mood_change && encounter) {
          const newMood = Math.max(-5, Math.min(5, encounter.merchant_mood + updates.mood_change))
          await handleUpdateEncounter({ merchant_mood: newMood })
        }
      }
    } catch (error) {
      logger.error('Failed to update haggling:', error)
    }
  }

  const handleEndSession = async () => {
    if (!encounter) return

    // Calculate total purchased
    const purchasedItems = cartItems.filter((i) => i.purchased)
    const total = purchasedItems.reduce((acc, item) => {
      const price = parseFloat((item.negotiated_price || item.base_price).replace(/[^\d.]/g, ''))
      return acc + (isNaN(price) ? 0 : price * item.quantity)
    }, 0)

    await handleUpdateEncounter({
      status: 'completed',
      total_purchased: `${total.toFixed(2)} gp`,
    })
  }

  const handleNewSession = () => {
    setEncounter(null)
    setCartItems([])
    setHagglingSessions([])
    setShowSetup(true)
    setSessionId(`shopping-${Date.now()}`)
  }

  if (showSetup) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="flex-none border-b border-border bg-background-panel px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
              >
                <Icon name="ArrowLeft" className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-text">Shopping</h1>
                <p className="text-sm text-text-muted">
                  {activeCampaign?.name || 'No campaign selected'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Form */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            <ShoppingSetup onStart={handleCreateEncounter} isLoading={isLoading} />
          </div>
        </div>
      </div>
    )
  }

  if (!encounter) return null

  const isCompleted = encounter.status === 'completed'

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none border-b border-border bg-background-panel px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
            >
              <Icon name="ArrowLeft" className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-text flex items-center gap-2">
                  <Icon name="Store" className="w-5 h-5 text-primary" />
                  Shopping Session
                </h1>
                {isCompleted && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded border bg-gray-500/20 text-gray-400 border-gray-500/40">
                    COMPLETED
                  </span>
                )}
              </div>
              <p className="text-sm text-text-muted capitalize">
                {encounter.relationship_level} relationship • {encounter.discount_percentage}%
                discount
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCompleted ? (
              <button
                onClick={handleNewSession}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name="Plus" className="w-4 h-4" />
                New Session
              </button>
            ) : (
              <button
                onClick={handleEndSession}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium rounded-lg transition-colors"
              >
                Complete Purchase
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Merchant Info */}
          <div className="lg:col-span-1">
            <MerchantPanel
              encounter={encounter}
              onUpdate={handleUpdateEncounter}
              disabled={isCompleted}
            />
          </div>

          {/* Right Column - Cart & Haggling */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tab Navigation */}
            <div className="flex gap-2 bg-background-panel border border-border rounded-lg p-1">
              <button
                onClick={() => setActiveTab('cart')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'cart'
                    ? 'bg-primary text-background'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Icon name="Package" className="w-4 h-4" />
                Cart ({cartItems.length})
              </button>
              <button
                onClick={() => setActiveTab('haggling')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'haggling'
                    ? 'bg-primary text-background'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Icon name="MessageSquare" className="w-4 h-4" />
                Haggling ({hagglingSessions.length})
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'cart' && (
              <ShoppingCart
                items={cartItems}
                discountPercentage={encounter.discount_percentage}
                onAddItem={handleAddCartItem}
                onUpdateItem={handleUpdateCartItem}
                onRemoveItem={handleRemoveCartItem}
                onStartHaggling={handleStartHaggling}
                disabled={isCompleted}
              />
            )}
            {activeTab === 'haggling' && (
              <HagglingPanel
                sessions={hagglingSessions}
                onUpdateSession={handleUpdateHaggling}
                disabled={isCompleted}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
