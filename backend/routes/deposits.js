import express from 'express';
import pool from '../db/connection.js';
import { telegramAuth, cafeOwnerAuth } from '../middleware/auth.js';

const router = express.Router();

// ── POST /api/deposits ────────────────────────────────────────
// Customer submits a deposit
router.post('/', telegramAuth, async (req, res) => {
  try {
    const { telegram_id } = req.telegramUser;
    const { cafe_id, amount, payment_method, transaction_number } = req.body;

    if (!cafe_id || !amount || !payment_method || !transaction_number) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const pcaResult = await pool.query(`
      SELECT pca.id FROM per_cafe_accounts pca
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE ga.telegram_id = $1 AND pca.cafe_id = $2 AND pca.status = 'approved'
    `, [telegram_id, cafe_id]);

    if (pcaResult.rows.length === 0) {
      return res.status(403).json({ error: 'No approved account at this cafe' });
    }

    const result = await pool.query(`
      INSERT INTO deposits (per_cafe_account_id, cafe_id, amount, payment_method, transaction_number)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [pcaResult.rows[0].id, cafe_id, amount, payment_method, transaction_number]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── POST /api/deposits/webhook/verify ────────────────────────
// External payment system confirms a deposit
// Adds the amount to the customer wallet
router.post('/webhook/verify', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { transaction_number, status } = req.body;

    if (!transaction_number || !status) {
      return res.status(400).json({ error: 'transaction_number and status are required' });
    }

    const depositResult = await client.query(
      `SELECT * FROM deposits WHERE transaction_number = $1 AND status = 'pending'`,
      [transaction_number]
    );
    if (depositResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Deposit not found or already processed' });
    }

    const deposit = depositResult.rows[0];

    if (status === 'verified') {
      await client.query(
        `UPDATE deposits SET status = 'verified', verified_at = NOW() WHERE id = $1`,
        [deposit.id]
      );
      await client.query(
        `UPDATE per_cafe_accounts SET balance = balance + $1 WHERE id = $2`,
        [deposit.amount, deposit.per_cafe_account_id]
      );
    } else if (status === 'failed') {
      await client.query(`UPDATE deposits SET status = 'failed' WHERE id = $1`, [deposit.id]);
    }

    await client.query('COMMIT');
    res.json({ message: `Deposit ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});


// ── POST /api/deposits/credit/apply ──────────────────────────
// Customer applies for credit at a cafe
router.post('/credit/apply', telegramAuth, async (req, res) => {
  try {
    const { telegram_id } = req.telegramUser;
    const { cafe_id, requested_limit } = req.body;

    if (!cafe_id || !requested_limit) {
      return res.status(400).json({ error: 'cafe_id and requested_limit are required' });
    }

    const pcaResult = await pool.query(`
      SELECT pca.id FROM per_cafe_accounts pca
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE ga.telegram_id = $1 AND pca.cafe_id = $2 AND pca.status = 'approved'
    `, [telegram_id, cafe_id]);

    if (pcaResult.rows.length === 0) {
      return res.status(403).json({ error: 'No approved account at this cafe' });
    }

    const existing = await pool.query(
      `SELECT id FROM credit_applications WHERE per_cafe_account_id = $1 AND status = 'pending'`,
      [pcaResult.rows[0].id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending credit application' });
    }

    const result = await pool.query(`
      INSERT INTO credit_applications (per_cafe_account_id, cafe_id, requested_limit)
      VALUES ($1, $2, $3) RETURNING *
    `, [pcaResult.rows[0].id, cafe_id, requested_limit]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── GET /api/deposits/credit/applications ────────────────────
// Cafe owner gets all credit applications
router.get('/credit/applications', telegramAuth, cafeOwnerAuth, async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;
    const result = await pool.query(`
      SELECT ca.*, ga.name AS customer_name, ga.phone AS customer_phone,
             pca.balance, pca.credit_used
      FROM credit_applications ca
      JOIN per_cafe_accounts pca ON ca.per_cafe_account_id = pca.id
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE ca.cafe_id = $1
      ORDER BY ca.applied_at DESC
    `, [cafe_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── PATCH /api/deposits/credit/applications/:appId ───────────
// Cafe owner approves or rejects credit
router.patch('/credit/applications/:appId', telegramAuth, cafeOwnerAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { cafe_id, id: ownerId } = req.cafeOwner;
    const { status, approved_limit } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }
    if (status === 'approved' && !approved_limit) {
      return res.status(400).json({ error: 'approved_limit is required when approving' });
    }

    const appResult = await client.query(
      `SELECT * FROM credit_applications WHERE id = $1 AND cafe_id = $2 AND status = 'pending'`,
      [req.params.appId, cafe_id]
    );
    if (appResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found or already processed' });
    }

    await client.query(`
      UPDATE credit_applications
      SET status = $1, approved_limit = $2, reviewed_at = NOW(), reviewed_by = $3
      WHERE id = $4
    `, [status, approved_limit || null, ownerId, req.params.appId]);

    if (status === 'approved') {
      await client.query(
        'UPDATE per_cafe_accounts SET credit_limit = $1 WHERE id = $2',
        [approved_limit, appResult.rows[0].per_cafe_account_id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: `Credit application ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
