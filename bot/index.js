import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { detectRole, saveCustomer } from './roles.js';
import { buildWelcome, buildPostRegistration, buildHelp } from './messages.js';

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env');
  process.exit(1);
}

// ── Create bot in polling mode ─────────────────────────────────
// For production, switch to webhook mode (see bottom of file).
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🤖 Bot is running...');


// ── /start ─────────────────────────────────────────────────────
// Entry point for all users.
// Flow:
//   Known admin      → show "Open Admin Terminal" button
//   Known cafe owner → show "Open Cafe Dashboard" button
//   Known customer   → show "Open Food App" button
//   New user         → ask them to share their phone number
bot.onText(/\/start/, async (msg) => {
  const chatId    = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const { role, account } = await detectRole(telegramId);
    const { text, options } = buildWelcome(role, account);
    await bot.sendMessage(chatId, text, options);
  } catch (err) {
    console.error('/start error:', err.message);
    await bot.sendMessage(chatId, '⚠️ Something went wrong. Please try again later.');
  }
});


// ── Contact shared (phone number) ──────────────────────────────
// Triggered when a new user taps "Share Phone Number".
// We extract name + phone, create their global account,
// then send the "Open Food App" button.
bot.on('contact', async (msg) => {
  const chatId     = msg.chat.id;
  const telegramId = msg.from.id;
  const contact    = msg.contact;

  // Only accept contacts that the user shared for themselves
  if (contact.user_id !== telegramId) {
    await bot.sendMessage(chatId, '⚠️ Please share your own phone number, not someone else\'s.');
    return;
  }

  try {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || msg.from.username || 'Customer';
    const phone = contact.phone_number;

    await saveCustomer(telegramId, name, phone);

    const { text, options } = buildPostRegistration(name);
    await bot.sendMessage(chatId, text, options);

  } catch (err) {
    console.error('contact error:', err.message);
    await bot.sendMessage(chatId, '⚠️ Failed to create your account. Please try /start again.');
  }
});


// ── /app ───────────────────────────────────────────────────────
// Quick shortcut to open the app for existing users.
bot.onText(/\/app/, async (msg) => {
  const chatId     = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const { role, account } = await detectRole(telegramId);

    if (role === 'new') {
      await bot.sendMessage(chatId,
        '⚠️ You need to register first. Send /start to get started.'
      );
      return;
    }

    const { text, options } = buildWelcome(role, account);
    await bot.sendMessage(chatId, text, options);
  } catch (err) {
    console.error('/app error:', err.message);
    await bot.sendMessage(chatId, '⚠️ Something went wrong. Please try again.');
  }
});


// ── /status ────────────────────────────────────────────────────
// Shows the user their role + account status.
bot.onText(/\/status/, async (msg) => {
  const chatId     = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const { role, account } = await detectRole(telegramId);

    let text = '';
    if (role === 'new') {
      text = '❌ You are not registered yet. Send /start to create your account.';
    } else if (role === 'admin') {
      text = `✅ *Admin account*\nName: ${account.name}\nRole: Platform Admin`;
    } else if (role === 'cafe_owner') {
      text = `✅ *Cafe Owner account*\nName: ${account.name}\nCafe: ${account.cafe_name}`;
    } else {
      text = `✅ *Customer account*\nName: ${account.name}\nPhone: ${account.phone}`;
    }

    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('/status error:', err.message);
    await bot.sendMessage(chatId, '⚠️ Something went wrong.');
  }
});


// ── /help ──────────────────────────────────────────────────────
bot.onText(/\/help/, async (msg) => {
  const { text, options } = buildHelp();
  await bot.sendMessage(msg.chat.id, text, options);
});


// ── Handle unknown messages ────────────────────────────────────
bot.on('message', async (msg) => {
  // Ignore commands and contacts (handled above)
  if (msg.text?.startsWith('/') || msg.contact) return;

  await bot.sendMessage(
    msg.chat.id,
    '👋 Send /start to open the app or /help to see available commands.'
  );
});


// ── Error handling ─────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

bot.on('error', (err) => {
  console.error('Bot error:', err.message);
});


// ============================================================
// PRODUCTION: WEBHOOK MODE
// ============================================================
// When you deploy to a server with HTTPS, switch from polling
// to webhook for better performance and reliability.
//
// Steps:
//   1. Set WEBHOOK_URL in .env to your server's HTTPS URL
//   2. Uncomment the webhook setup below
//   3. Comment out the polling: true line above
//
// import express from 'express';
// const app = express();
// app.use(express.json());
//
// const WEBHOOK_URL = process.env.WEBHOOK_URL;
// bot.setWebHook(`${WEBHOOK_URL}/bot${TOKEN}`);
//
// app.post(`/bot${TOKEN}`, (req, res) => {
//   bot.processUpdate(req.body);
//   res.sendStatus(200);
// });
//
// app.listen(3001, () => console.log('Webhook server running on port 3001'));
