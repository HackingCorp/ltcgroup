#!/usr/bin/env bash
# =============================================
# LTC Group - Secret Generation Script
# =============================================
# Generates strong random secrets for all sensitive environment variables.
# Usage: ./scripts/generate_secrets.sh [--apply]
#   --apply: Write secrets directly to .env file (otherwise prints to stdout)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

generate_hex() {
    openssl rand -hex "$1"
}

generate_base64() {
    openssl rand -base64 "$1" | tr -d '\n'
}

generate_fernet_key() {
    python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null \
        || openssl rand -base64 32
}

generate_password() {
    # 24-char password with mixed characters
    openssl rand -base64 18 | tr -d '\n'
}

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  LTC Group - Secret Generator${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Generate all secrets
POSTGRES_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(generate_password)
PGADMIN_PASSWORD=$(generate_password)
JWT_SECRET_KEY=$(generate_hex 32)
ENCRYPTION_KEY=$(generate_fernet_key)
KYC_VERIFIER_API_KEY=$(generate_hex 32)
PAYIN_WEBHOOK_SECRET=$(generate_hex 32)
ENKAP_WEBHOOK_SECRET=$(generate_hex 32)

if [[ "${1:-}" == "--apply" ]]; then
    ENV_FILE="${2:-.env}"
    if [[ ! -f "$ENV_FILE" ]]; then
        echo -e "${RED}Error: $ENV_FILE not found${NC}"
        exit 1
    fi

    # Backup current .env
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d%H%M%S)"
    echo -e "${YELLOW}Backup created: ${ENV_FILE}.backup.*${NC}"

    # Replace values in .env
    sed -i.bak "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" "$ENV_FILE"
    sed -i.bak "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASSWORD}|" "$ENV_FILE"
    sed -i.bak "s|^PGADMIN_PASSWORD=.*|PGADMIN_PASSWORD=${PGADMIN_PASSWORD}|" "$ENV_FILE"
    sed -i.bak "s|^JWT_SECRET_KEY=.*|JWT_SECRET_KEY=${JWT_SECRET_KEY}|" "$ENV_FILE"
    sed -i.bak "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${ENCRYPTION_KEY}|" "$ENV_FILE"
    sed -i.bak "s|^KYC_VERIFIER_API_KEY=.*|KYC_VERIFIER_API_KEY=${KYC_VERIFIER_API_KEY}|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"

    echo -e "${GREEN}Secrets updated in $ENV_FILE${NC}"
    echo -e "${YELLOW}IMPORTANT: Restart all containers after updating secrets:${NC}"
    echo "  docker-compose down && docker-compose up -d"
    echo ""
    echo -e "${YELLOW}NOTE: If PostgreSQL password changed, you must also:${NC}"
    echo "  1. docker-compose exec db psql -U ltcgroup -c \"ALTER USER ltcgroup PASSWORD '${POSTGRES_PASSWORD}';\""
    echo "  2. Or recreate the database volume: docker volume rm ltcgroup_postgres_data"
else
    echo "Generated secrets (copy to your .env file):"
    echo ""
    echo "# --- PostgreSQL ---"
    echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
    echo ""
    echo "# --- Redis ---"
    echo "REDIS_PASSWORD=${REDIS_PASSWORD}"
    echo ""
    echo "# --- pgAdmin ---"
    echo "PGADMIN_PASSWORD=${PGADMIN_PASSWORD}"
    echo ""
    echo "# --- JWT ---"
    echo "JWT_SECRET_KEY=${JWT_SECRET_KEY}"
    echo ""
    echo "# --- Encryption (Fernet) ---"
    echo "ENCRYPTION_KEY=${ENCRYPTION_KEY}"
    echo ""
    echo "# --- KYC Verifier ---"
    echo "KYC_VERIFIER_API_KEY=${KYC_VERIFIER_API_KEY}"
    echo ""
    echo "# --- Webhook Secrets ---"
    echo "PAYIN_WEBHOOK_SECRET=${PAYIN_WEBHOOK_SECRET}"
    echo "ENKAP_WEBHOOK_SECRET=${ENKAP_WEBHOOK_SECRET}"
    echo ""
    echo -e "${YELLOW}Run with --apply to update .env automatically:${NC}"
    echo "  ./scripts/generate_secrets.sh --apply"
fi

echo ""
echo -e "${GREEN}Secret Rotation Procedure:${NC}"
echo "  1. Generate new secrets: ./scripts/generate_secrets.sh --apply"
echo "  2. Re-encrypt card data: python backend/scripts/re_encrypt_cards.py"
echo "  3. Restart services: docker-compose down && docker-compose up -d"
echo "  4. Verify health: docker-compose ps && curl -s http://localhost:8000/health"
echo "  5. Test login flow in the mobile app"
