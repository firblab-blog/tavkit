import { create } from "zustand";
import { storeEvents, CAMPAIGN_CHANGED } from "../lib/storeEvents";
import { logger } from "../utils/logger";
import {
  Item,
  ItemFilters,
  CreateItemRequest,
  UpdateItemRequest,
  getItems,
  getItem,
  createItem as createItemApi,
  updateItem as updateItemApi,
  deleteItem as deleteItemApi,
  linkItemToCampaign as linkItemApi,
  unlinkItemFromCampaign as unlinkItemApi,
} from "../api/items";

interface ItemState {
  items: Item[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: ItemFilters;

  // Actions
  fetchItems: (filters?: ItemFilters, forceRefresh?: boolean) => Promise<void>;
  fetchItem: (id: string) => Promise<Item | null>;
  createItem: (item: CreateItemRequest) => Promise<Item | null>;
  updateItem: (id: string, updates: UpdateItemRequest) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  linkToCampaign: (
    itemId: string,
    campaignId: string,
    quantity?: number,
    notes?: string,
  ) => Promise<boolean>;
  unlinkFromCampaign: (itemId: string, campaignId: string) => Promise<boolean>;
  setFilters: (filters: ItemFilters) => void;
  getItemById: (id: string) => Item | undefined;
  invalidateCache: () => void;
}

// Cache duration: 30 seconds
const CACHE_DURATION = 30 * 1000;

export const useItemStore = create<ItemState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
  filters: {},

  fetchItems: async (filters?: ItemFilters, forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const effectiveFilters = filters ?? state.filters;

    // Skip fetch if data was fetched recently (within cache duration) unless force refresh
    // Also skip if filters match and we have data
    if (
      !forceRefresh &&
      state.lastFetched &&
      now - state.lastFetched < CACHE_DURATION &&
      state.items.length > 0 &&
      JSON.stringify(effectiveFilters) === JSON.stringify(state.filters)
    ) {
      return;
    }

    set({ loading: true, error: null, filters: effectiveFilters });

    try {
      const items = await getItems(effectiveFilters);
      set({
        items: Array.isArray(items) ? items : [],
        loading: false,
        lastFetched: now,
      });
    } catch (err) {
      logger.error("Failed to fetch items:", err);
      set({
        error: err instanceof Error ? err.message : "Failed to fetch items",
        loading: false,
      });
    }
  },

  fetchItem: async (id: string) => {
    try {
      const item = await getItem(id);
      // Update item in local state if it exists
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? item : i)),
      }));
      return item;
    } catch (err) {
      logger.error("Failed to fetch item:", err);
      return null;
    }
  },

  createItem: async (item: CreateItemRequest) => {
    try {
      const newItem = await createItemApi(item);
      set((state) => ({
        items: [newItem, ...state.items],
      }));
      return newItem;
    } catch (err) {
      logger.error("Failed to create item:", err);
      set({
        error: err instanceof Error ? err.message : "Failed to create item",
      });
      return null;
    }
  },

  updateItem: async (id: string, updates: UpdateItemRequest) => {
    try {
      const updatedItem = await updateItemApi(id, updates);
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? updatedItem : i)),
      }));
      return true;
    } catch (err) {
      logger.error("Failed to update item:", err);
      set({
        error: err instanceof Error ? err.message : "Failed to update item",
      });
      return false;
    }
  },

  deleteItem: async (id: string) => {
    try {
      await deleteItemApi(id);
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
      }));
      return true;
    } catch (err) {
      logger.error("Failed to delete item:", err);
      set({
        error: err instanceof Error ? err.message : "Failed to delete item",
      });
      return false;
    }
  },

  linkToCampaign: async (
    itemId: string,
    campaignId: string,
    quantity = 1,
    notes?: string,
  ) => {
    try {
      await linkItemApi(campaignId, itemId, { quantity, notes });
      return true;
    } catch (err) {
      logger.error("Failed to link item to campaign:", err);
      set({
        error:
          err instanceof Error
            ? err.message
            : "Failed to link item to campaign",
      });
      return false;
    }
  },

  unlinkFromCampaign: async (itemId: string, campaignId: string) => {
    try {
      await unlinkItemApi(campaignId, itemId);
      return true;
    } catch (err) {
      logger.error("Failed to unlink item from campaign:", err);
      set({
        error:
          err instanceof Error
            ? err.message
            : "Failed to unlink item from campaign",
      });
      return false;
    }
  },

  setFilters: (filters: ItemFilters) => {
    set({ filters, lastFetched: null });
  },

  getItemById: (id: string) => {
    return get().items.find((i) => i.id === id);
  },

  invalidateCache: () => {
    set({ items: [], lastFetched: null, filters: {} });
  },
}));

// Subscribe to campaign change events to invalidate cache
storeEvents.on(CAMPAIGN_CHANGED, () => {
  useItemStore.getState().invalidateCache();
  logger.debug("[itemStore] Cache invalidated due to campaign change");
});
