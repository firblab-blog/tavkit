// Package api provides the HTTP API setup and routing.
package api

import (
	"tavkit/internal/ai"
	"tavkit/internal/api/handlers"
	"tavkit/internal/api/middleware"
	"tavkit/internal/auth"
	"tavkit/internal/config"
	"tavkit/internal/db"
	"tavkit/internal/services"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/zap"
)

// SetupRoutes configures all API routes
func SetupRoutes(
	router *gin.Engine,
	cfg *config.Config,
	database db.Database,
	jwtManager *auth.JWTManager,
	aiClient *services.AIClient,
	aiFactory *ai.Factory,
	logger *zap.Logger,
) {
	// Global middleware
	router.Use(middleware.RecoveryMiddleware(logger))
	router.Use(middleware.LoggerMiddleware(logger))
	router.Use(middleware.SecurityHeadersMiddleware())
	router.Use(middleware.CORSMiddleware(cfg.CORS.AllowedOrigins, cfg.CORS.AllowCredentials))

	// Rate limiter
	rateLimiter := middleware.NewRateLimiter(cfg.RateLimit.RequestsPerSecond, cfg.RateLimit.Burst)
	router.Use(middleware.RateLimitMiddleware(rateLimiter))

	// Initialize external site manager
	siteManager := services.NewExternalSiteManager(logger)

	// Initialize campaign summary service (needed by all AI generators)
	campaignSummaryService := services.NewCampaignSummaryService(database, aiClient, logger)

	// Initialize chunked summary pipeline for large campaign summarization
	// Pass aiFactory so the pipeline can determine the current provider and pass it to ai-service
	chunkedSummaryPipeline := services.NewChunkedSummaryPipeline(database, aiClient, aiFactory, logger)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(database, jwtManager, logger, &cfg.Auth)
	userHandler := handlers.NewUserHandler(database, logger)
	toolHandler := handlers.NewToolHandler(database, logger)
	monsterHandler := handlers.NewMonsterHandler(database, aiClient, campaignSummaryService, logger)
	encounterHandler := handlers.NewEncounterHandler(database, aiClient, campaignSummaryService, logger)
	dialogueHandler := handlers.NewDialogueHandler(database, aiClient, campaignSummaryService, logger)
	healthHandler := handlers.NewHealthHandler(database, logger)
	adminHandler := handlers.NewAdminHandler(database, aiFactory, logger)
	proxyHandler := handlers.NewProxyHandler(logger, siteManager)
	externalSitesHandler := handlers.NewExternalSitesHandler(logger, siteManager, database)
	containerHandler := handlers.NewContainerHandler(database, logger)
	kitHandler := handlers.NewKitHandler(database, logger)

	// All AI generator handlers use campaign summary service for context
	campaignHandler := handlers.NewCampaignHandler(database, logger, campaignSummaryService, chunkedSummaryPipeline)
	npcHandler := handlers.NewNPCHandler(database, aiClient, campaignSummaryService, logger)
	locationHandler := handlers.NewLocationHandler(database, aiClient, campaignSummaryService, logger)
	questHandler := handlers.NewQuestHandler(database, aiClient, campaignSummaryService, logger)
	itemHandler := handlers.NewItemHandler(database, aiClient, campaignSummaryService, logger)
	rumorHandler := handlers.NewRumorHandler(database, aiClient, campaignSummaryService, logger)
	campaignContentHandler := handlers.NewCampaignContentHandler(database, logger)
	campaignStatusHandler := handlers.NewCampaignStatusHandler(database, logger)
	campaignCharactersHandler := handlers.NewCampaignCharactersHandler(database, logger)

	// Initialize session handler
	sessionHandler := handlers.NewSessionHandler(database, logger)

	// Initialize combat handler
	combatHandler := handlers.NewCombatHandler(database, logger)

	// Initialize session runner handlers
	socialHandler := handlers.NewSocialHandler(database)
	tavernSessionHandler := handlers.NewTavernSessionHandler(database)
	shoppingHandler := handlers.NewShoppingHandler(database)

	// Initialize tavern handler with campaign summary service for full campaign context
	tavernHandler := handlers.NewTavernHandler(database, aiClient, campaignSummaryService, logger)

	// Initialize merchant handler with campaign summary service for full campaign context
	merchantHandler := handlers.NewMerchantHandler(database, aiClient, campaignSummaryService, logger)

	// Initialize trap handler with campaign summary service for full campaign context
	trapHandler := handlers.NewTrapHandler(database, aiClient, campaignSummaryService, logger)

	// Initialize critter handler with campaign summary service for full campaign context
	critterHandler := handlers.NewCritterHandler(database, aiClient, campaignSummaryService, logger)

	// Initialize chase handler with campaign summary service for full campaign context
	chaseHandler := handlers.NewChaseHandler(database, aiClient, campaignSummaryService, logger)

	// Initialize character handler
	characterHandler := handlers.NewCharacterHandler(database, logger)

	// Initialize D&D Beyond handler
	dndBeyondHandler := handlers.NewDnDBeyondHandler(database, logger)

	// Initialize AI and Settings handlers
	aiHandler := handlers.NewAIHandler(aiFactory, logger)
	settingsHandler := handlers.NewSettingsHandler(aiFactory, logger)

	// Initialize session chat handler
	sessionChatHandler := handlers.NewSessionChatHandler(database, aiClient, logger)

	// Public routes
	public := router.Group("/api/v1")
	{
		// Health check
		public.GET("/health", healthHandler.Health)
		public.GET("/health/ready", healthHandler.Ready)

		// Auth
		public.POST("/auth/register", authHandler.Register)
		public.POST("/auth/login", authHandler.Login)

		// Public settings (for checking if registration is enabled)
		public.GET("/settings", adminHandler.GetSettings)

		// Proxy endpoint (public to allow iframe embedding)
		public.GET("/proxy", proxyHandler.ProxyURL)

		// External sites listing (public)
		public.GET("/external-sites", externalSitesHandler.ListSites)
		public.GET("/external-sites/:id", externalSitesHandler.GetSite)

		// AI status endpoint (public to check AI availability)
		public.GET("/ai/status", aiHandler.GetStatus)
	}

	// Swagger documentation (conditionally enabled)
	if cfg.Server.EnableSwagger {
		logger.Info("Swagger UI enabled at /swagger/index.html")
		router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	// Protected routes
	protected := router.Group("/api/v1")
	protected.Use(middleware.AuthMiddleware(jwtManager))
	protected.Use(middleware.GameSystemMiddleware(database, logger))
	protected.Use(middleware.CSRFMiddleware()) // CSRF protection for state-changing requests
	{
		// Auth routes (logout, CSRF refresh)
		protected.POST("/auth/logout", authHandler.Logout)
		protected.POST("/auth/csrf/refresh", authHandler.RefreshCSRF)

		// User routes
		users := protected.Group("/users")
		{
			users.GET("/me", userHandler.GetMe)
			users.PUT("/me", userHandler.UpdateMe)
			users.DELETE("/me", userHandler.DeleteMe)
		}

		// Tool routes
		tools := protected.Group("/tools")
		{
			tools.POST("", toolHandler.CreateTool)
			tools.GET("", toolHandler.ListTools)
			tools.GET("/:id", toolHandler.GetTool)
			tools.PUT("/:id", toolHandler.UpdateTool)
			tools.DELETE("/:id", toolHandler.DeleteTool)
		}

		// NPC routes
		npcs := protected.Group("/npcs")
		{
			npcs.POST("", npcHandler.CreateNPC)
			npcs.POST("/generate", npcHandler.GenerateNPC)
			npcs.GET("", npcHandler.ListNPCs)
			npcs.GET("/:id", npcHandler.GetNPC)
			npcs.DELETE("/:id", npcHandler.DeleteNPC)
		}

		// Monster routes
		monsters := protected.Group("/monsters")
		{
			monsters.POST("", monsterHandler.CreateMonster)
			monsters.POST("/generate", monsterHandler.GenerateMonster)
			monsters.GET("", monsterHandler.ListMonsters)
			monsters.GET("/:id", monsterHandler.GetMonster)
			monsters.DELETE("/:id", monsterHandler.DeleteMonster)
		}

		// Encounter routes
		encounters := protected.Group("/encounters")
		{
			encounters.POST("", encounterHandler.CreateEncounter)
			encounters.POST("/generate", encounterHandler.GenerateEncounter)
			encounters.GET("", encounterHandler.ListEncounters)
			encounters.GET("/:id", encounterHandler.GetEncounter)
			encounters.DELETE("/:id", encounterHandler.DeleteEncounter)
		}

		// Dialogue routes
		dialogues := protected.Group("/dialogues")
		{
			dialogues.POST("", dialogueHandler.CreateDialogue)
			dialogues.POST("/generate", dialogueHandler.GenerateDialogue)
			dialogues.GET("", dialogueHandler.ListDialogues)
			dialogues.GET("/:id", dialogueHandler.GetDialogue)
			dialogues.DELETE("/:id", dialogueHandler.DeleteDialogue)
		}

		// Location routes
		locations := protected.Group("/locations")
		{
			locations.POST("", locationHandler.CreateLocation)
			locations.POST("/generate", locationHandler.GenerateLocation)
			locations.GET("", locationHandler.ListLocations)
			locations.GET("/:id", locationHandler.GetLocation)
			locations.PUT("/:id", locationHandler.UpdateLocation)
			locations.DELETE("/:id", locationHandler.DeleteLocation)
		}

		// Quest routes
		quests := protected.Group("/quests")
		{
			quests.POST("", questHandler.CreateQuest)
			quests.POST("/generate", questHandler.GenerateQuest)
			quests.GET("", questHandler.ListQuests)
			quests.GET("/:id", questHandler.GetQuest)
			quests.PUT("/:id", questHandler.UpdateQuest)
			quests.DELETE("/:id", questHandler.DeleteQuest)
		}

		// Item routes
		items := protected.Group("/items")
		{
			items.POST("", itemHandler.CreateItem)
			items.POST("/generate", itemHandler.GenerateItem)
			items.GET("", itemHandler.ListItems)
			items.GET("/:id", itemHandler.GetItem)
			items.PUT("/:id", itemHandler.UpdateItem)
			items.DELETE("/:id", itemHandler.DeleteItem)
		}

		// Rumor routes
		rumors := protected.Group("/rumors")
		{
			rumors.POST("", rumorHandler.CreateRumor)
			rumors.POST("/generate", rumorHandler.GenerateRumor)
			rumors.GET("", rumorHandler.ListRumors)
			rumors.GET("/:id", rumorHandler.GetRumor)
			rumors.PUT("/:id", rumorHandler.UpdateRumor)
			rumors.DELETE("/:id", rumorHandler.DeleteRumor)
		}

		// Tavern routes
		taverns := protected.Group("/taverns")
		{
			taverns.POST("", tavernHandler.CreateTavern)
			taverns.POST("/generate", tavernHandler.GenerateTavern)
			taverns.GET("", tavernHandler.ListTaverns)
			taverns.GET("/campaign/:campaign_id", tavernHandler.ListTavernsByCampaign)
			taverns.GET("/:id", tavernHandler.GetTavern)
			taverns.PUT("/:id", tavernHandler.UpdateTavern)
			taverns.DELETE("/:id", tavernHandler.DeleteTavern)
		}

		// Merchant routes
		merchants := protected.Group("/merchants")
		{
			merchants.POST("", merchantHandler.CreateMerchant)
			merchants.POST("/generate", merchantHandler.GenerateMerchant)
			merchants.GET("", merchantHandler.ListMerchants)
			merchants.GET("/campaign/:campaign_id", merchantHandler.ListMerchantsByCampaign)
			merchants.GET("/:id", merchantHandler.GetMerchant)
			merchants.PUT("/:id", merchantHandler.UpdateMerchant)
			merchants.DELETE("/:id", merchantHandler.DeleteMerchant)
		}

		// Trap routes
		traps := protected.Group("/traps")
		{
			traps.POST("", trapHandler.CreateTrap)
			traps.POST("/generate", trapHandler.GenerateTrap)
			traps.GET("", trapHandler.ListTraps)
			traps.GET("/campaign/:campaign_id", trapHandler.ListTrapsByCampaign)
			traps.GET("/:id", trapHandler.GetTrap)
			traps.PUT("/:id", trapHandler.UpdateTrap)
			traps.DELETE("/:id", trapHandler.DeleteTrap)
		}

		// Critter routes
		critters := protected.Group("/critters")
		{
			critters.POST("", critterHandler.CreateCritter)
			critters.POST("/generate", critterHandler.GenerateCritter)
			critters.GET("", critterHandler.ListCritters)
			critters.GET("/campaign/:campaign_id", critterHandler.ListCrittersByCampaign)
			critters.GET("/:id", critterHandler.GetCritter)
			critters.PUT("/:id", critterHandler.UpdateCritter)
			critters.DELETE("/:id", critterHandler.DeleteCritter)
		}

		// Chase routes
		chases := protected.Group("/chases")
		{
			chases.POST("", chaseHandler.CreateChase)
			chases.POST("/generate", chaseHandler.GenerateChase)
			chases.GET("", chaseHandler.ListChases)
			chases.GET("/campaign/:campaign_id", chaseHandler.ListChasesByCampaign)
			chases.GET("/:id", chaseHandler.GetChase)
			chases.PUT("/:id", chaseHandler.UpdateChase)
			chases.DELETE("/:id", chaseHandler.DeleteChase)

			// Nested routes under specific chase
			chases.GET("/:id/participants", chaseHandler.ListChaseParticipants)
			chases.GET("/:id/challenges", chaseHandler.ListChaseChallenges)
			chases.GET("/:id/complications", chaseHandler.ListChaseComplications)
			chases.GET("/:id/events", chaseHandler.ListChaseEvents)

			// Participant routes
			chases.POST("/participants", chaseHandler.CreateChaseParticipant)
			chases.GET("/participants/:participant_id", chaseHandler.GetChaseParticipant)
			chases.PUT("/participants/:participant_id", chaseHandler.UpdateChaseParticipant)
			chases.DELETE("/participants/:participant_id", chaseHandler.DeleteChaseParticipant)

			// Challenge routes
			chases.POST("/challenges", chaseHandler.CreateChaseChallenge)
			chases.GET("/challenges/:challenge_id", chaseHandler.GetChaseChallenge)
			chases.DELETE("/challenges/:challenge_id", chaseHandler.DeleteChaseChallenge)

			// Complication routes
			chases.POST("/complications", chaseHandler.CreateChaseComplication)
			chases.GET("/complications/:complication_id", chaseHandler.GetChaseComplication)
			chases.PUT("/complications/:complication_id/resolve", chaseHandler.ResolveChaseComplication)
			chases.DELETE("/complications/:complication_id", chaseHandler.DeleteChaseComplication)

			// Event routes
			chases.POST("/events", chaseHandler.CreateChaseEvent)
			chases.DELETE("/:id/events", chaseHandler.DeleteChaseEvents)

			// Template routes
			chases.POST("/templates", chaseHandler.CreateChaseTemplate)
			chases.GET("/templates", chaseHandler.ListChaseTemplates)
			chases.GET("/templates/:template_id", chaseHandler.GetChaseTemplate)
			chases.DELETE("/templates/:template_id", chaseHandler.DeleteChaseTemplate)
		}

		// Character routes
		characters := protected.Group("/characters")
		{
			characters.POST("", characterHandler.CreateCharacter)
			characters.GET("", characterHandler.ListCharacters)
			characters.GET("/:id", characterHandler.GetCharacter)
			characters.PUT("/:id", characterHandler.UpdateCharacter)
			characters.DELETE("/:id", characterHandler.DeleteCharacter)
			characters.POST("/import/dndbeyond", dndBeyondHandler.ImportCharacter)
		}

		// Campaign routes
		campaigns := protected.Group("/campaigns")
		{
			campaigns.GET("", campaignHandler.GetCampaigns)
			campaigns.POST("", campaignHandler.CreateCampaign)
			campaigns.GET("/:id", campaignHandler.GetCampaign)
			campaigns.PUT("/:id", campaignHandler.UpdateCampaign)
			campaigns.DELETE("/:id", campaignHandler.DeleteCampaign)
			campaigns.PUT("/:id/activate", campaignHandler.SetActiveCampaign)
			campaigns.GET("/:id/context", campaignHandler.GetCampaignContext)

			// Chunked summary generation routes (async with progress tracking)
			campaigns.POST("/:id/summary/generate", campaignHandler.StartChunkedSummaryGeneration)
			campaigns.GET("/:id/summary/job", campaignHandler.GetActiveSummaryJob)
			campaigns.GET("/:id/summary/job/:jobId", campaignHandler.GetSummaryJobProgress)

			// Summary content settings routes
			campaigns.GET("/:id/summary-content", campaignHandler.GetSummaryContent)
			campaigns.PUT("/:id/summary-content", campaignHandler.UpdateSummaryContent)

			// Campaign content routes
			campaigns.GET("/:id/content", campaignContentHandler.GetCampaignContent)
			campaigns.POST("/:id/content", campaignContentHandler.CreateCampaignContent)
			campaigns.PUT("/:id/content/:contentId", campaignContentHandler.UpdateCampaignContent)
			campaigns.DELETE("/:id/content/:contentId", campaignContentHandler.DeleteCampaignContent)

			// Campaign status routes - NEW (restructured to avoid conflicts)
			campaigns.GET("/:id/status", campaignStatusHandler.ListCampaignStatus)
			campaigns.GET("/:id/status/:type/:contentId", campaignStatusHandler.GetContentStatus)
			campaigns.PUT("/:id/status/:type/:contentId", campaignStatusHandler.UpsertContentStatus)
			campaigns.GET("/:id/sessions", sessionHandler.ListCampaignSessions)

			// Campaign character linking routes (many-to-many)
			campaigns.GET("/:id/characters", campaignCharactersHandler.ListCampaignCharacters)
			campaigns.POST("/:id/characters/:characterId", campaignCharactersHandler.LinkCharacter)
			campaigns.DELETE("/:id/characters/:characterId", campaignCharactersHandler.UnlinkCharacter)
		}

		// Session routes - NEW
		sessions := protected.Group("/sessions")
		{
			sessions.POST("", sessionHandler.CreateSession)
			sessions.GET("/:id", sessionHandler.GetSession)
			sessions.PUT("/:id", sessionHandler.UpdateSession)
			sessions.POST("/:id/complete", sessionHandler.CompleteSession)
			sessions.DELETE("/:id", sessionHandler.DeleteSession)

			// Session events
			sessions.POST("/:id/events", sessionHandler.CreateSessionEvent)
			sessions.GET("/:id/events", sessionHandler.ListSessionEvents)
		}

		// Combat routes - NEW
		combat := protected.Group("/combat")
		{
			combat.POST("", combatHandler.CreateCombat)
			combat.GET("/:id", combatHandler.GetCombat)
			combat.PUT("/:id", combatHandler.UpdateCombat)
			combat.POST("/:id/next-turn", combatHandler.NextTurn)

			// Participants
			combat.POST("/:id/participants", combatHandler.AddParticipant)
			combat.GET("/:id/participants", combatHandler.ListParticipants)
			combat.PUT("/:id/participants/:pid", combatHandler.UpdateParticipant)
			combat.DELETE("/:id/participants/:pid", combatHandler.RemoveParticipant)

			// Conditions
			combat.POST("/:id/participants/:pid/conditions", combatHandler.AddCondition)
			combat.GET("/:id/participants/:pid/conditions", combatHandler.ListConditions)
			combat.DELETE("/:id/participants/:pid/conditions/:cid", combatHandler.RemoveCondition)
		}

		// Social encounter routes
		social := protected.Group("/social")
		{
			social.POST("", socialHandler.CreateSocialEncounter)
			social.GET("/:id", socialHandler.GetSocialEncounter)
			social.GET("/session/:session_id", socialHandler.GetSocialEncounterBySession)
			social.PUT("/:id", socialHandler.UpdateSocialEncounter)
			social.DELETE("/:id", socialHandler.DeleteSocialEncounter)

			// Social checks
			social.POST("/:id/checks", socialHandler.CreateSocialCheck)
			social.GET("/:id/checks", socialHandler.ListSocialChecks)
		}

		// Tavern session encounter routes
		tavernSession := protected.Group("/tavern-sessions")
		{
			tavernSession.POST("", tavernSessionHandler.CreateTavernEncounter)
			tavernSession.GET("/:id", tavernSessionHandler.GetTavernEncounter)
			tavernSession.GET("/session/:session_id", tavernSessionHandler.GetTavernEncounterBySession)
			tavernSession.PUT("/:id", tavernSessionHandler.UpdateTavernEncounter)
			tavernSession.DELETE("/:id", tavernSessionHandler.DeleteTavernEncounter)

			// Patron interactions
			tavernSession.POST("/:id/patrons", tavernSessionHandler.CreatePatronInteraction)
			tavernSession.GET("/:id/patrons/:interaction_id", tavernSessionHandler.GetPatronInteraction)
			tavernSession.GET("/:id/patrons", tavernSessionHandler.ListPatronInteractions)
			tavernSession.PUT("/:id/patrons/:interaction_id", tavernSessionHandler.UpdatePatronInteraction)

			// Rumors
			tavernSession.POST("/:id/rumors", tavernSessionHandler.CreateRumorTracking)
			tavernSession.GET("/:id/rumors", tavernSessionHandler.ListRumorTracking)
			tavernSession.PUT("/:id/rumors/:rumor_id", tavernSessionHandler.UpdateRumorTracking)

			// Tabs
			tavernSession.POST("/:id/tabs", tavernSessionHandler.CreateTavernTab)
			tavernSession.GET("/:id/tabs", tavernSessionHandler.ListTavernTabs)
			tavernSession.PUT("/:id/tabs/:tab_id", tavernSessionHandler.UpdateTavernTab)
		}

		// Shopping encounter routes
		shopping := protected.Group("/shopping")
		{
			shopping.POST("", shoppingHandler.CreateShoppingEncounter)
			shopping.GET("/:id", shoppingHandler.GetShoppingEncounter)
			shopping.GET("/session/:session_id", shoppingHandler.GetShoppingEncounterBySession)
			shopping.PUT("/:id", shoppingHandler.UpdateShoppingEncounter)
			shopping.DELETE("/:id", shoppingHandler.DeleteShoppingEncounter)

			// Shopping cart
			shopping.POST("/:id/cart", shoppingHandler.CreateShoppingCartItem)
			shopping.GET("/:id/cart", shoppingHandler.ListShoppingCartItems)
			shopping.PUT("/:id/cart/:item_id", shoppingHandler.UpdateShoppingCartItem)
			shopping.DELETE("/:id/cart/:item_id", shoppingHandler.DeleteShoppingCartItem)

			// Haggling
			shopping.POST("/:id/haggle", shoppingHandler.CreateHagglingSession)
			shopping.GET("/:id/haggle/:haggle_id", shoppingHandler.GetHagglingSession)
			shopping.GET("/:id/haggle", shoppingHandler.ListHagglingSessions)
			shopping.PUT("/:id/haggle/:haggle_id", shoppingHandler.UpdateHagglingSession)
		}

		// Container routes
		containers := protected.Group("/containers")
		{
			containers.GET("", containerHandler.ListContainers)
			containers.POST("", containerHandler.CreateContainer)
			containers.PUT("/:id", containerHandler.UpdateContainer)
			containers.DELETE("/:id", containerHandler.DeleteContainer)
			containers.POST("/bulk", containerHandler.BulkUpdateContainers)
		}

		// Kit routes (saved container configurations)
		kits := protected.Group("/kits")
		{
			kits.GET("", kitHandler.ListKits)
			kits.POST("", kitHandler.CreateKit)
			kits.GET("/:id", kitHandler.GetKit)
			kits.PUT("/:id", kitHandler.UpdateKit)
			kits.DELETE("/:id", kitHandler.DeleteKit)
			kits.PUT("/:id/default", kitHandler.SetDefaultKit)
			kits.POST("/:id/load", kitHandler.LoadKit)
		}

		// AI routes (protected)
		aiRoutes := protected.Group("/ai")
		{
			aiRoutes.GET("/models", aiHandler.GetModels)
			aiRoutes.POST("/generate", aiHandler.GenerateContent)
		}

		// Settings routes (protected)
		settingsRoutes := protected.Group("/settings")
		{
			settingsRoutes.POST("/ai/provider", settingsHandler.SwitchProvider)
		}

		// Session Chat routes
		chat := protected.Group("/chat")
		{
			chat.POST("/send", sessionChatHandler.SendMessage)
			chat.GET("/history/:campaign_id", sessionChatHandler.GetChatHistory)
			chat.DELETE("/history/:campaign_id", sessionChatHandler.ClearChatHistory)
		}

		// Admin routes (require admin privileges)
		admin := protected.Group("/admin")
		admin.Use(middleware.RequireAdmin())
		{
			admin.PUT("/settings", adminHandler.UpdateSettings)

			// External site management
			admin.POST("/external-sites", externalSitesHandler.RegisterCustomSite)

			// User management
			admin.GET("/users", adminHandler.ListUsers)
			admin.POST("/users", adminHandler.CreateUser)
			admin.GET("/users/:id", adminHandler.GetUser)
			admin.PUT("/users/:id", adminHandler.UpdateUser)
			admin.DELETE("/users/:id", adminHandler.DeleteUser)
			admin.POST("/users/:id/reset-password", adminHandler.ResetUserPassword)

			// RAG Knowledge Base management
			admin.GET("/rag/packs", adminHandler.GetRAGSettingPacks)
			admin.POST("/rag/scrape/:slug", adminHandler.StartRAGScrape)
			admin.GET("/rag/scrape/job/:jobId", adminHandler.GetRAGScrapeStatus)
		}
	}
}
