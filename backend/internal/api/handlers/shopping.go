package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
)

type ShoppingHandler struct {
	db db.Database
}

func NewShoppingHandler(database db.Database) *ShoppingHandler {
	return &ShoppingHandler{db: database}
}

// CreateShoppingEncounter creates a new shopping encounter
func (h *ShoppingHandler) CreateShoppingEncounter(c *gin.Context) {
	var req struct {
		SessionID          string `json:"session_id" binding:"required"`
		MerchantID         string `json:"merchant_id" binding:"required"`
		MerchantMood       int    `json:"merchant_mood"`
		RelationshipLevel  string `json:"relationship_level"`
		DiscountPercentage int    `json:"discount_percentage"`
		Status             string `json:"status"`
		TotalPurchased     string `json:"total_purchased"`
		Notes              string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	encounter := &db.ShoppingEncounter{
		SessionID:          req.SessionID,
		MerchantID:         req.MerchantID,
		MerchantMood:       req.MerchantMood,
		RelationshipLevel:  req.RelationshipLevel,
		DiscountPercentage: req.DiscountPercentage,
		Status:             req.Status,
		CreatedAt:          time.Now(),
	}
	if req.TotalPurchased != "" {
		encounter.TotalPurchased = &req.TotalPurchased
	}
	if req.Notes != "" {
		encounter.Notes = &req.Notes
	}

	if err := h.db.CreateShoppingEncounter(c.Request.Context(), encounter); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shopping encounter"})
		return
	}

	c.JSON(http.StatusCreated, encounter)
}

// GetShoppingEncounter retrieves a shopping encounter by ID
func (h *ShoppingHandler) GetShoppingEncounter(c *gin.Context) {
	encounterID := c.Param("id")

	encounter, err := h.db.GetShoppingEncounterByID(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shopping encounter not found"})
		return
	}

	c.JSON(http.StatusOK, encounter)
}

// GetShoppingEncounterBySession retrieves a shopping encounter by session ID
func (h *ShoppingHandler) GetShoppingEncounterBySession(c *gin.Context) {
	sessionID := c.Param("session_id")

	encounter, err := h.db.GetShoppingEncounterBySessionID(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shopping encounter not found"})
		return
	}

	c.JSON(http.StatusOK, encounter)
}

// UpdateShoppingEncounter updates an existing shopping encounter
func (h *ShoppingHandler) UpdateShoppingEncounter(c *gin.Context) {
	encounterID := c.Param("id")

	var req struct {
		MerchantMood       *int    `json:"merchant_mood"`
		RelationshipLevel  string  `json:"relationship_level"`
		DiscountPercentage *int    `json:"discount_percentage"`
		Status             string  `json:"status"`
		TotalPurchased     *string `json:"total_purchased"`
		Notes              *string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	encounter, err := h.db.GetShoppingEncounterByID(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shopping encounter not found"})
		return
	}

	if req.MerchantMood != nil {
		encounter.MerchantMood = *req.MerchantMood
	}
	if req.RelationshipLevel != "" {
		encounter.RelationshipLevel = req.RelationshipLevel
	}
	if req.DiscountPercentage != nil {
		encounter.DiscountPercentage = *req.DiscountPercentage
	}
	if req.Status != "" {
		encounter.Status = req.Status
	}
	if req.TotalPurchased != nil {
		encounter.TotalPurchased = req.TotalPurchased
	}
	if req.Notes != nil {
		encounter.Notes = req.Notes
	}

	if err := h.db.UpdateShoppingEncounter(c.Request.Context(), encounter); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update shopping encounter"})
		return
	}

	c.JSON(http.StatusOK, encounter)
}

// DeleteShoppingEncounter deletes a shopping encounter
func (h *ShoppingHandler) DeleteShoppingEncounter(c *gin.Context) {
	encounterID := c.Param("id")

	if err := h.db.DeleteShoppingEncounter(c.Request.Context(), encounterID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete shopping encounter"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Shopping encounter deleted"})
}

// CreateShoppingCartItem adds an item to the shopping cart
func (h *ShoppingHandler) CreateShoppingCartItem(c *gin.Context) {
	encounterID := c.Param("id")

	var req struct {
		CharacterName   string          `json:"character_name" binding:"required"`
		ItemName        string          `json:"item_name" binding:"required"`
		ItemData        json.RawMessage `json:"item_data"`
		Quantity        int             `json:"quantity" binding:"required"`
		BasePrice       string          `json:"base_price" binding:"required"`
		NegotiatedPrice string          `json:"negotiated_price"`
		Purchased       bool            `json:"purchased"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cartItem := &db.ShoppingCart{
		EncounterID:   encounterID,
		CharacterName: req.CharacterName,
		ItemName:      req.ItemName,
		ItemData:      req.ItemData,
		Quantity:      req.Quantity,
		BasePrice:     req.BasePrice,
		Purchased:     req.Purchased,
	}
	if req.NegotiatedPrice != "" {
		cartItem.NegotiatedPrice = &req.NegotiatedPrice
	}

	if err := h.db.CreateShoppingCartItem(c.Request.Context(), cartItem); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add item to cart"})
		return
	}

	c.JSON(http.StatusCreated, cartItem)
}

// ListShoppingCartItems retrieves all items in the shopping cart
func (h *ShoppingHandler) ListShoppingCartItems(c *gin.Context) {
	encounterID := c.Param("id")

	items, err := h.db.ListShoppingCartItems(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list cart items"})
		return
	}

	c.JSON(http.StatusOK, items)
}

// UpdateShoppingCartItem updates a cart item
func (h *ShoppingHandler) UpdateShoppingCartItem(c *gin.Context) {
	itemID := c.Param("item_id")

	var req struct {
		Quantity        *int    `json:"quantity"`
		NegotiatedPrice *string `json:"negotiated_price"`
		Purchased       *bool   `json:"purchased"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cartItem := &db.ShoppingCart{
		ID: itemID,
	}

	if req.Quantity != nil {
		cartItem.Quantity = *req.Quantity
	}
	if req.NegotiatedPrice != nil {
		cartItem.NegotiatedPrice = req.NegotiatedPrice
	}
	if req.Purchased != nil {
		cartItem.Purchased = *req.Purchased
	}

	if err := h.db.UpdateShoppingCartItem(c.Request.Context(), cartItem); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update cart item"})
		return
	}

	c.JSON(http.StatusOK, cartItem)
}

