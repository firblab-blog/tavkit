package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements token bucket algorithm
type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	rate     int
	burst    int
}

type visitor struct {
	limiter  *tokenBucket
	lastSeen time.Time
}

type tokenBucket struct {
	tokens     int
	maxTokens  int
	refillRate int
	lastRefill time.Time
	mu         sync.Mutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(rate, burst int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		burst:    burst,
	}

	// Clean up old visitors every minute
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			rl.cleanupVisitors()
		}
	}()

	return rl
}

// getVisitor retrieves or creates a visitor
func (rl *RateLimiter) getVisitor(ip string) *visitor {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		v = &visitor{
			limiter: &tokenBucket{
				tokens:     rl.burst,
				maxTokens:  rl.burst,
				refillRate: rl.rate,
				lastRefill: time.Now(),
			},
			lastSeen: time.Now(),
		}
		rl.visitors[ip] = v
	}

	v.lastSeen = time.Now()
	return v
}

// cleanupVisitors removes inactive visitors
func (rl *RateLimiter) cleanupVisitors() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	threshold := time.Now().Add(-5 * time.Minute)
	for ip, v := range rl.visitors {
		if v.lastSeen.Before(threshold) {
			delete(rl.visitors, ip)
		}
	}
}

// allow checks if request is allowed
func (tb *tokenBucket) allow() bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	// Refill tokens based on time elapsed
	now := time.Now()
	elapsed := now.Sub(tb.lastRefill)
	tokensToAdd := int(elapsed.Seconds()) * tb.refillRate

	if tokensToAdd > 0 {
		tb.tokens += tokensToAdd
		if tb.tokens > tb.maxTokens {
			tb.tokens = tb.maxTokens
		}
		tb.lastRefill = now
	}

	// Check if tokens available
	if tb.tokens > 0 {
		tb.tokens--
		return true
	}

	return false
}

// RateLimitMiddleware implements rate limiting
func RateLimitMiddleware(limiter *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		visitor := limiter.getVisitor(ip)

		if !visitor.limiter.allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
