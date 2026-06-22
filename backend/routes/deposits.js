import express from 'express';
import pool from '../db/connection.js';
import { telegramAuth } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';
import { sendTelegramMessage, depositVerifiedMessage } from '../utils/telegramBot.js';

const router = express.Router();

// ── POST /api/deposits ────────────────────────────────────────
// Customer submits a deposit (cash or transfer reference number)
// at a cafe they're approved at. Goes to 'pending' until verified.
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
// Marks a pending deposit verified/failed and, if verified, adds
// the amount straight to the customer's single signed balance
// (works correctly whether they were positive, negative/in-credit,
// or exactly zero — depositing always just moves balance up).
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

        sendTelegramMessage(
          telegram_id,
          depositVerifiedMessage(deposit.amount, cafe_name)
        );

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

export default router;
