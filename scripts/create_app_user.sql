-- =============================================
-- LTC Group - Create Non-Superuser Database Role
-- =============================================
-- This script creates a restricted PostgreSQL role for the application.
-- The app user only gets SELECT/INSERT/UPDATE/DELETE on tables,
-- plus USAGE/SELECT on sequences (for auto-increment columns).
--
-- Usage:
--   docker exec -i ltc-postgres psql -U ltcgroup -d ltcgroup < scripts/create_app_user.sql
--
-- After running, update DATABASE_URL in .env:
--   DATABASE_URL=postgresql+asyncpg://ltcgroup_app:<password>@db:5432/ltcgroup

-- Create the application role (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ltcgroup_app') THEN
        CREATE ROLE ltcgroup_app WITH LOGIN PASSWORD 'CHANGE_ME_APP_PASSWORD';
    END IF;
END
$$;

-- Connect to the application database
\connect ltcgroup

-- Grant CONNECT on the database
GRANT CONNECT ON DATABASE ltcgroup TO ltcgroup_app;

-- Grant USAGE on the public schema
GRANT USAGE ON SCHEMA public TO ltcgroup_app;

-- Grant DML privileges on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ltcgroup_app;

-- Grant USAGE, SELECT on all sequences (needed for serial/identity columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ltcgroup_app;

-- Set default privileges for future tables created by ltcgroup (the superuser)
ALTER DEFAULT PRIVILEGES FOR ROLE ltcgroup IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ltcgroup_app;

ALTER DEFAULT PRIVILEGES FOR ROLE ltcgroup IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO ltcgroup_app;

-- Explicitly deny dangerous operations
REVOKE CREATE ON SCHEMA public FROM ltcgroup_app;
REVOKE ALL ON DATABASE ltcgroup FROM ltcgroup_app;
GRANT CONNECT ON DATABASE ltcgroup TO ltcgroup_app;

-- Verify grants
\echo '--- Grants for ltcgroup_app ---'
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'ltcgroup_app'
ORDER BY table_name, privilege_type;
