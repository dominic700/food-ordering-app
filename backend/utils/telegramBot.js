import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── sendTelegramMessage ────────────────────────────────────────
// Sends a message to a Telegram chat (a user's telegram_id).
// Telegram delivers this as a normal chat message — the user's phone
// shows a push notification with sound, exactly like any other chat
// message. This is what gives us "notification + sound" without
// needing any extra infrastructure (WebSockets, push servers, etc).
//
// Fails silently (logs only) so a notification failure never breaks
// the main request (placing/approving an order).
export async function sendTelegramMessage(chatId, text) {
  try {
    if (!BOT_TOKEN) {
      console.warn('TELEGRAM_BOT_TOKEN not set — skipping notification');
      return;
    }
    if (!chatId) return;

    const res = await fetch(`${API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('Telegram sendMessage failed:', body);
    }
  } catch (err) {
    console.error('Telegram notify error:', err.message);
  }
}


// ── Message builders ────────────────────────────────────────────

// Sent to the CAFE OWNER when a customer places a new order
export function newOrderMessage(order, customerName, items) {
  const itemLines = items
    .map(i => `• ${i.quantity}x ${i.name} — ${parseFloat(i.item_total).toFixed(2)} ETB`)
    .join('\n');

  return (
    `🔔 <b>New Order Received</b>\n\n` +
    `Customer: ${customerName || 'Unknown'}\n` +
    `Order ID: #${order.id.slice(0, 8)}\n\n` +
    `${itemLines}\n\n` +
    `Total: <b>${parseFloat(order.total).toFixed(2)} ETB</b>\n` +
    `Payment: ${order.payment_method === 'transfer'
      ? `Transfer (${order.transfer_provider})`
      : 'Wallet / Credit'}\n\n` +
    `Open the app to review and approve this order.`
  );
}

// Sent to the CUSTOMER when the cafe approves their order
export function orderApprovedMessage(order, cafeName) {
  return (
    `✅ <b>Order Approved!</b>\n\n` +
    `${cafeName} has accepted your order #${order.id.slice(0, 8)}.\n` +
    `Total: <b>${parseFloat(order.total).toFixed(2)} ETB</b>\n\n` +
    `It's now being prepared. 🎉`
  );
}
