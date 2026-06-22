import express from 'express';
import pool from '../db/connection.js';
import { telegramAuth } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';
import { sendTelegramMessage, newRegistrationMessage } from '../utils/telegramBot.js';

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
// Customer registers at a cafe — for WALLET/CREDIT access.
// Accepts name + phone from the registration popup form.
// Updates global_account with the provided name/phone if changed.
//
// Cash/Transfer orders auto-create a minimal 'pending' per_cafe_account
// behind the scenes (see routes/orders.js) purely for record-linking —
// that does NOT count as a real registration request. So here we only
// treat it as "already registered" if a request was explicitly and
// recently submitted (within the last 5 minutes is too fragile to
// detect server-side, so instead: if status is 'pending' or 'approved'
// or 'suspended' we just re-use/refresh that row rather than blocking
// the customer with a 409 — this makes the flow forgiving for repeat
// taps and for customers who ordered cash first, then later open the
// registration popup).
router.post('/account/:cafeId/register', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { telegram_id } = req.telegramUser;
    const { cafeId }      = req.params;
    const { name, phone } = req.body;

    const ga = await client.query(
      'SELECT * FROM global_accounts WHERE telegram_id = $1',
      [telegram_id]
    );
    if (ga.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Global account not found' });
    }

    if (name || phone) {
      await client.query(`
        UPDATE global_accounts
        SET name  = COALESCE(NULLIF($1, ''), name),
            phone = COALESCE(NULLIF($2, ''), phone)
        WHERE telegram_id = $3
      `, [name, phone, telegram_id]);
    }

    const existing = await client.query(
      'SELECT * FROM per_cafe_accounts WHERE global_account_id = $1 AND cafe_id = $2',
      [ga.rows[0].id, cafeId]
    );

    let pca;
    if (existing.rows.length > 0) {
      const current = existing.rows[0];
      if (current.status === 'approved') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Already approved at this cafe', account: current });
      }
      // Re-submit / refresh a pending (possibly auto-created by an
      // earlier cash/transfer order) or suspended account back to
      // pending so it shows up in the cafe owner's Registrations page.
      const refreshed = await client.query(`
        UPDATE per_cafe_accounts
        SET status = 'pending', registered_at = NOW(), approved_at = NULL
        WHERE id = $1 RETURNING *
      `, [current.id]);
      pca = refreshed.rows[0];
    } else {
      const created = await client.query(`
        INSERT INTO per_cafe_accounts (global_account_id, cafe_id)
        VALUES ($1, $2) RETURNING *
      `, [ga.rows[0].id, cafeId]);
      pca = created.rows[0];
    }

    await client.query('COMMIT');

    // Notify cafe owner of the new registration request — both the
    // Telegram bot push (sound + popup, primary alert) and the
    // in-app notification history row (bell icon).
    const ownerResult = await pool.query(
      'SELECT telegram_id FROM cafe_owners WHERE cafe_id = $1', [cafeId]
    );
    if (ownerResult.rows.length > 0) {
      const ownerTelegramId = ownerResult.rows[0].telegram_id;
      const displayName = name || ga.rows[0].name || 'A customer';
      const displayPhone = phone || ga.rows[0].phone;

      sendTelegramMessage(
        ownerTelegramId,
        newRegistrationMessage(displayName, displayPhone)
      );

      createNotification({
        telegramId: ownerTelegramId,
        cafeId,
        type:  'registration_request',
        title: `New registration request`,
        body:  `${displayName} wants to register at your cafe.`
      });
    }

    res.status(201).json(pca);
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
