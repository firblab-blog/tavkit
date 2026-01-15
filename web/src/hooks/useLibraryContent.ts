import { useState, useEffect, useMemo, useCallback } from "react";
import { apiClient } from "@/api/client";
import { useCampaignStore } from "@/store/campaignStore";
import { logger } from "@/utils/logger";

export type LibraryContentType =
  | "npcs"
  | "monsters"
  | "encounters"
  | "dialogues"
  | "locations"
  | "quests"
  | "items"
  | "rumors"
  | "taverns"
  | "merchants"
  | "traps"
  | "critters"
  | "chases";

interface UseLibraryContentOptions<T> {
  /** Content type to fetch */
  contentType: LibraryContentType;
  /** Campaign ID to filter by (optional) */
  campaignId?: string;
  /** Whether to show campaign filter */
  showCampaignFilter?: boolean;
  /** Search fields to filter on */
  searchFields?: (keyof T)[];
}

interface UseLibraryContentReturn<T> {
  /** All items from the API */
  items: T[];
  /** Filtered items based on search query */
  filteredItems: T[];
  /** Whether content is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Selected campaign filter */
  selectedCampaignId: string;
  /** Set selected campaign filter */
  setSelectedCampaignId: (id: string) => void;
  /** Currently viewed item */
  viewingItem: T | null;
  /** Set viewing item */
  setViewingItem: (item: T | null) => void;
  /** Delete an item */
  deleteItem: (id: string) => Promise<void>;
  /** Refresh the content list */
  refresh: () => void;
  /** Available campaigns for filter */
  campaigns: Array<{ id: string; name: string }>;
}

/**
 * useLibraryContent - Hook for managing library content fetching and filtering.
 *
 * Provides:
 * - Content fetching with campaign filtering
 * - Search/filter functionality
 * - Delete functionality
 * - Loading and error states
 */
export function useLibraryContent<T extends { id: string }>(
  options: UseLibraryContentOptions<T>,
): UseLibraryContentReturn<T> {
  const {
    contentType,
    campaignId,
    showCampaignFilter = true,
    searchFields = [],
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    campaignId || "",
  );
  const [viewingItem, setViewingItem] = useState<T | null>(null);

  const { campaigns, fetchCampaigns } = useCampaignStore();

  // Fetch campaigns on mount
  useEffect(() => {
    if (showCampaignFilter) {
      fetchCampaigns();
    }
  }, [showCampaignFilter, fetchCampaigns]);

  // Fetch content
  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build URL with optional campaign_id query parameter
      // "library" is a special value meaning campaign_id IS NULL (Personal Library)
      let url = `/${contentType}`;
      const filterCampaignId = campaignId || selectedCampaignId;
      if (filterCampaignId === "library") {
        url = `/${contentType}?campaign_id=null`;
      } else if (filterCampaignId) {
        url = `/${contentType}?campaign_id=${filterCampaignId}`;
      }

      const response = await apiClient.get(url);
      const data = response.data;

      logger.debug(`[useLibraryContent] Fetched ${contentType}:`, data);

      // Handle different response formats (data could be null/undefined)
      let itemsArray: T[] = [];
      if (Array.isArray(data)) {
        itemsArray = data;
      } else if (data && data[contentType]) {
        itemsArray = data[contentType];
      } else if (data && data.data) {
        itemsArray = data.data;
      }

      setItems(itemsArray);
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.message ||
        `Failed to load ${contentType}`;
      setError(message);
      logger.error(`[useLibraryContent] Failed to load ${contentType}:`, err);
    } finally {
      setLoading(false);
    }
  }, [contentType, campaignId, selectedCampaignId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;

    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      // Search in specified fields
      for (const field of searchFields) {
        const value = item[field];
        if (typeof value === "string" && value.toLowerCase().includes(query)) {
          return true;
        }
      }
      // Also check 'name' and 'title' as common fields
      const anyItem = item as any;
      if (anyItem.name && anyItem.name.toLowerCase().includes(query))
        return true;
      if (anyItem.title && anyItem.title.toLowerCase().includes(query))
        return true;
      return false;
    });
  }, [items, searchQuery, searchFields]);

  // Delete an item
  const deleteItem = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/${contentType}/${id}`);
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (viewingItem?.id === id) {
          setViewingItem(null);
        }
      } catch (err: any) {
        const message =
          err.response?.data?.error || err.message || "Failed to delete";
        setError(message);
        logger.error(
          `[useLibraryContent] Failed to delete ${contentType}:`,
          err,
        );
        throw err;
      }
    },
    [contentType, viewingItem],
  );

  return {
    items,
    filteredItems,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCampaignId,
    setSelectedCampaignId,
    viewingItem,
    setViewingItem,
    deleteItem,
    refresh: fetchContent,
    campaigns,
  };
}

export default useLibraryContent;
