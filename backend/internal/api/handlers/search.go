package handlers

import (
	"net/http"
	"strings"

	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
)

// SearchHandler handles search operations across multiple content types
type SearchHandler struct {
	db db.Database
}

// NewSearchHandler creates a new SearchHandler
func NewSearchHandler(database db.Database) *SearchHandler {
	return &SearchHandler{db: database}
}

// SearchResult represents a single search result
type SearchResult struct {
	ID         string  `json:"id"`
	Type       string  `json:"type"` // 'npc', 'item', 'location', 'quest', 'character'
	Name       string  `json:"name"`
	Preview    string  `json:"preview,omitempty"`
	CampaignID *string `json:"campaign_id,omitempty"`
}

// SearchResponse is the response for search queries
type SearchResponse struct {
	Results []SearchResult `json:"results"`
	Query   string         `json:"query"`
	Total   int            `json:"total"`
}

// Search performs a search across multiple content types
// GET /api/v1/search?q=<query>&types=npcs,items,locations&campaign_id=<id>&limit=20
func (h *SearchHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	// Get optional filters
	typesParam := c.Query("types")
	campaignID := c.Query("campaign_id")
	userID, _ := c.Get("user_id")

	// Parse types to search
	searchTypes := []string{"npcs", "items", "locations", "quests", "characters"}
	if typesParam != "" {
		searchTypes = strings.Split(typesParam, ",")
	}

	// Limit results
	limit := 20
	results := []SearchResult{}

	// Search each type
	for _, searchType := range searchTypes {
		switch searchType {
		case "npcs":
			npcs, err := h.searchNPCs(c, query, campaignID, userID.(string), limit)
			if err == nil {
				results = append(results, npcs...)
			}
		case "items":
			items, err := h.searchItems(c, query, campaignID, userID.(string), limit)
			if err == nil {
				results = append(results, items...)
			}
		case "locations":
			locations, err := h.searchLocations(c, query, campaignID, userID.(string), limit)
			if err == nil {
				results = append(results, locations...)
			}
		case "quests":
			quests, err := h.searchQuests(c, query, campaignID, userID.(string), limit)
			if err == nil {
				results = append(results, quests...)
			}
		case "characters":
			characters, err := h.searchCharacters(c, query, campaignID, userID.(string), limit)
			if err == nil {
				results = append(results, characters...)
			}
		}
	}

	c.JSON(http.StatusOK, SearchResponse{
		Results: results,
		Query:   query,
		Total:   len(results),
	})
}

func (h *SearchHandler) searchNPCs(c *gin.Context, query, campaignID, userID string, limit int) ([]SearchResult, error) {
	npcs, err := h.db.ListNPCsByUserID(c, userID, nil)
	if err != nil {
		return nil, err
	}

	var results []SearchResult
	queryLower := strings.ToLower(query)

	for _, npc := range npcs {
		// Filter by campaign if specified
		if campaignID != "" && (npc.CampaignID == nil || *npc.CampaignID != campaignID) {
			continue
		}

		// Match name
		if strings.Contains(strings.ToLower(npc.Name), queryLower) {
			preview := ""
			if npc.Race != nil && npc.Class != nil {
				preview = *npc.Race + " " + *npc.Class
			}
			results = append(results, SearchResult{
				ID:         npc.ID,
				Type:       "npc",
				Name:       npc.Name,
				Preview:    preview,
				CampaignID: npc.CampaignID,
			})
		}

		if len(results) >= limit {
			break
		}
	}

	return results, nil
}

func (h *SearchHandler) searchItems(c *gin.Context, query, campaignID, userID string, limit int) ([]SearchResult, error) {
	items, err := h.db.ListItemsByUserID(c, userID, nil)
	if err != nil {
		return nil, err
	}

	var results []SearchResult
	queryLower := strings.ToLower(query)

	for _, item := range items {
		// Filter by campaign if specified
		if campaignID != "" && (item.CampaignID == nil || *item.CampaignID != campaignID) {
			continue
		}

		// Match name
		if strings.Contains(strings.ToLower(item.Name), queryLower) {
			preview := item.Type
			if item.Rarity != nil {
				preview = *item.Rarity + " " + item.Type
			}
			results = append(results, SearchResult{
				ID:         item.ID,
				Type:       "item",
				Name:       item.Name,
				Preview:    preview,
				CampaignID: item.CampaignID,
			})
		}

		if len(results) >= limit {
			break
		}
	}

	return results, nil
}

func (h *SearchHandler) searchLocations(c *gin.Context, query, campaignID, userID string, limit int) ([]SearchResult, error) {
	locations, err := h.db.ListLocationsByUserID(c, userID, nil)
	if err != nil {
		return nil, err
	}

	var results []SearchResult
	queryLower := strings.ToLower(query)

	for _, location := range locations {
		// Filter by campaign if specified
		if campaignID != "" && (location.CampaignID == nil || *location.CampaignID != campaignID) {
			continue
		}

		// Match name
		if strings.Contains(strings.ToLower(location.Name), queryLower) {
			preview := location.Type
			if location.Theme != nil {
				preview = *location.Theme + " " + location.Type
			}
			results = append(results, SearchResult{
				ID:         location.ID,
				Type:       "location",
				Name:       location.Name,
				Preview:    preview,
				CampaignID: location.CampaignID,
			})
		}

		if len(results) >= limit {
			break
		}
	}

	return results, nil
}

func (h *SearchHandler) searchQuests(c *gin.Context, query, campaignID, userID string, limit int) ([]SearchResult, error) {
	quests, err := h.db.ListQuestsByUserID(c, userID, nil)
	if err != nil {
		return nil, err
	}

	var results []SearchResult
	queryLower := strings.ToLower(query)

	for _, quest := range quests {
		// Filter by campaign if specified
		if campaignID != "" && (quest.CampaignID == nil || *quest.CampaignID != campaignID) {
			continue
		}

		// Match title
		if strings.Contains(strings.ToLower(quest.Title), queryLower) {
			preview := quest.Status
			if quest.Type != "" {
				preview = quest.Type + " - " + quest.Status
			}
			results = append(results, SearchResult{
				ID:         quest.ID,
				Type:       "quest",
				Name:       quest.Title,
				Preview:    preview,
				CampaignID: quest.CampaignID,
			})
		}

		if len(results) >= limit {
			break
		}
	}

	return results, nil
}

func (h *SearchHandler) searchCharacters(c *gin.Context, query, campaignID, userID string, limit int) ([]SearchResult, error) {
	characters, err := h.db.ListCharactersByUserID(c, userID, nil)
	if err != nil {
		return nil, err
	}

	var results []SearchResult
	queryLower := strings.ToLower(query)

	for _, char := range characters {
		// Match name
		if strings.Contains(strings.ToLower(char.Name), queryLower) {
			preview := ""
			if char.Race != "" && char.ClassInfo != "" {
				preview = char.Race + " " + char.ClassInfo
			}
			results = append(results, SearchResult{
				ID:      char.ID,
				Type:    "character",
				Name:    char.Name,
				Preview: preview,
			})
		}

		if len(results) >= limit {
			break
		}
	}

	return results, nil
}
