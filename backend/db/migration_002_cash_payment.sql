-- ── MIGRATION 002 ────────────────────────────────────────────
-- Fixes the orders.payment_method CHECK constraint, which was
-- created before 'cash' existed as a payment option. Without
-- this, every cash order fails with:
--   "new row for relation "orders" violates check constraint
--    "orders_payment_method_check""
--
-- Usage:
--   psql "your_database_url" -f db/migration_002_cash_payment.sql

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('wallet', 'transfer', 'cash'));
