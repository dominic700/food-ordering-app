import pool from '../db/connection.js';
import { sendTelegramMessage, orderCancelledMessage } from './telegramBot.js';
import { createNotification } from './notifications.js';

const AUTO_CANCEL_MINUTES = 7;

// ── autoCancelOrders ──────────────────────────────────────────
// Runs on a timer (every 60 seconds). Finds every order that has
// been sitting in 'pending' status for more than AUTO_CANCEL_MINUTES
// without the cafe owner approving it, then:
//   1. Cancels the order (status = 'cancelled')
//   2. Refunds balance for wallet orders
//   3. Sends Telegram push + in-app notification to the customer
//
// Called from index.js via setInterval on server startup.
export async function autoCancelOrders() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find all orders pending longer than AUTO_CANCEL_MINUTES
    const staleOrders = await client.query(`
      SELECT
        o.*,
        ga.telegram_id   AS customer_telegram_id,
        c.name           AS cafe_name
      FROM orders o
      JOIN per_cafe_accounts pca ON o.per_cafe_account_id = pca.id
      JOIN global_accounts ga    ON pca.global_account_id = ga.id
      JOIN cafes c               ON o.cafe_id = c.id
      WHERE o.status = 'pending'
        AND o.created_at < NOW() - ($1 * INTERVAL '1 minute')
    `, [AUTO_CANCEL_MINUTES]);

    if (staleOrders.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }

    console.log(`[auto-cancel] Found ${staleOrders.rows.length} stale order(s) to cancel`);

    for (const order of staleOrders.rows) {
      // Refund wallet orders — balance was deducted at order time
      const refundAmount =
        parseFloat(order.paid_from_balance || 0) +
        parseFloat(order.paid_from_credit  || 0);

      if (refundAmount > 0) {
        await client.query(`
          UPDATE per_cafe_accounts
          SET balance = balance + $1
          WHERE id = $2
        `, [refundAmount, order.per_cafe_account_id]);
      }

      // Cancel the order
      await client.query(`
        UPDATE orders
        SET status = 'cancelled',
            cancelled_at = NOW(),
            note = COALESCE(note || ' ', '') || $1
        WHERE id = $2
      `, [`[auto-cancelled: no response within ${AUTO_CANCEL_MINUTES} min]`, order.id]);

      // Notify customer via Telegram push
      sendTelegramMessage(
        order.customer_telegram_id,
        orderAutoCancelledMessage(order, order.cafe_name, AUTO_CANCEL_MINUTES, refundAmount)
      );

      // In-app bell notification
      createNotification({
        telegramId: order.customer_telegram_id,
        cafeId:     order.cafe_id,
        type:       'order_cancelled',
        title:      `Order auto-cancelled — ${parseFloat(order.total).toFixed(2)} ETB`,
        body:       `${order.cafe_name} didn't respond within ${AUTO_CANCEL_MINUTES} minutes.${refundAmount > 0 ? ` ${refundAmount.toFixed(2)} ETB refunded.` : ''}`,
      });

      console.log(`[auto-cancel] Cancelled order ${order.id} at ${order.cafe_name}`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[auto-cancel] Error:', err.message);
  } finally {
    client.release();
  }
}


// ── orderAutoCancelledMessage ─────────────────────────────────
// Telegram message sent to the CUSTOMER when their order is
// automatically cancelled due to no cafe response.
function orderAutoCancelledMessage(order, cafeName, minutes, refundAmount) {
  const refundNote = refundAmount > 0
    ? `\n\n💰 <b>${refundAmount.toFixed(2)} ETB</b> has been refunded to your balance.`
    : '';

  return (
    `⏱ <b>Order Auto-Cancelled</b>\n\n` +
    `Your order at <b>${cafeName}</b> (#${order.id?.slice(0, 8)}) was automatically cancelled ` +
    `because the cafe didn't respond within <b>${minutes} minutes</b>.\n` +
    `Total: <b>${parseFloat(order.total).toFixed(2)} ETB</b>` +
    `${refundNote}\n\n` +
    `You can place a new order or try a different cafe.`
  );
}


// ── startAutoCancelJob ────────────────────────────────────────
// Call this once from index.js on server startup.
// Checks every 60 seconds for stale orders.
export function startAutoCancelJob() {
  console.log(`[auto-cancel] Job started — cancels pending orders after ${AUTO_CANCEL_MINUTES} minutes`);

  // Run once immediately on startup to catch any stale orders
  // from before the server restarted
  autoCancelOrders();

  // Then run every 60 seconds
  setInterval(autoCancelOrders, 60 * 1000);
}