// DeleteShoppingCartItem removes an item from the cart
func (h *ShoppingHandler) DeleteShoppingCartItem(c *gin.Context) {
	itemID := c.Param("item_id")

	if err := h.db.DeleteShoppingCartItem(c.Request.Context(), itemID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove cart item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item removed from cart"})
}

// CreateHagglingSession creates a new haggling session
func (h *ShoppingHandler) CreateHagglingSession(c *gin.Context) {
	encounterID := c.Param("id")

	var req struct {
		ItemName        string `json:"item_name" binding:"required"`
		CharacterName   string `json:"character_name" binding:"required"`
		StartingPrice   string `json:"starting_price" binding:"required"`
		PartyOffer      string `json:"party_offer" binding:"required"`
		MerchantCounter string `json:"merchant_counter"`
		MaxRounds       int    `json:"max_rounds"`
		SkillCheckType  string `json:"skill_check_type"`
		RollTotal       int    `json:"roll_total"`
		Success         bool   `json:"success"`
		FinalPrice      string `json:"final_price"`
		MoodChange      int    `json:"mood_change"`
		Notes           string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session := &db.HagglingSession{
		EncounterID:    encounterID,
		ItemName:       req.ItemName,
		CharacterName:  req.CharacterName,
		StartingPrice:  req.StartingPrice,
		PartyOffer:     req.PartyOffer,
		MaxRounds:      req.MaxRounds,
		SkillCheckType: req.SkillCheckType,
		MoodChange:     req.MoodChange,
		CreatedAt:      time.Now(),
	}
	if req.MerchantCounter != "" {
		session.MerchantCounter = &req.MerchantCounter
	}
	if req.RollTotal != 0 {
		session.RollTotal = &req.RollTotal
	}
	if req.Success {
		session.Success = &req.Success
	}
	if req.FinalPrice != "" {
		session.FinalPrice = &req.FinalPrice
	}
	if req.Notes != "" {
		session.Notes = &req.Notes
	}

	if err := h.db.CreateHagglingSession(c.Request.Context(), session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create haggling session"})
		return
	}

	c.JSON(http.StatusCreated, session)
}

// GetHagglingSession retrieves a haggling session by ID
func (h *ShoppingHandler) GetHagglingSession(c *gin.Context) {
	sessionID := c.Param("haggle_id")

	session, err := h.db.GetHagglingSession(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Haggling session not found"})
		return
	}

	c.JSON(http.StatusOK, session)
}

// ListHagglingSessions retrieves all haggling sessions for an encounter
func (h *ShoppingHandler) ListHagglingSessions(c *gin.Context) {
	encounterID := c.Param("id")

	sessions, err := h.db.ListHagglingSessions(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list haggling sessions"})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

// UpdateHagglingSession updates a haggling session
func (h *ShoppingHandler) UpdateHagglingSession(c *gin.Context) {
	sessionID := c.Param("haggle_id")

	var req struct {
		PartyOffer      *string `json:"party_offer"`
		MerchantCounter *string `json:"merchant_counter"`
		Rounds          *int    `json:"rounds"`
		RollTotal       *int    `json:"roll_total"`
		Success         *bool   `json:"success"`
		FinalPrice      *string `json:"final_price"`
		MoodChange      *int    `json:"mood_change"`
		Notes           *string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session, err := h.db.GetHagglingSession(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Haggling session not found"})
		return
	}

	if req.PartyOffer != nil {
		session.PartyOffer = *req.PartyOffer
	}
	if req.MerchantCounter != nil {
		session.MerchantCounter = req.MerchantCounter
	}
	if req.Rounds != nil {
		session.Rounds = *req.Rounds
	}
	if req.RollTotal != nil {
		session.RollTotal = req.RollTotal
	}
	if req.Success != nil {
		session.Success = req.Success
	}
	if req.FinalPrice != nil {
		session.FinalPrice = req.FinalPrice
	}
	if req.MoodChange != nil {
		session.MoodChange = *req.MoodChange
	}
	if req.Notes != nil {
		session.Notes = req.Notes
	}

	if err := h.db.UpdateHagglingSession(c.Request.Context(), session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update haggling session"})
		return
	}

	c.JSON(http.StatusOK, session)
}
