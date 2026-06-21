import express from 'express';
import pool from '../db/connection.js';
import { telegramAuth, cafeOwnerAuth } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// Minimum total verified deposits (lifetime) before a customer is
// allowed to apply for credit at a cafe. Customer-side fix #2:
// "if they are registered in the cafe and do their first 1000 birr
// deposit... they are allowed to use credit until the limit set by
// the cafe owner."
const MIN_DEPOSIT_FOR_CREDIT = 1000;

// ── POST /api/deposits ────────────────────────────────────────
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
router.post('/webhook/verify', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { transaction_number, status } = req.body;

    if (!transaction_number || !status) {
      await client.query('ROLLBACK');
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

    if (status === 'verified') {
      const info = await pool.query(`
        SELECT ga.telegram_id, c.name AS cafe_name, pca.cafe_id
        FROM per_cafe_accounts pca
        JOIN global_accounts ga ON pca.global_account_id = ga.id
        JOIN cafes c ON pca.cafe_id = c.id
        WHERE pca.id = $1
      `, [deposit.per_cafe_account_id]);
      if (info.rows.length > 0) {
        const { telegram_id, cafe_name, cafe_id } = info.rows[0];
        createNotification({
          telegramId: telegram_id,
          cafeId:     cafe_id,
          type:       'deposit_verified',
          title:      `Deposit verified — ${parseFloat(deposit.amount).toFixed(2)} ETB`,
          body:       `Your deposit at ${cafe_name} was added to your balance.`
        });
      }
    }

    res.json({ message: `Deposit ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});


// ── GET /api/deposits/credit/eligibility ──────────────────────
// Tells the frontend whether this customer can apply for credit
// at this cafe yet — they must have at least MIN_DEPOSIT_FOR_CREDIT
// ETB in lifetime VERIFIED deposits.
router.get('/credit/eligibility', telegramAuth, async (req, res) => {
  try {
    const { telegram_id } = req.telegramUser;
    const { cafe_id } = req.query;
    if (!cafe_id) return res.status(400).json({ error: 'cafe_id query param is required' });

    const pcaResult = await pool.query(`
      SELECT pca.id FROM per_cafe_accounts pca
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE ga.telegram_id = $1 AND pca.cafe_id = $2 AND pca.status = 'approved'
    `, [telegram_id, cafe_id]);

    if (pcaResult.rows.length === 0) {
      return res.json({ eligible: false, total_deposited: 0, minimum_required: MIN_DEPOSIT_FOR_CREDIT, reason: 'not_registered' });
    }

    const depositSum = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM deposits WHERE per_cafe_account_id = $1 AND status = 'verified'
    `, [pcaResult.rows[0].id]);

    const total = parseFloat(depositSum.rows[0].total);
    res.json({
      eligible: total >= MIN_DEPOSIT_FOR_CREDIT,
      total_deposited: total,
      minimum_required: MIN_DEPOSIT_FOR_CREDIT,
      reason: total >= MIN_DEPOSIT_FOR_CREDIT ? null : 'insufficient_deposit_history'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── POST /api/deposits/credit/apply ──────────────────────────
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
    const pcaId = pcaResult.rows[0].id;

    // Enforce the minimum deposit history requirement
    const depositSum = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM deposits WHERE per_cafe_account_id = $1 AND status = 'verified'
    `, [pcaId]);
    const totalDeposited = parseFloat(depositSum.rows[0].total);
    if (totalDeposited < MIN_DEPOSIT_FOR_CREDIT) {
      return res.status(403).json({
        error: `You need at least ${MIN_DEPOSIT_FOR_CREDIT} ETB in verified deposits before applying for credit. You have deposited ${totalDeposited.toFixed(2)} ETB so far.`,
        total_deposited: totalDeposited,
        minimum_required: MIN_DEPOSIT_FOR_CREDIT
      });
    }

    const existing = await pool.query(
      `SELECT id FROM credit_applications WHERE per_cafe_account_id = $1 AND status = 'pending'`,
      [pcaId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending credit application' });
    }

    const result = await pool.query(`
      INSERT INTO credit_applications (per_cafe_account_id, cafe_id, requested_limit)
      VALUES ($1, $2, $3) RETURNING *
    `, [pcaId, cafe_id, requested_limit]);

    const ownerResult = await pool.query(
      'SELECT telegram_id FROM cafe_owners WHERE cafe_id = $1', [cafe_id]
    );
    if (ownerResult.rows.length > 0) {
      createNotification({
        telegramId: ownerResult.rows[0].telegram_id,
        cafeId:     cafe_id,
        type:       'credit_application',
        title:      `New credit application — ${parseFloat(requested_limit).toFixed(2)} ETB requested`,
        body:       `A customer applied for credit.`
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── GET /api/deposits/credit/applications ────────────────────
router.get('/credit/applications', telegramAuth, cafeOwnerAuth, async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;
    const result = await pool.query(`
      SELECT ca.*, ga.name AS customer_name, ga.phone AS customer_phone,
             pca.balance, pca.credit_used, pca.id AS per_cafe_account_id
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
router.patch('/credit/applications/:appId', telegramAuth, cafeOwnerAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { cafe_id, id: ownerId } = req.cafeOwner;
    const { status, approved_limit } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }
    if (status === 'approved' && !approved_limit) {
      await client.query('ROLLBACK');
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
    const application = appResult.rows[0];

    await client.query(`
      UPDATE credit_applications
      SET status = $1, approved_limit = $2, reviewed_at = NOW(), reviewed_by = $3
      WHERE id = $4
    `, [status, approved_limit || null, ownerId, req.params.appId]);

    if (status === 'approved') {
      await client.query(
        'UPDATE per_cafe_accounts SET credit_limit = $1 WHERE id = $2',
        [approved_limit, application.per_cafe_account_id]
      );
    }

    await client.query('COMMIT');

    const ga = await pool.query(`
      SELECT ga.telegram_id FROM per_cafe_accounts pca
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE pca.id = $1
    `, [application.per_cafe_account_id]);
    const cafe = await pool.query('SELECT name FROM cafes WHERE id = $1', [cafe_id]);

    if (ga.rows.length > 0) {
      createNotification({
        telegramId: ga.rows[0].telegram_id,
        cafeId:     cafe_id,
        type:       status === 'approved' ? 'credit_approved' : 'credit_rejected',
        title:      status === 'approved'
                      ? `Credit approved — ${parseFloat(approved_limit).toFixed(2)} ETB`
                      : `Credit application declined`,
        body:       status === 'approved'
                      ? `${cafe.rows[0]?.name || 'The cafe'} approved your credit limit.`
                      : `${cafe.rows[0]?.name || 'The cafe'} declined your credit application.`
      });
    }

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
