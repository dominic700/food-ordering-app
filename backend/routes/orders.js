import express from 'express';
import pool from '../db/connection.js';
import { telegramAuth, cafeOwnerAuth } from '../middleware/auth.js';
import { sendTelegramMessage, newOrderMessage, orderApprovedMessage } from '../utils/telegramBot.js';

const router = express.Router();

// Round to 2 decimal places safely
const round2 = (n) => Math.round(n * 100) / 100;

// ── POST /api/orders ──────────────────────────────────────────
// Customer places an order
//
// payment_method:
//   'wallet'   (default) -> balance AND/OR credit (combined). Each menu
//                            item's discount_percent (set by the cafe
//                            owner on the menu) is applied to its price
//                            for this order — discount benefits both the
//                            balance-funded and credit-funded portions.
//   'transfer'            -> paid externally via Telebirr/CBE/Bank,
//                             auto-verified instantly, wallet untouched,
//                             no discount applies (full list price).
//                             Requires transfer_provider + transaction_number.
//
// Service fee model:
//   Each menu item's base price has the cafe's service_fee added on top.
//   list_unit_price = base_price + service_fee
//   subtotal   = sum(base_price * quantity)   (cafe's portion, list)
//   service_fee(order) = sum(service_fee * quantity)   (list)
//   total      = subtotal + service_fee - discount_amount
router.post('/', telegramAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { telegram_id, name: telegramName } = req.telegramUser;
    const {
      cafe_id, items, note,
      payment_method,       // 'wallet' | 'transfer'
      transfer_provider,     // 'telebirr' | 'cbe_birr' | 'bank_transfer'
      transaction_number
    } = req.body;

    if (!cafe_id || !items?.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'cafe_id and items are required' });
    }

    const method = payment_method === 'transfer' ? 'transfer' : 'wallet';

    if (method === 'transfer') {
      const validProviders = ['telebirr', 'cbe_birr', 'bank_transfer'];
      if (!transfer_provider || !transaction_number) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'transfer_provider and transaction_number are required for transfer payment' });
      }
      if (!validProviders.includes(transfer_provider)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid transfer_provider' });
      }
    }

    // Get approved per-cafe account (joined with customer's global name
    // for use in the cafe-owner notification)
    const pcaResult = await client.query(`
      SELECT pca.*, ga.name AS customer_name, ga.id AS global_account_id
      FROM per_cafe_accounts pca
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE ga.telegram_id = $1 AND pca.cafe_id = $2 AND pca.status = 'approved'
    `, [telegram_id, cafe_id]);

    if (pcaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No approved account at this cafe' });
    }
    const pca = pcaResult.rows[0];

    // Get cafe service fee
    const cafeResult = await client.query(
      'SELECT name, service_fee FROM cafes WHERE id = $1 AND is_active = true',
      [cafe_id]
    );
    if (cafeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cafe not found or inactive' });
    }
    const cafe = cafeResult.rows[0];
    const serviceFeePerUnit = parseFloat(cafe.service_fee);

    // Validate and price each item.
    //
    // For each item:
    //   list_unit_price   = base_price + service_fee   (shown on the menu)
    //   wallet_unit_price = list_unit_price * (1 - item.discount_percent/100)
    //
    // 'wallet' orders (balance and/or credit) use wallet_unit_price.
    // 'transfer' orders use list_unit_price (no discount).
    //
    // subtotal / feeTotal are always tracked at LIST price (so cafe
    // accounting reflects the full menu price); discountTotal captures
    // the per-item discounts applied for wallet orders.
    let subtotal     = 0;  // sum(base_price * qty)        — list, cafe's portion
    let feeTotal      = 0; // sum(service_fee * qty)        — list, platform fee
    let discountTotal = 0; // sum(list_unit_price * qty * discount%) — wallet only
    const resolvedItems = [];

    for (const item of items) {
      const mi = await client.query(
        'SELECT * FROM menu_items WHERE id = $1 AND cafe_id = $2 AND is_available = true',
        [item.menu_item_id, cafe_id]
      );
      if (mi.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Item ${item.menu_item_id} not found or unavailable` });
      }

      const basePrice      = parseFloat(mi.rows[0].price);
      const discountPercent = parseFloat(mi.rows[0].discount_percent);
      const listUnitPrice  = basePrice + serviceFeePerUnit;
      const walletUnitPrice = round2(listUnitPrice * (1 - discountPercent / 100));

      const unitPrice = method === 'transfer' ? listUnitPrice : walletUnitPrice;
      const itemTotal = round2(unitPrice * item.quantity);

      subtotal += basePrice * item.quantity;
      feeTotal  += serviceFeePerUnit * item.quantity;
      if (method === 'wallet') {
        discountTotal += round2((listUnitPrice - walletUnitPrice) * item.quantity);
      }

      resolvedItems.push({
        menu_item_id: mi.rows[0].id,
        name: mi.rows[0].name,
        price: unitPrice,
        quantity: item.quantity,
        item_total: itemTotal
      });
    }

    subtotal = round2(subtotal);
    feeTotal = round2(feeTotal);
    discountTotal = round2(discountTotal);
    const total = round2(subtotal + feeTotal - discountTotal);

    // ── PAYMENT LOGIC ─────────────────────────────────────────
    let paidFromBalance = 0;
    let paidFromCredit  = 0;

    if (method === 'wallet') {
      const balance     = parseFloat(pca.balance);
      const creditAvail = parseFloat(pca.credit_limit) - parseFloat(pca.credit_used);

      if (balance >= total) {
        paidFromBalance = total;
      } else if (balance > 0) {
        paidFromBalance = balance;
        const remaining = round2(total - balance);
        if (remaining > creditAvail) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: 'Insufficient balance and credit',
            balance, credit_available: creditAvail, order_total: total
          });
        }
        paidFromCredit = remaining;
      } else {
        if (total > creditAvail) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: 'Insufficient credit',
            credit_available: creditAvail, order_total: total
          });
        }
        paidFromCredit = total;
      }
    }
    // method === 'transfer' -> paidFromBalance / paidFromCredit stay 0,
    // no discount applies, payment is settled externally and considered
    // verified immediately.
    // ──────────────────────────────────────────────────────────

    // Create order
    const orderResult = await client.query(`
      INSERT INTO orders (cafe_id, per_cafe_account_id, subtotal, service_fee, total,
        discount_amount, paid_from_balance, paid_from_credit, payment_method,
        transfer_provider, transaction_number, status, note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12) RETURNING *
    `, [
      cafe_id, pca.id, subtotal, feeTotal, total,
      discountTotal, paidFromBalance, paidFromCredit,
      method,
      method === 'transfer' ? transfer_provider : null,
      method === 'transfer' ? transaction_number : null,
      note
    ]);

    const order = orderResult.rows[0];

    // Insert order items (price = unit price including service fee)
    for (const item of resolvedItems) {
      await client.query(`
        INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, item_total)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [order.id, item.menu_item_id, item.name, item.price, item.quantity, item.item_total]);
    }

    // Deduct balance / add credit usage.
    // For 'transfer' orders both values are 0, so this is a no-op.
    await client.query(`
      UPDATE per_cafe_accounts
      SET balance = balance - $1, credit_used = credit_used + $2
      WHERE id = $3
    `, [paidFromBalance, paidFromCredit, pca.id]);

    // Get cafe owner's telegram_id for the new-order notification
    const ownerResult = await client.query(
      'SELECT telegram_id FROM cafe_owners WHERE cafe_id = $1', [cafe_id]
    );

    await client.query('COMMIT');

    // ── Notify cafe owner (Telegram message = popup + sound) ───
    if (ownerResult.rows.length > 0) {
      sendTelegramMessage(
        ownerResult.rows[0].telegram_id,
        newOrderMessage(order, pca.customer_name || telegramName, resolvedItems)
      );
    }

    res.status(201).json({
      order,
      payment_summary: {
        subtotal,
        service_fee: feeTotal,
        discount_amount: discountTotal,
        total,
        amount_paid: round2(paidFromBalance + paidFromCredit),
        payment_method: method,
        paid_from_balance: paidFromBalance,
        paid_from_credit: paidFromCredit
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order error:', err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});


// ── GET /api/orders/cafe/pending ──────────────────────────────
router.get('/cafe/pending', telegramAuth, cafeOwnerAuth, async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;
    const result = await pool.query(`
      SELECT o.*, ga.name AS customer_name, ga.phone AS customer_phone,
        json_agg(json_build_object(
          'name', oi.name, 'quantity', oi.quantity,
          'price', oi.price, 'item_total', oi.item_total
        )) AS items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN per_cafe_accounts pca ON o.per_cafe_account_id = pca.id
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE o.cafe_id = $1 AND o.status = 'pending'
      GROUP BY o.id, ga.name, ga.phone
      ORDER BY o.created_at ASC
    `, [cafe_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── GET /api/orders/cafe/history ──────────────────────────────
router.get('/cafe/history', telegramAuth, cafeOwnerAuth, async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;
    const result = await pool.query(`
      SELECT o.*, ga.name AS customer_name, ga.phone AS customer_phone,
        json_agg(json_build_object(
          'name', oi.name, 'quantity', oi.quantity, 'item_total', oi.item_total
        )) AS items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN per_cafe_accounts pca ON o.per_cafe_account_id = pca.id
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      WHERE o.cafe_id = $1 AND o.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY o.id, ga.name, ga.phone
      ORDER BY o.created_at DESC
    `, [cafe_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── PATCH /api/orders/:orderId/approve ───────────────────────
// Approves the order AND notifies the customer (Telegram message
// = popup + sound on their phone).
router.patch('/:orderId/approve', telegramAuth, cafeOwnerAuth, async (req, res) => {
  try {
    const { cafe_id } = req.cafeOwner;

    const result = await pool.query(`
      UPDATE orders SET status = 'approved', approved_at = NOW()
      WHERE id = $1 AND cafe_id = $2 AND status = 'pending'
      RETURNING *
    `, [req.params.orderId, cafe_id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found or already processed' });
    const order = result.rows[0];

    // Look up the customer's telegram_id + cafe name for the notification
    const infoResult = await pool.query(`
      SELECT ga.telegram_id, c.name AS cafe_name
      FROM orders o
      JOIN per_cafe_accounts pca ON o.per_cafe_account_id = pca.id
      JOIN global_accounts ga ON pca.global_account_id = ga.id
      JOIN cafes c ON o.cafe_id = c.id
      WHERE o.id = $1
    `, [order.id]);

    if (infoResult.rows.length > 0) {
      const { telegram_id, cafe_name } = infoResult.rows[0];
      sendTelegramMessage(telegram_id, orderApprovedMessage(order, cafe_name));
    }

    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ── PATCH /api/orders/:orderId/cancel ────────────────────────
// Cancels order and refunds balance + credit.
// For 'transfer' orders, paid_from_balance/credit are 0, so the refund
// is a no-op — the money was never taken from the wallet to begin with.
router.patch('/:orderId/cancel', telegramAuth, cafeOwnerAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { cafe_id } = req.cafeOwner;

    const orderResult = await client.query(
      `SELECT * FROM orders WHERE id = $1 AND cafe_id = $2 AND status = 'pending'`,
      [req.params.orderId, cafe_id]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found or already processed' });
    }

    const order = orderResult.rows[0];

    await client.query(`
      UPDATE per_cafe_accounts
      SET balance = balance + $1, credit_used = GREATEST(credit_used - $2, 0)
      WHERE id = $3
    `, [order.paid_from_balance, order.paid_from_credit, order.per_cafe_account_id]);

    await client.query(
      `UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
      [order.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Order cancelled and payment refunded' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
