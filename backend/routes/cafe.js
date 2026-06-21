import express from 'express';
import pool from '../db/connection.js';
import { telegramAuth, cafeOwnerAuth } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();
router.use(telegramAuth, cafeOwnerAuth);

// ── GET /api/cafe/dashboard ───────────────────────────────────
// Revenue is split by payment type:
//   wallet_revenue -> orders paid from deposited balance/credit
//   instant_revenue -> orders paid by cash or transfer
// so the cafe owner's Profile page can show them separately.
router.get('/dashboard', async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE cafe_id = $1 AND status = 'pending')               AS pending_orders,
        (SELECT COUNT(*) FROM orders WHERE cafe_id = $1 AND status = 'approved'
          AND created_at >= NOW() - INTERVAL '30 days')                                        AS approved_orders_30d,
        (SELECT COUNT(*) FROM per_cafe_accounts WHERE cafe_id = $1 AND status = 'approved')   AS total_customers,
        (SELECT COUNT(*) FROM per_cafe_accounts WHERE cafe_id = $1 AND status = 'pending')    AS pending_registrations,
        (SELECT COUNT(*) FROM credit_applications WHERE cafe_id = $1 AND status = 'pending')  AS pending_credit_apps,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE cafe_id = $1
          AND status = 'approved' AND created_at >= NOW() - INTERVAL '30 days')               AS revenue_30d,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE cafe_id = $1
          AND status = 'approved' AND payment_method = 'wallet'
          AND created_at >= NOW() - INTERVAL '30 days')                                        AS wallet_revenue_30d,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE cafe_id = $1
          AND status = 'approved' AND payment_method IN ('cash','transfer')
          AND created_at >= NOW() - INTERVAL '30 days')                                        AS instant_revenue_30d,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE cafe_id = $1
          AND status = 'approved' AND created_at::date = CURRENT_DATE)                         AS revenue_today,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE cafe_id = $1
          AND status = 'approved' AND payment_method = 'wallet'
          AND created_at::date = CURRENT_DATE)                                                  AS wallet_revenue_today,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE cafe_id = $1
          AND status = 'approved' AND payment_method IN ('cash','transfer')
          AND created_at::date = CURRENT_DATE)                                                  AS instant_revenue_today,
        (SELECT COALESCE(SUM(amount),0) FROM deposits WHERE cafe_id = $1
          AND status = 'verified' AND created_at >= NOW() - INTERVAL '30 days')                AS deposits_30d
    `, [cafe_id]);
    res.json(stats.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── GET /api/cafe/registrations ───────────────────────────────
router.get('/registrations', async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;
    const result = await pool.query(`
      SELECT pca.id, pca.status, pca.registered_at, ga.name, ga.phone, ga.telegram_id
      FROM per_cafe_accounts pca
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE pca.cafe_id = $1 AND pca.status = 'pending'
      ORDER BY pca.registered_at ASC
    `, [cafe_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── PATCH /api/cafe/registrations/:pcaId/approve ─────────────
router.patch('/registrations/:pcaId/approve', async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;
    const result = await pool.query(`
      UPDATE per_cafe_accounts
      SET status = 'approved', approved_at = NOW()
      WHERE id = $1 AND cafe_id = $2 AND status = 'pending'
      RETURNING *
    `, [req.params.pcaId, cafe_id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Registration not found' });
    const pca = result.rows[0];

    const ga = await pool.query('SELECT telegram_id, name FROM global_accounts WHERE id = $1', [pca.global_account_id]);
    const cafe = await pool.query('SELECT name FROM cafes WHERE id = $1', [cafe_id]);
    if (ga.rows.length > 0) {
      createNotification({
        telegramId: ga.rows[0].telegram_id,
        cafeId:     cafe_id,
        type:       'registration_approved',
        title:      `Registration approved!`,
        body:       `${cafe.rows[0]?.name || 'The cafe'} approved your account. You can now use wallet balance and credit.`
      });
    }

    res.json(pca);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── PATCH /api/cafe/registrations/:pcaId/reject ──────────────
router.patch('/registrations/:pcaId/reject', async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;
    const result = await pool.query(`
      UPDATE per_cafe_accounts SET status = 'suspended'
      WHERE id = $1 AND cafe_id = $2 AND status = 'pending'
      RETURNING *
    `, [req.params.pcaId, cafe_id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Registration not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── GET /api/cafe/customers ───────────────────────────────────
// All approved customers, with their balance — used by both the
// Customers page and the Credit Applications upper-tab page.
router.get('/customers', async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;
    const result = await pool.query(`
      SELECT pca.id, pca.balance, pca.credit_limit, pca.credit_used,
             pca.status, pca.registered_at,
             ga.name, ga.phone, ga.telegram_id
      FROM per_cafe_accounts pca
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE pca.cafe_id = $1 AND pca.status = 'approved'
      ORDER BY ga.name ASC
    `, [cafe_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── GET /api/cafe/customers/:pcaId ───────────────────────────
// Single customer — full profile: balance, credit, last 30 days
// orders AND deposits (each with the payer's name, even though
// the payer is always the same customer here — included for
// clarity/consistency with the design request).
router.get('/customers/:pcaId', async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;

    const account = await pool.query(`
      SELECT pca.*, ga.name, ga.phone, ga.telegram_id
      FROM per_cafe_accounts pca
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE pca.id = $1 AND pca.cafe_id = $2
    `, [req.params.pcaId, cafe_id]);

    if (account.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    const customer = account.rows[0];

    const orders = await pool.query(`
      SELECT o.*,
        json_agg(json_build_object(
          'name', oi.name, 'quantity', oi.quantity, 'item_total', oi.item_total
        )) AS items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.per_cafe_account_id = $1
        AND o.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY o.id ORDER BY o.created_at DESC
    `, [req.params.pcaId]);

    const deposits = await pool.query(`
      SELECT id, amount, payment_method, transaction_number, status, created_at, verified_at
      FROM deposits
      WHERE per_cafe_account_id = $1
      ORDER BY created_at DESC
    `, [req.params.pcaId]);

    // Attach payer name to every deposit/order row for display
    const deposits_with_payer = deposits.rows.map(d => ({ ...d, payer_name: customer.name }));
    const orders_with_payer   = orders.rows.map(o => ({ ...o, payer_name: customer.name }));

    res.json({
      customer,
      orders:   orders_with_payer,
      deposits: deposits_with_payer
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/cafe/settings ─────────────────────────────────────
router.get('/settings', async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;
    const result = await pool.query(
      'SELECT id, name, service_fee FROM cafes WHERE id = $1',
      [cafe_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cafe not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── PATCH /api/cafe/customers/:pcaId/credit-limit ─────────────
// Cafe owner sets a customer's credit limit directly from their
// profile/detail page.
router.patch('/customers/:pcaId/credit-limit', async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;
    const { credit_limit } = req.body;

    const limit = parseFloat(credit_limit);
    if (isNaN(limit) || limit < 0) {
      return res.status(400).json({ error: 'credit_limit must be a non-negative number' });
    }

    const result = await pool.query(`
      UPDATE per_cafe_accounts
      SET credit_limit = $1
      WHERE id = $2 AND cafe_id = $3 AND status = 'approved'
      RETURNING id, global_account_id, balance, credit_limit, credit_used
    `, [limit, req.params.pcaId, cafe_id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    const pca = result.rows[0];

    const ga = await pool.query('SELECT telegram_id FROM global_accounts WHERE id = $1', [pca.global_account_id]);
    const cafe = await pool.query('SELECT name FROM cafes WHERE id = $1', [cafe_id]);
    if (ga.rows.length > 0) {
      createNotification({
        telegramId: ga.rows[0].telegram_id,
        cafeId:     cafe_id,
        type:       'credit_limit_set',
        title:      `Credit limit updated — ${limit.toFixed(2)} ETB`,
        body:       `${cafe.rows[0]?.name || 'The cafe'} set your credit limit to ${limit.toFixed(2)} ETB.`
      });
    }

    res.json(pca);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
