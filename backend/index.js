import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes     from './routes/auth.js';
import adminRoutes    from './routes/admin.js';
import cafeRoutes     from './routes/cafe.js';
import customerRoutes from './routes/customer.js';
import orderRoutes    from './routes/orders.js';
import menuRoutes     from './routes/menu.js';
import depositRoutes  from './routes/deposits.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/cafe',     cafeRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/menu',     menuRoutes);
app.use('/api/deposits', depositRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Food Ordering Backend is running"
  });
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://legendary-boba-ce1658.netlify.app/',  // add this
  ],
  credentials: true
}));
