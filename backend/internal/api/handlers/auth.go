package handlers

import (
	"net/http"

	"tavkit/internal/api/middleware"
	"tavkit/internal/auth"
	"tavkit/internal/config"
	"tavkit/internal/db"
	"tavkit/internal/seed"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type AuthHandler struct {
	db         db.Database
	jwtManager *auth.JWTManager
	hasher     *auth.PasswordHasher
	logger     *zap.Logger
	authConfig *config.AuthConfig
}

func NewAuthHandler(database db.Database, jwtManager *auth.JWTManager, logger *zap.Logger, authConfig *config.AuthConfig) *AuthHandler {
	return &AuthHandler{
		db:         database,
		jwtManager: jwtManager,
		hasher:     auth.NewPasswordHasher(),
		logger:     logger,
		authConfig: authConfig,
	}
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token     string   `json:"token,omitempty"` // Deprecated: token now sent via HttpOnly cookie
	CSRFToken string   `json:"csrf_token"`      // CSRF token for state-changing requests
	User      *db.User `json:"user"`
}

// setAuthCookies sets the JWT token as an HttpOnly cookie and CSRF token as a readable cookie
func (h *AuthHandler) setAuthCookies(c *gin.Context, token, csrfToken string) {
	// Parse JWT expiration to set cookie max age
	maxAge := 24 * 60 * 60 // Default 24 hours in seconds

	// Determine SameSite mode
	sameSite := http.SameSiteLaxMode
	switch h.authConfig.CookieSameSite {
	case "Strict":
		sameSite = http.SameSiteStrictMode
	case "None":
		sameSite = http.SameSiteNoneMode
	default:
		sameSite = http.SameSiteLaxMode
	}

	// Set JWT token as HttpOnly cookie (not accessible via JavaScript)
	c.SetSameSite(sameSite)
	c.SetCookie(
		"auth_token",              // name
		token,                     // value
		maxAge,                    // max age in seconds
		"/",                       // path
		h.authConfig.CookieDomain, // domain
		h.authConfig.CookieSecure, // secure (HTTPS only)
		true,                      // httpOnly (not accessible via JS)
	)

	// Set CSRF token as readable cookie (accessible via JavaScript for headers)
	c.SetCookie(
		middleware.CSRFCookieName, // name
		csrfToken,                 // value
		maxAge,                    // max age in seconds
		"/",                       // path
		h.authConfig.CookieDomain, // domain
		h.authConfig.CookieSecure, // secure (HTTPS only)
		false,                     // httpOnly = false so JS can read it
	)
}

// clearAuthCookies removes auth cookies on logout
func (h *AuthHandler) clearAuthCookies(c *gin.Context) {
	c.SetCookie("auth_token", "", -1, "/", h.authConfig.CookieDomain, h.authConfig.CookieSecure, true)
	c.SetCookie(middleware.CSRFCookieName, "", -1, "/", h.authConfig.CookieDomain, h.authConfig.CookieSecure, false)
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	// Check if registration is enabled
	settings, err := h.db.GetSettings(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get settings", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check registration status"})
		return
	}

	if !settings.RegistrationEnabled {
		c.JSON(http.StatusForbidden, gin.H{"error": "registration is currently disabled"})
		return
	}

	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash password
	hashedPassword, err := h.hasher.HashPassword(req.Password)
	if err != nil {
		h.logger.Error("Failed to hash password", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process password"})
		return
	}

	// Create user
	user := &db.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: hashedPassword,
		IsAdmin:      false, // New users are not admins by default
	}

	if err := h.db.CreateUser(c.Request.Context(), user); err != nil {
		h.logger.Error("Failed to create user", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	// Create user context for "continue where you left off" functionality
	userContext := &db.UserContext{
		UserID:                 user.ID,
		HasCompletedOnboarding: false,
	}
	if err := h.db.CreateUserContext(c.Request.Context(), userContext); err != nil {
		h.logger.Warn("Failed to create user context for new user",
			zap.String("user_id", user.ID),
			zap.Error(err))
		// Don't fail registration, just log warning
	}

	// Seed default campaign for new user if enabled
	if settings.DefaultCampaignEnabled {
		seeder := seed.NewCrossroadsChronicleSeeder(h.db, h.logger)
		if seedErr := seeder.SeedForUser(c.Request.Context(), user.ID); seedErr != nil {
			h.logger.Warn("Failed to seed default campaign for new user",
				zap.String("user_id", user.ID),
				zap.Error(seedErr))
			// Don't fail registration, just log warning
		}
	}

	// Generate JWT token
	token, err := h.jwtManager.GenerateToken(user.ID, user.Username, user.IsAdmin)
	if err != nil {
		h.logger.Error("Failed to generate token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	// Generate CSRF token
	csrfToken, err := middleware.GetCSRFStore().GenerateToken(user.ID)
	if err != nil {
		h.logger.Error("Failed to generate CSRF token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate security token"})
		return
	}

	// Set HttpOnly auth cookie and CSRF cookie
	h.setAuthCookies(c, token, csrfToken)

	// Password hash is already hidden by json:"-" tag
	c.JSON(http.StatusCreated, AuthResponse{
		CSRFToken: csrfToken,
		User:      user,
	})
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.logger.Debug("Login attempt",
		zap.String("email", req.Email),
		zap.Int("password_length", len(req.Password)),
	)

	// Get user by email
	user, err := h.db.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil {
		h.logger.Debug("User not found", zap.String("email", req.Email), zap.Error(err))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	h.logger.Debug("User found, verifying password",
		zap.String("email", user.Email),
		zap.String("hash_preview", user.PasswordHash[:50]+"..."),
	)

	// Verify password
	valid, err := h.hasher.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil {
		h.logger.Debug("Password verification error", zap.Error(err))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if !valid {
		h.logger.Debug("Password verification failed - password mismatch")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	h.logger.Debug("Password verified successfully")

	// Generate JWT token
	token, err := h.jwtManager.GenerateToken(user.ID, user.Username, user.IsAdmin)
	if err != nil {
		h.logger.Error("Failed to generate token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	// Generate CSRF token
	csrfToken, err := middleware.GetCSRFStore().GenerateToken(user.ID)
	if err != nil {
		h.logger.Error("Failed to generate CSRF token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate security token"})
		return
	}

	// Set HttpOnly auth cookie and CSRF cookie
	h.setAuthCookies(c, token, csrfToken)

	// Password hash is already hidden by json:"-" tag
	c.JSON(http.StatusOK, AuthResponse{
		CSRFToken: csrfToken,
		User:      user,
	})
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get user ID from context to invalidate CSRF token
	userID, exists := c.Get("user_id")
	if exists {
		middleware.GetCSRFStore().InvalidateToken(userID.(string))
	}

	// Clear auth cookies
	h.clearAuthCookies(c)

	c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}

// RefreshCSRF generates a new CSRF token for the authenticated user
func (h *AuthHandler) RefreshCSRF(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	// Generate new CSRF token
	csrfToken, err := middleware.GetCSRFStore().GenerateToken(userID.(string))
	if err != nil {
		h.logger.Error("Failed to generate CSRF token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate security token"})
		return
	}

	// Update CSRF cookie
	maxAge := 24 * 60 * 60
	sameSite := http.SameSiteLaxMode
	switch h.authConfig.CookieSameSite {
	case "Strict":
		sameSite = http.SameSiteStrictMode
	case "None":
		sameSite = http.SameSiteNoneMode
	}
	c.SetSameSite(sameSite)
	c.SetCookie(
		middleware.CSRFCookieName,
		csrfToken,
		maxAge,
		"/",
		h.authConfig.CookieDomain,
		h.authConfig.CookieSecure,
		false,
	)

	c.JSON(http.StatusOK, gin.H{"csrf_token": csrfToken})
}
