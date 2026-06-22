-- ── MIGRATION 003 ────────────────────────────────────────────
-- Simplifies the credit model: removes the separate credit
-- application/approval flow entirely. Instead:
--   - per_cafe_accounts.balance becomes a single SIGNED number
--     (positive = deposited funds available, negative = customer
--     is using credit / owes money)
--   - per_cafe_accounts.credit_limit is set directly by the cafe
--     owner at any time (no application needed) and defines how
--     far negative the balance is allowed to go
--   - credit_used is removed (it's now implicit in a negative
--     balance)
--   - the credit_applications table is dropped entirely
--
-- IMPORTANT: this migration folds any existing credit_used back
-- into balance before dropping the column, so no money is lost:
--   new_balance = old_balance - old_credit_used
-- (e.g. balance=0, credit_used=150 -> new_balance = -150,
--  meaning the customer owes 150 ETB, matching the old state)
--
-- Usage:
--   psql "your_database_url" -f db/migration_003_signed_balance.sql

BEGIN;

-- Fold credit_used into balance as a negative amount, only if
-- the column still exists (safe to re-run)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'per_cafe_accounts' AND column_name = 'credit_used'
  ) THEN
    UPDATE per_cafe_accounts
    SET balance = balance - credit_used
    WHERE credit_used > 0;

    ALTER TABLE per_cafe_accounts DROP COLUMN credit_used;
  END IF;
END $$;

-- Drop the credit applications table and its indexes entirely
DROP TABLE IF EXISTS credit_applications;

COMMIT;
