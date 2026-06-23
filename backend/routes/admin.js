import express from 'express';
import pool from '../db/connection.js';
import { telegramAuth } from '../middleware/auth.js';
import { uploadPromo, uploadCafeLogo } from '../middleware/upload.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// ── Admin role check middleware ────────────────────────────────
async function adminAuth(req, res, next) {
  try {
    const { telegram_id } = req.telegramUser;
    const result = await pool.query(
      'SELECT id, name, email FROM admins WHERE telegram_id = $1',
      [telegram_id]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. Not an admin.' });
    }
    req.admin = result.rows[0];
    next();
  } catch (err) {
    console.error('Admin auth error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// All admin routes require Telegram auth + admin role
router.use(telegramAuth, adminAuth);


// ── GET /api/admin/cafes ──────────────────────────────────────
router.get('/cafes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.*,
        co.name        AS owner_name,
        co.phone       AS owner_phone,
        co.telegram_id AS owner_telegram_id,
        COUNT(DISTINCT pca.id) FILTER (WHERE pca.status = 'approved') AS customer_count,
        COUNT(DISTINCT o.id)   AS total_orders,
        COUNT(DISTINCT o.id)   FILTER (WHERE o.created_at::date = CURRENT_DATE) AS orders_today,
        COALESCE(SUM(o.service_fee) FILTER (WHERE o.status = 'approved'), 0) AS total_fees
      FROM cafes c
      LEFT JOIN cafe_owners co        ON co.cafe_id = c.id
      LEFT JOIN per_cafe_accounts pca ON pca.cafe_id = c.id
      LEFT JOIN orders o              ON o.cafe_id = c.id
      GROUP BY c.id, co.name, co.phone, co.telegram_id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── GET /api/admin/cafes/:cafeId ─────────────────────────────
router.get('/cafes/:cafeId', async (req, res) => {
  try {
    const { cafeId } = req.params;

    const cafe = await pool.query(`
      SELECT c.*,
        co.name AS owner_name, co.phone AS owner_phone,
        co.telegram_id AS owner_telegram_id
      FROM cafes c
      LEFT JOIN cafe_owners co ON co.cafe_id = c.id
      WHERE c.id = $1
    `, [cafeId]);

    if (cafe.rows.length === 0) {
      return res.status(404).json({ error: 'Cafe not found' });
    }

    const orders = await pool.query(`
      SELECT o.*, ga.name AS customer_name, ga.phone AS customer_phone
      FROM orders o
      JOIN per_cafe_accounts pca ON o.per_cafe_account_id = pca.id
      JOIN global_accounts ga    ON pca.global_account_id = ga.id
      WHERE o.cafe_id = $1
        AND o.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY o.created_at DESC
    `, [cafeId]);

    const stats = await pool.query(`
      SELECT
        COUNT(DISTINCT pca.id) FILTER (WHERE pca.status = 'approved') AS customer_count,
        COUNT(DISTINCT o.id)   AS total_orders,
        COALESCE(SUM(o.total)  FILTER (WHERE o.status = 'approved'), 0) AS total_revenue
      FROM cafes c
      LEFT JOIN per_cafe_accounts pca ON pca.cafe_id = c.id
      LEFT JOIN orders o ON o.cafe_id = c.id
      WHERE c.id = $1
    `, [cafeId]);

    res.json({ cafe: cafe.rows[0], orders: orders.rows, stats: stats.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── POST /api/admin/cafes ─────────────────────────────────────
// Creates a cafe. logo_url is just a string field — if the admin
// uploaded an image first via /api/admin/cafes/upload-logo, the
// returned URL is passed in here as logo_url.
router.post('/cafes', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      name, description, logo_url, address,
      phone, service_fee,
      owner_telegram_id, owner_name, owner_phone
    } = req.body;

    if (!name || !owner_telegram_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cafe name and owner Telegram ID are required' });
    }

    const cafe = await client.query(`
      INSERT INTO cafes (name, description, logo_url, address, phone, service_fee)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [name, description, logo_url || null, address, phone, service_fee || 0]);

    await client.query(`
      INSERT INTO cafe_owners (cafe_id, telegram_id, name, phone)
      VALUES ($1, $2, $3, $4)
    `, [cafe.rows[0].id, owner_telegram_id, owner_name, owner_phone]);

    await client.query('COMMIT');

    createNotification({
      telegramId: owner_telegram_id,
      cafeId:     cafe.rows[0].id,
      type:       'cafe_created',
      title:      `Welcome — ${cafe.rows[0].name} is set up!`,
      body:       'An admin created your cafe account. Open the bot to access your dashboard.'
    });

    res.status(201).json(cafe.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});


// ── PATCH /api/admin/cafes/:cafeId ───────────────────────────
router.patch('/cafes/:cafeId', async (req, res) => {
  try {
    const { cafeId } = req.params;
    const { name, description, address, phone, service_fee, logo_url } = req.body;

    const result = await pool.query(`
      UPDATE cafes
      SET name        = COALESCE($1, name),
          description = COALESCE($2, description),
          address     = COALESCE($3, address),
          phone       = COALESCE($4, phone),
          service_fee = COALESCE($5, service_fee),
          logo_url    = COALESCE($6, logo_url)
      WHERE id = $7 RETURNING *
    `, [name, description, address, phone, service_fee, logo_url, cafeId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Cafe not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── PATCH /api/admin/cafes/:cafeId/toggle ────────────────────
router.patch('/cafes/:cafeId/toggle', async (req, res) => {
  try {
    const { cafeId } = req.params;
    const result = await pool.query(`
      UPDATE cafes SET is_active = NOT is_active
      WHERE id = $1 RETURNING id, name, is_active
    `, [cafeId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Cafe not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── POST /api/admin/cafes/upload-logo ─────────────────────────
// Upload a cafe profile picture file. Returns { image_url } which
// the admin frontend then sends as `logo_url` in POST/PATCH /cafes.
// Mounted as its own route (not nested), and BEFORE export default,
// so it is correctly registered — this is the file upload route
// that was previously broken (declared after `export default router`,
// so Express never registered it and the request fell through to
// the SPA/404 handler, returning HTML and causing the
// "Unexpected token '<', "<!DOCTYPE"..." JSON parse error).
router.post('/cafes/upload-logo', (req, res) => {
  uploadCafeLogo(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `/uploads/cafes/${req.file.filename}`;
    res.status(201).json({ image_url: imageUrl });
  });
});


// ── GET /api/admin/promotions ─────────────────────────────────
router.get('/promotions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name AS cafe_name FROM promotions p
      LEFT JOIN cafes c ON p.cafe_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── POST /api/admin/promotions ────────────────────────────────
// Add a promotion from an already-known image_url (no file upload).
router.post('/promotions', async (req, res) => {
  try {
    const { cafe_id, image_url, title } = req.body;
    if (!image_url) return res.status(400).json({ error: 'image_url is required' });

    const result = await pool.query(`
      INSERT INTO promotions (cafe_id, image_url, title)
      VALUES ($1, $2, $3) RETURNING *
    `, [cafe_id || null, image_url, title]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── POST /api/admin/promotions/upload ─────────────────────────
// Upload a promo image file directly -> saves to uploads/promos/
// and creates the promotions row in one request. This route MUST
// be registered before `export default router` at the bottom of
// this file — previously it was placed AFTER the export, which
// meant Express never mounted it, and any request to this path
// fell through to the catch-all 404/SPA handler that returns HTML,
// causing "Unexpected token '<', "<!DOCTYPE"..." on the frontend
// when it tried to JSON.parse() the response.
router.post('/promotions/upload', (req, res) => {
  uploadPromo(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const { title, cafe_id } = req.body;
      const imageUrl = `/uploads/promos/${req.file.filename}`;

      const result = await pool.query(`
        INSERT INTO promotions (cafe_id, image_url, title, is_active)
        VALUES ($1, $2, $3, true) RETURNING *
      `, [cafe_id || null, imageUrl, title || null]);

      res.status(201).json(result.rows[0]);
    } catch (dbErr) {
      console.error(dbErr.message);
      res.status(500).json({ error: 'Server error' });
    }
  });
});


// ── DELETE /api/admin/promotions/:id ─────────────────────────
router.delete('/promotions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM promotions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Promotion deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
