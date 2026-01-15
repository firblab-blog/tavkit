// Event system for cross-store communication
// Eliminates circular dependencies between stores by using events instead of direct imports
//
// Usage:
// - In campaignStore: storeEvents.emit(CAMPAIGN_CHANGED, { campaignId })
// - In playerStores: storeEvents.on(CAMPAIGN_CHANGED, () => invalidateCache())

import { logger } from "@/utils/logger";

// Event types
export const CAMPAIGN_CHANGED = "campaign-changed";
export const CAMPAIGN_DELETED = "campaign-deleted";
export const CHARACTER_CHANGED = "character-changed";
export const AUTH_LOGOUT = "auth-logout";

// Event payload types
export interface CampaignChangedPayload {
  campaignId: string | null;
  previousCampaignId?: string | null;
  // Context type changes (e.g., switching from GM to Player view of the same campaign)
  contextType?: "gm_campaign" | "player_campaign" | "library" | null;
  previousContextType?: "gm_campaign" | "player_campaign" | "library" | null;
}

export interface CampaignDeletedPayload {
  campaignId: string;
}

export interface CharacterChangedPayload {
  characterId: string | null;
  campaignId?: string | null;
}

type EventPayloadMap = {
  [CAMPAIGN_CHANGED]: CampaignChangedPayload;
  [CAMPAIGN_DELETED]: CampaignDeletedPayload;
  [CHARACTER_CHANGED]: CharacterChangedPayload;
  [AUTH_LOGOUT]: void;
};

type EventType = keyof EventPayloadMap;
type EventListener<T extends EventType> = (payload: EventPayloadMap[T]) => void;

class StoreEventEmitter {
  private listeners: Map<EventType, Set<EventListener<EventType>>> = new Map();

  on<T extends EventType>(event: T, listener: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as EventListener<EventType>);

    // Return cleanup function
    return () => {
      this.listeners.get(event)?.delete(listener as EventListener<EventType>);
    };
  }

  emit<T extends EventType>(event: T, payload: EventPayloadMap[T]): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    eventListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        logger.error(`Error in store event listener for ${event}:`, error);
      }
    });
  }

  // For debugging
  getListenerCount(event: EventType): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

// Singleton instance
export const storeEvents = new StoreEventEmitter();
