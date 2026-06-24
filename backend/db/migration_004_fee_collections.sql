-- ── MIGRATION 004 ────────────────────────────────────────────
-- Adds fee_collections table to track weekly item counts and
-- service fees collected per cafe. Each row is one "week" that
-- the admin manually closed by pressing the Restart button.
--
-- Usage:
--   psql "your_external_database_url" -f db/migration_004_fee_collections.sql

CREATE TABLE IF NOT EXISTS fee_collections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id         UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    -- The week being closed
    period_start    TIMESTAMP NOT NULL,  -- when last Restart was pressed (or cafe creation)
    period_end      TIMESTAMP NOT NULL DEFAULT NOW(),
    -- Totals for that period
    total_items     INT NOT NULL DEFAULT 0,   -- sum of all item quantities
    total_fee       NUMERIC(10,2) NOT NULL DEFAULT 0, -- sum of service_fee across approved orders
    -- Who pressed restart and when
    collected_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    collected_by    VARCHAR(100)  -- admin name or telegram_id
);

CREATE INDEX IF NOT EXISTS idx_fee_collections_cafe
    ON fee_collections(cafe_id);

CREATE INDEX IF NOT EXISTS idx_fee_collections_date
    ON fee_collections(cafe_id, collected_at DESC);
