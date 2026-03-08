#!/usr/bin/env bash
# =============================================
# LTC Group - Docker Secrets Setup Script
# =============================================
# Creates the secrets/ directory with files for docker-compose secrets.
# Usage: ./scripts/setup_secrets.sh
# Run once before first production deployment.

set -euo pipefail

SECRETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/secrets"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}LTC Group - Docker Secrets Setup${NC}"
echo ""

mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

generate_if_missing() {
    local file="$1"
    local description="$2"
    local generator="$3"

    if [[ -f "${SECRETS_DIR}/${file}" ]]; then
        echo -e "${YELLOW}  [exists] ${file} - ${description}${NC}"
    else
        eval "$generator" > "${SECRETS_DIR}/${file}"
        chmod 600 "${SECRETS_DIR}/${file}"
        echo -e "${GREEN}  [created] ${file} - ${description}${NC}"
    fi
}

echo "Generating secrets..."

generate_if_missing "db_password.txt" "PostgreSQL password" \
    "openssl rand -base64 24 | tr -d '\n'"

generate_if_missing "redis_password.txt" "Redis password" \
    "openssl rand -base64 18 | tr -d '\n'"

generate_if_missing "jwt_secret.txt" "JWT signing key" \
    "openssl rand -hex 32 | tr -d '\n'"

generate_if_missing "encryption_key.txt" "Fernet encryption key" \
    "python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode(), end=\"\")' 2>/dev/null || openssl rand -base64 32 | tr -d '\n'"

# Build composite secrets
DB_PASSWORD=$(cat "${SECRETS_DIR}/db_password.txt")
REDIS_PASSWORD=$(cat "${SECRETS_DIR}/redis_password.txt")

echo -n "postgresql+asyncpg://ltcgroup_app:${DB_PASSWORD}@db:5432/ltcgroup" > "${SECRETS_DIR}/database_url.txt"
chmod 600 "${SECRETS_DIR}/database_url.txt"
echo -e "${GREEN}  [created] database_url.txt - Full database connection URL${NC}"

echo -n "redis://:${REDIS_PASSWORD}@redis:6379/0" > "${SECRETS_DIR}/redis_url.txt"
chmod 600 "${SECRETS_DIR}/redis_url.txt"
echo -e "${GREEN}  [created] redis_url.txt - Full Redis connection URL${NC}"

echo ""
echo -e "${GREEN}Secrets directory: ${SECRETS_DIR}${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC}"
echo "  1. Never commit the secrets/ directory to git"
echo "  2. Back up secrets securely (e.g., password manager)"
echo "  3. After creating secrets, run the app user SQL script:"
echo "     docker exec -i ltc-postgres psql -U ltcgroup -d ltcgroup < scripts/create_app_user.sql"
echo "  4. Set the app user password to match db_password.txt:"
echo "     docker exec ltc-postgres psql -U ltcgroup -d ltcgroup -c"
echo "       \"ALTER ROLE ltcgroup_app PASSWORD '${DB_PASSWORD}';\""
echo ""
echo -e "${GREEN}Deploy with:${NC}"
echo "  docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
