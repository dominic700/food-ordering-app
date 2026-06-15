import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';
import { telegramAuth } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// ── POST /api/auth/init ───────────────────────────────────────
// Called when Mini App opens
// Detects role: admin | cafe_owner | customer
// Creates global account if new customer
router.post('/init', telegramAuth, async (req, res) => {
  try {
    const { telegram_id, name } = req.telegramUser;
    const { phone } = req.body;

    // 1. Check if admin
    const adminCheck = await pool.query(
      'SELECT id, name, email FROM admins WHERE telegram_id = $1',
      [telegram_id]
    );
    if (adminCheck.rows.length > 0) {
      return res.json({ role: 'admin', account: adminCheck.rows[0] });
    }

    // 2. Check if cafe owner
    const ownerCheck = await pool.query(
      `SELECT co.id, co.cafe_id, co.name, co.phone, c.name AS cafe_name,
              c.logo_url, c.address, c.service_fee
       FROM cafe_owners co
       JOIN cafes c ON co.cafe_id = c.id
       WHERE co.telegram_id = $1`,
      [telegram_id]
    );
    if (ownerCheck.rows.length > 0) {
      return res.json({ role: 'cafe_owner', account: ownerCheck.rows[0] });
    }

    // 3. Customer — find or create global account
    let accountResult = await pool.query(
      'SELECT * FROM global_accounts WHERE telegram_id = $1',
      [telegram_id]
    );

    if (accountResult.rows.length === 0) {
      if (!phone) {
        return res.status(400).json({ error: 'Phone number required for first login' });
      }
      accountResult = await pool.query(
        'INSERT INTO global_accounts (telegram_id, name, phone) VALUES ($1, $2, $3) RETURNING *',
        [telegram_id, name, phone]
      );
    }

    res.json({ role: 'customer', account: accountResult.rows[0] });

  } catch (err) {
    console.error('Auth init error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── POST /api/auth/admin/login ────────────────────────────────
// Admin login with email + password
// Returns JWT token
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email }
    });

  } catch (err) {
    console.error('Admin login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
