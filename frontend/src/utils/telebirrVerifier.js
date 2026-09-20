// ── Telebirr Receipt Verifier (runs in browser) ───────────────
const BASE_URL = 'https://transactioninfo.ethiotelecom.et/receipt/';

export function extractReceiptCode(input) {
  const s = input.trim();
  const urlMatch = s.match(/transactioninfo\.ethiotelecom\.et\/receipt\/([A-Z0-9]+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();
  const amharicMatch = s.match(/ቁጥርዎ\s+([A-Z0-9]+)\s+ነዉ/);
  if (amharicMatch) return amharicMatch[1].toUpperCase();
  const clean = s.toUpperCase().replace(/\s/g, '');
  if (/^[A-Z0-9]{8,12}$/.test(clean)) return clean;
  return null;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseReceipt(html) {
  const data = {};
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => stripTags(m[1]));
    if (cells.length < 2) continue;
    const label = cells[0].toLowerCase();
    if (label.includes('payer name'))                  data.payer_name     = cells[1];
    else if (label.includes('payer telebirr'))         data.payer_phone    = cells[1];
    else if (label.includes('credited party name'))    data.credited_name  = cells[1];
    else if (label.includes('credited party account')) data.credited_phone = cells[1];
    if (cells.length >= 3 && cells[2].toLowerCase().includes('birr')) {
      data.settled_amount = cells[2];
    }
  }
  return data;
}

async function fetchHtml(receiptCode) {
  // Try direct first, then CORS proxy fallback
  try {
    const res = await fetch(BASE_URL + receiptCode);
    if (res.ok) return res.text();
  } catch (_) {}
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(BASE_URL + receiptCode)}`;
  const res2 = await fetch(proxy);
  if (!res2.ok) throw new Error('Cannot reach Telebirr server');
  return res2.text();
}

export async function verifyTelebirrReceipt(userInput, expectedAmount, cafe) {
  if (!cafe?.telebirr_name || !cafe?.telebirr_phone) {
    return { success: false, message: '❌ This cafe has not set up their Telebirr account info yet.' };
  }

  const receiptCode = extractReceiptCode(userInput);
  if (!receiptCode) {
    return { success: false, message: '❌ Invalid input. Paste a Telebirr receipt link, code, or SMS.' };
  }

  let html;
  try {
    html = await fetchHtml(receiptCode);
  } catch (_) {
    return { success: false, message: '❌ Could not connect to Telebirr server. Upload a screenshot instead.' };
  }

  const data = parseReceipt(html);

  // Check recipient name
  const creditedName = (data.credited_name || '').toLowerCase().trim();
  const expectedName = cafe.telebirr_name.toLowerCase().trim();
  if (!creditedName.includes(expectedName) && !expectedName.includes(creditedName)) {
    return { success: false, message: `❌ Wrong recipient. Sent to "${data.credited_name || 'unknown'}" — expected "${cafe.telebirr_name}".` };
  }

  // Check phone last 4 digits
  const creditedPhone  = (data.credited_phone || '').replace(/\s/g, '');
  const expectedSuffix = cafe.telebirr_phone.replace(/\s/g, '').slice(-4);
  if (!creditedPhone.endsWith(expectedSuffix)) {
    return { success: false, message: `❌ Wrong account. Sent to ...${creditedPhone.slice(-4)} — expected ...${expectedSuffix}.` };
  }

  // Check amount
  const actualAmount = parseFloat((data.settled_amount || '0').replace(/birr/gi, '').replace(/,/g, '').trim());
  if (isNaN(actualAmount)) return { success: false, message: '❌ Could not read amount from receipt.' };
  if (actualAmount < expectedAmount) {
    return { success: false, message: `❌ Insufficient. Paid ${actualAmount} Birr — expected ${expectedAmount} Birr.` };
  }

  return {
    success: true,
    message: `✅ Verified! ${actualAmount} Birr from ${data.payer_name || 'customer'} | Code: ${receiptCode}`,
    amount: actualAmount,
    receiptCode,
  };
}
