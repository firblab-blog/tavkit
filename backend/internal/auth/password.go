package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

var (
	ErrInvalidHash         = errors.New("invalid hash format")
	ErrIncompatibleVersion = errors.New("incompatible version of argon2")
)

// PasswordHasher handles password hashing and verification
type PasswordHasher struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
	saltLength  uint32
	keyLength   uint32
}

// NewPasswordHasher creates a new password hasher with secure defaults
func NewPasswordHasher() *PasswordHasher {
	return &PasswordHasher{
		memory:      64 * 1024, // 64 MB
		iterations:  3,
		parallelism: 2,
		saltLength:  16,
		keyLength:   32,
	}
}

// HashPassword hashes a password using Argon2id
func (h *PasswordHasher) HashPassword(password string) (string, error) {
	// Generate salt
	salt := make([]byte, h.saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	// Generate hash
	hash := argon2.IDKey(
		[]byte(password),
		salt,
		h.iterations,
		h.memory,
		h.parallelism,
		h.keyLength,
	)

	// Encode to base64 with parameters
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	// Format: $argon2id$v=19$m=65536,t=3,p=2$salt$hash
	encoded := fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		h.memory,
		h.iterations,
		h.parallelism,
		b64Salt,
		b64Hash,
	)

	return encoded, nil
}

// VerifyPassword verifies a password against a hash
func (h *PasswordHasher) VerifyPassword(password, encodedHash string) (bool, error) {
	// Split hash into parts: $argon2id$v=19$m=65536,t=3,p=2$salt$hash
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return false, ErrInvalidHash
	}

	// parts[0] is empty (before first $)
	// parts[1] should be "argon2id"
	// parts[2] should be "v=19"
	// parts[3] should be "m=65536,t=3,p=2"
	// parts[4] is salt (base64)
	// parts[5] is hash (base64)

	if parts[1] != "argon2id" {
		return false, ErrInvalidHash
	}

	// Parse version
	var version int
	_, err := fmt.Sscanf(parts[2], "v=%d", &version)
	if err != nil {
		return false, ErrInvalidHash
	}

	if version != argon2.Version {
		return false, ErrIncompatibleVersion
	}

	// Parse parameters
	var memory, iterations uint32
	var parallelism uint8
	_, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism)
	if err != nil {
		return false, ErrInvalidHash
	}

	// Decode salt and hash
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, err
	}

	hash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, err
	}

	// Generate hash from provided password
	// #nosec G115 - hash length is controlled by argon2 library
	keyLength := uint32(len(hash))
	comparisonHash := argon2.IDKey(
		[]byte(password),
		salt,
		iterations,
		memory,
		parallelism,
		keyLength,
	)

	// Constant-time comparison
	if len(comparisonHash) != len(hash) {
		return false, nil
	}

	var diff byte
	for i := range hash {
		diff |= hash[i] ^ comparisonHash[i]
	}

	return diff == 0, nil
}
