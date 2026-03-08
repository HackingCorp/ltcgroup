#!/usr/bin/env bash
# =============================================
# LTC Group - PostgreSQL Restore Script
# =============================================
# Restores a PostgreSQL database from a backup file.
# Usage: ./scripts/restore_db.sh <backup_file.sql.gz>

set -euo pipefail

CONTAINER_NAME="${DB_CONTAINER:-ltc-postgres}"
DB_NAME="${POSTGRES_DB:-ltcgroup}"
DB_USER="${POSTGRES_USER:-ltcgroup}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh backups/${DB_NAME}_*.sql.gz 2>/dev/null || echo "  No backups found in ./backups/"
    exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will DROP and RECREATE the database '${DB_NAME}'${NC}"
echo -e "${YELLOW}All existing data will be lost!${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Error: Container ${CONTAINER_NAME} is not running${NC}"
    exit 1
fi

echo "Stopping backend service..."
docker-compose stop backend kyc-verifier 2>/dev/null || true

echo "Dropping and recreating database..."
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '${DB_NAME}' AND pid <> pg_backend_pid();
"
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "Restoring from: ${BACKUP_FILE}"
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" --quiet

echo ""
echo -e "${GREEN}Restore completed successfully.${NC}"
echo ""
echo "Restarting backend services..."
docker-compose up -d backend kyc-verifier

echo -e "${GREEN}Done. Verify with: docker-compose ps${NC}"
