-- ── MIGRATION 001 ────────────────────────────────────────────
-- Adds the notifications table to an EXISTING database.
-- Run this if you already ran schema.sql before and don't want
-- to recreate everything from scratch.
--
-- Usage:
--   psql "your_database_url" -f db/migration_001_notifications.sql

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL,
    cafe_id     UUID REFERENCES cafes(id) ON DELETE CASCADE,
    type        VARCHAR(40) NOT NULL,
    title       VARCHAR(150) NOT NULL,
    body        TEXT,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tg   ON notifications(telegram_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(telegram_id, is_read);
