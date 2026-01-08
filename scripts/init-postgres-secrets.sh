#!/bin/bash
# =============================================================================
# PostgreSQL Secrets Initialization Script
# =============================================================================
# This script generates secure random passwords for PostgreSQL when using
# the bundled PostgreSQL container (tavkit-postgres).
#
# It creates a .postgres-secrets file that is:
# - Automatically loaded by docker-compose
# - Excluded from git via .gitignore
# - Only generated once (won't overwrite existing secrets)
#
# Usage:
#   ./scripts/init-postgres-secrets.sh
#
# The script will:
# 1. Check if secrets already exist
# 2. Generate cryptographically secure passwords
# 3. Create .postgres-secrets with the credentials
# 4. Set proper file permissions (600)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_FILE="$PROJECT_ROOT/.postgres-secrets"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Generate a cryptographically secure random password
generate_password() {
    local length=${1:-32}
    # Use /dev/urandom for cryptographically secure random bytes
    # Filter to alphanumeric + safe special chars, avoid shell-problematic chars
    LC_ALL=C tr -dc 'A-Za-z0-9!@#%^*_+=?' < /dev/urandom | head -c "$length"
}

# Main logic
main() {
    print_info "TavKit PostgreSQL Secrets Initialization"
    echo ""

    # Check if secrets file already exists
    if [ -f "$SECRETS_FILE" ]; then
        print_warning "Secrets file already exists at: $SECRETS_FILE"
        print_info "To regenerate secrets, delete the file and run this script again."
        print_info "WARNING: Regenerating secrets will require a fresh database!"
        echo ""

        # Show current configuration (masked)
        if grep -q "POSTGRES_PASSWORD=" "$SECRETS_FILE" 2>/dev/null; then
            print_success "PostgreSQL secrets are configured."
        fi
        exit 0
    fi

    print_info "Generating secure PostgreSQL credentials..."
    echo ""

    # Generate passwords
    POSTGRES_PASSWORD=$(generate_password 32)

    # Create secrets file
    cat > "$SECRETS_FILE" << EOF
# =============================================================================
# TavKit PostgreSQL Secrets (Auto-generated)
# =============================================================================
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
#
# SECURITY NOTES:
# - This file contains sensitive credentials
# - It is excluded from git via .gitignore
# - File permissions should be 600 (owner read/write only)
# - Do NOT share or commit this file
# - Back up securely if needed for disaster recovery
#
# To regenerate secrets:
# 1. Stop all containers: docker compose down
# 2. Delete the PostgreSQL volume: docker volume rm tavkit_postgres-data
# 3. Delete this file: rm .postgres-secrets
# 4. Run: ./scripts/init-postgres-secrets.sh
# 5. Start containers: docker compose --profile postgres up
# =============================================================================

# PostgreSQL Database Password
# Used by both the PostgreSQL container and the backend service
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Database configuration (these match docker-compose defaults)
# Override in .env if you want different values
# POSTGRES_DB=tavkit
# POSTGRES_USER=tavkit
EOF

    # Set restrictive permissions
    chmod 600 "$SECRETS_FILE"

    print_success "PostgreSQL secrets generated successfully!"
    echo ""
    print_info "Secrets file created at: $SECRETS_FILE"
    print_info "File permissions set to 600 (owner read/write only)"
    echo ""

    # Verify .gitignore includes the secrets file
    GITIGNORE_FILE="$PROJECT_ROOT/.gitignore"
    if [ -f "$GITIGNORE_FILE" ]; then
        if ! grep -q "\.postgres-secrets" "$GITIGNORE_FILE" 2>/dev/null; then
            print_warning ".postgres-secrets not found in .gitignore"
            print_info "Adding .postgres-secrets to .gitignore..."
            echo "" >> "$GITIGNORE_FILE"
            echo "# PostgreSQL secrets (auto-generated, never commit)" >> "$GITIGNORE_FILE"
            echo ".postgres-secrets" >> "$GITIGNORE_FILE"
            print_success "Added to .gitignore"
        else
            print_success ".postgres-secrets is already in .gitignore"
        fi
    fi

    echo ""
    print_info "Next steps:"
    echo "  1. Start PostgreSQL: docker compose --profile postgres up -d postgres"
    echo "  2. Or start everything: docker compose --profile postgres up"
    echo ""
    print_info "The backend will automatically use the generated password."
    echo ""
}

main "$@"
