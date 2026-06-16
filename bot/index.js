import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import http from 'http';
import { detectRole, saveCustomer } from './roles.js';
import { buildWelcome, buildPostRegistration, buildHelp } from './messages.js';

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env');
  process.exit(1);
}

// ── Health check HTTP server ───────────────────────────────────
// Render requires a web server listening on PORT.
// This tiny server satisfies that requirement while the bot
// runs its polling loop alongside it.
const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    bot: 'running',
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});

// ── Create bot in polling mode ─────────────────────────────────
const bot = new TelegramBot(TOKEN, { polling: true });
console.log('🤖 Bot is running...');


// ── /start ─────────────────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const chatId     = msg.chat.id;
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
bot.on('contact', async (msg) => {
  const chatId     = msg.chat.id;
  const telegramId = msg.from.id;
  const contact    = msg.contact;

  if (contact.user_id !== telegramId) {
    await bot.sendMessage(chatId, '⚠️ Please share your own phone number.');
    return;
  }

  try {
    const name  = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || msg.from.username || 'Customer';
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
bot.onText(/\/app/, async (msg) => {
  const chatId     = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const { role, account } = await detectRole(telegramId);
    if (role === 'new') {
      await bot.sendMessage(chatId, '⚠️ You need to register first. Send /start to get started.');
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
bot.onText(/\/status/, async (msg) => {
  const chatId     = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const { role, account } = await detectRole(telegramId);

    let text = '';
    if (role === 'new') {
      text = '❌ You are not registered yet. Send /start to create your account.';
    } else if (role === 'admin') {
      text = `✅ *Admin account*\nName: ${account.name}`;
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
