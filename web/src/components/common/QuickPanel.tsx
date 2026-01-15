import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { useQuickPanelStore } from "../../store/quickPanelStore";
import {
  SearchResult,
  getResultTypeIcon,
  getResultTypeLabel,
} from "../../api/search";

/**
 * Command palette / quick search panel.
 * Accessible via Cmd+K (Mac) or Ctrl+K (Windows/Linux).
 */
export default function QuickPanel() {
  const {
    isOpen,
    query,
    results,
    loading,
    selectedIndex,
    close,
    setQuery,
    performSearch,
    selectNext,
    selectPrevious,
    getSelectedResult,
    addRecentSearch,
  } = useQuickPanelStore();

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Navigate to selected result
  const navigateToResult = useCallback(
    (result: SearchResult) => {
      addRecentSearch(result.name);

      // Navigate to the appropriate route based on result type
      // All campaign content now lives in the GMCharacterView tabs
      switch (result.type) {
        case "item":
          navigate("/dashboard/gm/items");
          break;
        case "npc":
        case "location":
        case "quest":
          // Navigate to GM dashboard - these are in the Library tab
          navigate("/dashboard/gm?tab=library");
          break;
        case "character":
          navigate("/dashboard/gm/characters");
          break;
        default:
          navigate("/dashboard/gm/saved");
      }

      close();
    },
    [navigate, close, addRecentSearch],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          selectPrevious();
          break;
        case "Enter": {
          e.preventDefault();
          const selected = getSelectedResult();
          if (selected) {
            navigateToResult(selected);
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    },
    [selectNext, selectPrevious, getSelectedResult, navigateToResult, close],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Icon name="Search" className="w-5 h-5 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search NPCs, items, locations, quests..."
            className="flex-1 bg-transparent text-text placeholder:text-text-muted outline-none text-lg"
          />
          {loading && (
            <Icon
              name="Loader2"
              className="w-5 h-5 text-primary animate-spin"
            />
          )}
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <kbd className="px-1.5 py-0.5 bg-tavern-dark rounded text-xs">
              esc
            </kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && query.length >= 2 && !loading && (
            <div className="py-8 text-center text-text-muted">
              <Icon
                name="Search"
                className="w-10 h-10 mx-auto mb-2 opacity-50"
              />
              <p>No results found for "{query}"</p>
            </div>
          )}

          {results.length === 0 && query.length < 2 && (
            <div className="py-8 text-center text-text-muted">
              <Icon
                name="Search"
                className="w-10 h-10 mx-auto mb-2 opacity-50"
              />
              <p>Type to search across all content</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["NPCs", "Items", "Locations", "Quests", "Characters"].map(
                  (type) => (
                    <span
                      key={type}
                      className="px-2 py-1 bg-tavern-dark rounded text-xs"
                    >
                      {type}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => navigateToResult(result)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                index === selectedIndex
                  ? "bg-primary/20"
                  : "hover:bg-tavern-dark/50"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  index === selectedIndex ? "bg-primary/30" : "bg-tavern-dark"
                }`}
              >
                <Icon
                  name={getResultTypeIcon(result.type)}
                  className="w-4 h-4 text-text"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-text font-medium truncate">
                  {result.name}
                </div>
                {result.preview && (
                  <div className="text-sm text-text-muted truncate">
                    {result.preview}
                  </div>
                )}
              </div>
              <span className="px-2 py-0.5 bg-tavern-dark rounded text-xs text-text-muted uppercase">
                {getResultTypeLabel(result.type)}
              </span>
            </button>
          ))}
        </div>

        {/* Footer with keyboard hints */}
        <div className="px-4 py-2 border-t border-border bg-background/50 flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-tavern-dark rounded">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-tavern-dark rounded">↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-tavern-dark rounded">↵</kbd>
            <span>Select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
