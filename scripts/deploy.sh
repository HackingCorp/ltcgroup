#!/usr/bin/env bash
# =============================================
# LTC Group - Production Deployment Script
# =============================================
# Deploys or updates the production stack.
# Usage: ./scripts/deploy.sh [--init|--update|--ssl-init]

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

COMPOSE="docker-compose -f docker-compose.yml -f docker-compose.prod.yml"
DOMAIN="${DOMAIN:-api.ltcgroup.site}"

usage() {
    echo "Usage: $0 [--init|--update|--ssl-init|--backup|--status]"
    echo ""
    echo "  --init      First-time deployment (setup secrets, build, start)"
    echo "  --update    Pull latest code and restart services"
    echo "  --ssl-init  Initialize Let's Encrypt SSL certificate"
    echo "  --backup    Trigger an immediate database backup"
    echo "  --status    Show service status and health"
}

init() {
    echo -e "${GREEN}=== Initial Deployment ===${NC}"

    # Setup secrets
    if [[ ! -d "$PROJECT_DIR/secrets" ]]; then
        echo "Setting up Docker secrets..."
        bash "$PROJECT_DIR/scripts/setup_secrets.sh"
    else
        echo -e "${YELLOW}Secrets directory already exists, skipping...${NC}"
    fi

    # Build and start
    echo "Building images..."
    $COMPOSE build

    echo "Starting services..."
    $COMPOSE up -d

    echo "Waiting for database..."
    sleep 10

    # Create app user
    echo "Creating database app user..."
    DB_PASS=$(cat "$PROJECT_DIR/secrets/db_password.txt")
    docker exec ltc-postgres psql -U ltcgroup -d ltcgroup -c \
        "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='ltcgroup_app') THEN CREATE ROLE ltcgroup_app WITH LOGIN PASSWORD '${DB_PASS}'; END IF; END \$\$;"
    docker exec -i ltc-postgres psql -U ltcgroup -d ltcgroup < "$PROJECT_DIR/scripts/create_app_user.sql" || true

    echo ""
    echo -e "${GREEN}Deployment complete.${NC}"
    $COMPOSE ps
}

update() {
    echo -e "${GREEN}=== Updating Services ===${NC}"

    # Trigger backup before update
    echo "Creating pre-update backup..."
    bash "$PROJECT_DIR/scripts/backup_db.sh" || true

    echo "Pulling latest images..."
    $COMPOSE pull --ignore-pull-failures

    echo "Rebuilding custom images..."
    $COMPOSE build

    echo "Restarting services..."
    $COMPOSE up -d --force-recreate

    echo ""
    echo -e "${GREEN}Update complete.${NC}"
    $COMPOSE ps
}

ssl_init() {
    echo -e "${GREEN}=== Initializing SSL Certificate ===${NC}"

    # Start nginx first (for ACME challenge)
    echo "Starting nginx for ACME challenge..."
    $COMPOSE up -d nginx

    echo "Requesting certificate for ${DOMAIN}..."
    docker-compose run --rm certbot certonly \
        --webroot \
        -w /var/www/certbot \
        -d "$DOMAIN" \
        --email "admin@ltcgroup.site" \
        --agree-tos \
        --no-eff-email

    echo "Reloading nginx..."
    docker exec ltc-nginx nginx -s reload

    echo -e "${GREEN}SSL certificate installed for ${DOMAIN}.${NC}"
}

backup_now() {
    echo -e "${GREEN}=== Triggering Immediate Backup ===${NC}"
    bash "$PROJECT_DIR/scripts/backup_db.sh"
}

status() {
    echo -e "${GREEN}=== Service Status ===${NC}"
    $COMPOSE ps
    echo ""
    echo -e "${GREEN}=== Health Checks ===${NC}"
    for svc in backend db redis; do
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' "ltc-${svc}" 2>/dev/null || echo "unknown")
        echo "  ltc-${svc}: ${STATUS}"
    done
    echo ""
    echo -e "${GREEN}=== Disk Usage ===${NC}"
    docker system df
}

case "${1:-}" in
    --init)     init ;;
    --update)   update ;;
    --ssl-init) ssl_init ;;
    --backup)   backup_now ;;
    --status)   status ;;
    *)          usage ;;
esac
