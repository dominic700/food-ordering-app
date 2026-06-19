import express from 'express';
import pool from '../db/connection.js';
import { telegramAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(telegramAuth);

// ── GET /api/customer/cafes ───────────────────────────────────
router.get('/cafes', async (req, res) => {
  try {
    const cafes = await pool.query(`
      SELECT id, name, description, logo_url, address, phone, service_fee
      FROM cafes WHERE is_active = true ORDER BY name ASC
    `);
    const promos = await pool.query(`
      SELECT id, cafe_id, image_url, title
      FROM promotions WHERE is_active = true
      ORDER BY created_at DESC
    `);
    res.json({ cafes: cafes.rows, promotions: promos.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── GET /api/customer/account/:cafeId ────────────────────────
router.get('/account/:cafeId', async (req, res) => {
  try {
    const { telegram_id } = req.telegramUser;
    const { cafeId }      = req.params;

    const result = await pool.query(`
      SELECT pca.*, ga.name, ga.phone
      FROM per_cafe_accounts pca
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE ga.telegram_id = $1 AND pca.cafe_id = $2
    `, [telegram_id, cafeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No account at this cafe' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── POST /api/customer/account/:cafeId/register ──────────────
// Customer registers at a cafe.
// Accepts name + phone from the registration form.
// Updates global_account with the provided name/phone if changed.
// Registration does NOT require wallet — cash/transfer orders
// can be placed without an approved per_cafe_account.
router.post('/account/:cafeId/register', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { telegram_id } = req.telegramUser;
    const { cafeId }      = req.params;
    const { name, phone } = req.body;

    // Get global account
    const ga = await client.query(
      'SELECT * FROM global_accounts WHERE telegram_id = $1',
      [telegram_id]
    );
    if (ga.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Global account not found' });
    }

    // Update name/phone if customer provided them in the form
    if (name || phone) {
      await client.query(`
        UPDATE global_accounts
        SET name  = COALESCE(NULLIF($1, ''), name),
            phone = COALESCE(NULLIF($2, ''), phone)
        WHERE telegram_id = $3
      `, [name, phone, telegram_id]);
    }

    // Check if already registered
    const existing = await client.query(
      'SELECT * FROM per_cafe_accounts WHERE global_account_id = $1 AND cafe_id = $2',
      [ga.rows[0].id, cafeId]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error:   'Already registered at this cafe',
        account: existing.rows[0]
      });
    }

    // Create per-cafe account (pending approval)
    const result = await client.query(`
      INSERT INTO per_cafe_accounts (global_account_id, cafe_id)
      VALUES ($1, $2) RETURNING *
    `, [ga.rows[0].id, cafeId]);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});


// ── GET /api/customer/account/:cafeId/history ────────────────
router.get('/account/:cafeId/history', async (req, res) => {
  try {
    const { telegram_id } = req.telegramUser;
    const { cafeId }      = req.params;

    const pcaResult = await pool.query(`
      SELECT pca.id FROM per_cafe_accounts pca
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE ga.telegram_id = $1 AND pca.cafe_id = $2
    `, [telegram_id, cafeId]);

    if (pcaResult.rows.length === 0) {
      return res.status(404).json({ error: 'No account at this cafe' });
    }
    const pcaId = pcaResult.rows[0].id;

    const orders = await pool.query(`
      SELECT o.*,
        json_agg(json_build_object(
          'name', oi.name, 'quantity', oi.quantity,
          'price', oi.price, 'item_total', oi.item_total
        )) AS items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.per_cafe_account_id = $1
      GROUP BY o.id ORDER BY o.created_at DESC
    `, [pcaId]);

    const deposits = await pool.query(`
      SELECT id, amount, payment_method, transaction_number, status, created_at
      FROM deposits WHERE per_cafe_account_id = $1
      ORDER BY created_at DESC
    `, [pcaId]);

    res.json({ orders: orders.rows, deposits: deposits.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
