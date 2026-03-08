#!/usr/bin/env bash
# =============================================
# LTC Group - PostgreSQL Backup Script
# =============================================
# Creates a compressed backup of the PostgreSQL database with 7-day rotation.
# Usage: ./scripts/backup_db.sh
# Cron: 0 2 * * * /path/to/scripts/backup_db.sh >> /var/log/ltc-backup.log 2>&1

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/Users/hackingcorp/Downloads/ltcgroup/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
CONTAINER_NAME="${DB_CONTAINER:-ltc-postgres}"
DB_NAME="${POSTGRES_DB:-ltcgroup}"
DB_USER="${POSTGRES_USER:-ltcgroup}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}ERROR: $1${NC}" >&2
}

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

log "Starting PostgreSQL backup..."
log "Database: ${DB_NAME} | Container: ${CONTAINER_NAME}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    error "Container ${CONTAINER_NAME} is not running"
    exit 1
fi

# Create backup using pg_dump inside the container
log "Creating backup: ${BACKUP_FILE}"
if docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-privileges | gzip > "${BACKUP_FILE}"; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log "Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    error "Backup failed!"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Verify backup is not empty
if [[ ! -s "${BACKUP_FILE}" ]]; then
    error "Backup file is empty!"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Rotate old backups (delete files older than RETENTION_DAYS)
log "Rotating backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT=0
while IFS= read -r old_backup; do
    rm -f "$old_backup"
    DELETED_COUNT=$((DELETED_COUNT + 1))
    log "Deleted old backup: $old_backup"
done < <(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime +"${RETENTION_DAYS}" -type f 2>/dev/null)

log "Deleted ${DELETED_COUNT} old backup(s)"

# List remaining backups
REMAINING=$(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f | wc -l | tr -d ' ')
log "Total backups on disk: ${REMAINING}"

log "Backup completed successfully."
