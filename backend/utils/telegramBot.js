import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL   = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── sendTelegramMessage ────────────────────────────────────────
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
        chat_id:    chatId,
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


// ── newOrderMessage ────────────────────────────────────────────
// Sent to CAFE OWNER when a new order arrives.
// Cash orders get a special warning to collect payment.
export function newOrderMessage(order, customerName, items) {
  const itemLines = items
    .map(i => `• ${i.quantity}x ${i.name} — ${parseFloat(i.item_total).toFixed(2)} ETB`)
    .join('\n');

  const isCash     = order.payment_method === 'cash';
  const isTransfer = order.payment_method === 'transfer';

  let paymentLine = '';
  if (isCash) {
    paymentLine = `💵 <b>CASH PAYMENT</b> — Collect money from customer!`;
  } else if (isTransfer) {
    paymentLine = `🏦 Transfer (${order.transfer_provider?.replace('_', ' ')})`;
  } else {
    paymentLine = `👛 Wallet / Credit`;
  }

  // Extra warning block for cash orders
  const cashWarning = isCash
    ? `\n\n⚠️ <b>IMPORTANT:</b> This customer will pay in <b>CASH</b>.\nDo not forget to collect <b>${parseFloat(order.total).toFixed(2)} ETB</b> from them!`
    : '';

  return (
    `🔔 <b>New Order Received!</b>\n\n` +
    `Customer: ${customerName || 'Unknown'}\n` +
    `Order ID: #${order.id?.slice(0, 8)}\n\n` +
    `${itemLines}\n\n` +
    `Total: <b>${parseFloat(order.total).toFixed(2)} ETB</b>\n` +
    `Payment: ${paymentLine}` +
    `${cashWarning}\n\n` +
    `Open the app to review and approve this order.`
  );
}


// ── orderApprovedMessage ───────────────────────────────────────
// Sent to CUSTOMER when cafe approves their order.
// Cash orders remind the customer to bring their money.
export function orderApprovedMessage(order, cafeName) {
  const isCash = order.payment_method === 'cash';

  const cashReminder = isCash
    ? `\n\n💵 <b>Remember:</b> Please bring <b>${parseFloat(order.total).toFixed(2)} ETB</b> in cash to pay when you collect your order.`
    : '';

  return (
    `✅ <b>Order Approved!</b>\n\n` +
    `<b>${cafeName}</b> has accepted your order #${order.id?.slice(0, 8)}.\n` +
    `Total: <b>${parseFloat(order.total).toFixed(2)} ETB</b>\n\n` +
    `It is now being prepared. 🎉` +
    `${cashReminder}`
  );
}


// ── orderCancelledMessage ───────────────────────────────────────
// Sent to CUSTOMER when the cafe cancels/rejects their order.
// Wallet orders mention the refund since balance was already
// deducted at order time and gets restored on cancellation.
export function orderCancelledMessage(order, cafeName) {
  const wasWallet = order.payment_method === 'wallet';
  const refundAmount = parseFloat(order.paid_from_balance || 0) + parseFloat(order.paid_from_credit || 0);

  const refundNote = wasWallet && refundAmount > 0
    ? `\n\n💰 <b>${refundAmount.toFixed(2)} ETB</b> has been refunded to your balance.`
    : '';

  return (
    `❌ <b>Order Cancelled</b>\n\n` +
    `<b>${cafeName}</b> cancelled your order #${order.id?.slice(0, 8)}.\n` +
    `Total: <b>${parseFloat(order.total).toFixed(2)} ETB</b>` +
    `${refundNote}\n\n` +
    `If you have questions, please contact the cafe directly.`
  );
}


// ── newRegistrationMessage ──────────────────────────────────────
// Sent to CAFE OWNER when a customer requests to register
// (wallet/credit access). Without this push message, the cafe
// owner would only see the request if they happened to open the
// in-app notification bell — easy to miss, so this is the primary
// alert, same as new orders.
export function newRegistrationMessage(customerName, customerPhone) {
  return (
    `📝 <b>New Registration Request</b>\n\n` +
    `Customer: <b>${customerName || 'Unknown'}</b>\n` +
    `Phone: ${customerPhone || 'N/A'}\n\n` +
    `They want to register for wallet balance and credit payments at your cafe.\n` +
    `Open the app to approve or reject this request.`
  );
}


// ── registrationApprovedMessage ──────────────────────────────────
// Sent to CUSTOMER when the cafe approves their registration.
export function registrationApprovedMessage(cafeName) {
  return (
    `🎉 <b>Registration Approved!</b>\n\n` +
    `<b>${cafeName}</b> approved your account.\n` +
    `You can now pay with your wallet balance there.`
  );
}


// ── depositVerifiedMessage ───────────────────────────────────────
// Sent to CUSTOMER when their deposit is verified and added to balance.
export function depositVerifiedMessage(amount, cafeName) {
  return (
    `💰 <b>Deposit Verified!</b>\n\n` +
    `<b>${parseFloat(amount).toFixed(2)} ETB</b> has been added to your balance at <b>${cafeName}</b>.\n\n` +
    `You can now order using your wallet.`
  );
}


// ── creditLimitSetMessage ─────────────────────────────────────────
// Sent to CUSTOMER when the cafe owner sets or updates their credit
// limit directly from the customer's profile (no application step —
// the cafe owner can do this any time after approving registration).
export function creditLimitSetMessage(cafeName, limit) {
  return (
    `💳 <b>Credit Limit Set!</b>\n\n` +
    `<b>${cafeName}</b> set your credit limit to <b>${parseFloat(limit).toFixed(2)} ETB</b>.\n\n` +
    `You can use credit once your balance reaches zero, up to this limit.`
  );
}
