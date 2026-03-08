#!/bin/sh
# =============================================
# Docker Entrypoint - Secret File Loader
# =============================================
# Reads Docker Secrets from /run/secrets/ and exports them as env vars.
# For each VAR_NAME_FILE env var, reads the file and sets VAR_NAME.

# Load secrets from _FILE env vars
for var in DATABASE_URL JWT_SECRET_KEY ENCRYPTION_KEY REDIS_URL; do
    file_var="${var}_FILE"
    eval file_path="\${$file_var:-}"
    if [ -n "$file_path" ] && [ -f "$file_path" ]; then
        export "$var"="$(cat "$file_path")"
    fi
done

# Execute the main command
exec "$@"
