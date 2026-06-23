-- =============================================================================
-- ShipFlow AI — PostgreSQL Initialization Script
-- Runs once when the container is first created.
-- =============================================================================

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for fuzzy text search

-- Set default timezone
SET timezone = 'UTC';

-- Verify setup
SELECT version();
SELECT current_database(), current_user, now();
