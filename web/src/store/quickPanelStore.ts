import { create } from "zustand";
import { SearchResult, search } from "../api/search";
import { logger } from "../utils/logger";

interface QuickPanelState {
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  loading: boolean;
  selectedIndex: number;
  recentSearches: string[];

  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
  selectNext: () => void;
  selectPrevious: () => void;
  getSelectedResult: () => SearchResult | null;
  addRecentSearch: (query: string) => void;
  clearResults: () => void;
}

const MAX_RECENT_SEARCHES = 5;

export const useQuickPanelStore = create<QuickPanelState>((set, get) => ({
  isOpen: false,
  query: "",
  results: [],
  loading: false,
  selectedIndex: 0,
  recentSearches: [],

  open: () => set({ isOpen: true, query: "", results: [], selectedIndex: 0 }),

  close: () => set({ isOpen: false, query: "", results: [], selectedIndex: 0 }),

  toggle: () => {
    const { isOpen } = get();
    if (isOpen) {
      get().close();
    } else {
      get().open();
    }
  },

  setQuery: (query: string) => set({ query }),

  performSearch: async (query: string) => {
    if (query.trim().length < 2) {
      set({ results: [], loading: false });
      return;
    }

    set({ loading: true });

    try {
      const results = await search({
        query: query.trim(),
        limit: 10,
      });
      set({ results, loading: false, selectedIndex: 0 });
    } catch (err) {
      logger.error("Quick panel search failed:", err);
      set({ results: [], loading: false });
    }
  },

  selectNext: () => {
    const { results, selectedIndex } = get();
    if (results.length > 0) {
      set({ selectedIndex: (selectedIndex + 1) % results.length });
    }
  },

  selectPrevious: () => {
    const { results, selectedIndex } = get();
    if (results.length > 0) {
      set({
        selectedIndex:
          selectedIndex === 0 ? results.length - 1 : selectedIndex - 1,
      });
    }
  },

  getSelectedResult: () => {
    const { results, selectedIndex } = get();
    return results[selectedIndex] || null;
  },

  addRecentSearch: (query: string) => {
    const { recentSearches } = get();
    const filtered = recentSearches.filter((q) => q !== query);
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    set({ recentSearches: updated });
  },

  clearResults: () => set({ results: [], selectedIndex: 0 }),
}));
