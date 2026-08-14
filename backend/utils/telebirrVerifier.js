// ── Telebirr Receipt Verifier ─────────────────────────────────
// Node.js port of receipt_checker.py
// Fetches and parses an Ethio Telecom receipt page, then verifies
// that the payment went to the correct cafe account with enough amount.

const BASE_URL = 'https://transactioninfo.ethiotelecom.et/receipt/';

/**
 * Extracts the receipt code from:
 * 1. A full URL
 * 2. An Amharic SMS (ቁጥርዎ CODE ነዉ)
 * 3. A raw 10-char alphanumeric code
 */
export function extractReceiptCode(input) {
  const s = input.trim();

  // Strategy 1: full URL
  const urlMatch = s.match(/transactioninfo\.ethiotelecom\.et\/receipt\/([A-Z0-9]+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();

  // Strategy 2: Amharic SMS
  const amharicMatch = s.match(/ቁጥርዎ\s+([A-Z0-9]+)\s+ነዉ/);
  if (amharicMatch) return amharicMatch[1].toUpperCase();

  // Strategy 3: raw code only
  const clean = s.toUpperCase();
  if (/^[A-Z0-9]{10}$/.test(clean)) return clean;

  return null;
}

/**
 * Fetches the receipt HTML from Ethio Telecom.
 */
async function fetchReceipt(receiptCode) {
  const url = BASE_URL + receiptCode;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Parses the receipt HTML with simple regex (no external parser needed).
 * Returns { payer_name, payer_phone, credited_name, credited_phone, settled_amount }
 */
function parseReceipt(html) {
  const data = {};
  const clean = (s) => s.replace(/\s+/g, ' ').trim();

  // Extract table rows: <td>label</td><td>value</td>
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const tdRegex  = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

  const rows = html.match(rowRegex) || [];
  for (const row of rows) {
    const cells = [];
    let m;
    const cellIter = row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    for (const match of cellIter) {
      cells.push(clean(stripTags(match[1])));
    }
    if (cells.length < 2) continue;
    const label = cells[0].toLowerCase();
    const value = cells[1];

    if (label.includes('payer name'))                 data.payer_name      = value;
    else if (label.includes('payer telebirr'))        data.payer_phone     = value;
    else if (label.includes('credited party name'))   data.credited_name   = value;
    else if (label.includes('credited party account'))data.credited_phone  = value;
    else if (cells.length >= 3) {
      const c3 = clean(stripTags(row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi)?.[2] || ''));
      if (c3.toLowerCase().includes('birr')) data.settled_amount = c3;
    }
  }

  return data;
}

/**
 * Main verifier — checks a receipt against the cafe's Telebirr account.
 *
 * @param {string} userInput    - URL, SMS, or raw code from customer
 * @param {number} expectedAmount - order total to verify against
 * @param {object} cafeAccount  - { telebirr_name, telebirr_phone } from cafes table
 * @returns {{ success: boolean, message: string, amount: number|null, receiptCode: string|null, data: object|null }}
 */
export async function verifyTelebirrPayment(userInput, expectedAmount, cafeAccount) {
  const { telebirr_name, telebirr_phone } = cafeAccount;

  if (!telebirr_name || !telebirr_phone) {
    return { success: false, message: '❌ This cafe has not set up their Telebirr account info yet.', amount: null, receiptCode: null, data: null };
  }

  // 1. Extract receipt code
  const receiptCode = extractReceiptCode(userInput);
  if (!receiptCode) {
    return { success: false, message: '❌ Invalid input. Please send a valid Telebirr receipt link, code, or SMS.', amount: null, receiptCode: null, data: null };
  }

  // 2. Fetch receipt HTML
  let html;
  try {
    html = await fetchReceipt(receiptCode);
  } catch (err) {
    return { success: false, message: '❌ Could not connect to Telebirr server. Please try again.', amount: null, receiptCode, data: null };
  }

  // 3. Parse
  const data = parseReceipt(html);

  // 4. Verify recipient name
  const creditedName = (data.credited_name || '').toLowerCase();
  const expectedName = telebirr_name.toLowerCase();
  if (!creditedName.includes(expectedName) && !expectedName.includes(creditedName)) {
    return {
      success: false,
      message: `❌ Wrong recipient. Money was sent to "${data.credited_name || 'unknown'}" but expected "${telebirr_name}".`,
      amount: null, receiptCode, data,
    };
  }

  // 5. Verify recipient phone (last 4 digits)
  const creditedPhone = (data.credited_phone || '').trim();
  const expectedSuffix = telebirr_phone.slice(-4);
  if (!creditedPhone.endsWith(expectedSuffix)) {
    return {
      success: false,
      message: `❌ Wrong account number. Money sent to account ending in "${creditedPhone.slice(-4)}" but expected ending in "${expectedSuffix}".`,
      amount: null, receiptCode, data,
    };
  }

  // 6. Verify amount
  const amountStr = (data.settled_amount || '0').toLowerCase().replace('birr', '').trim();
  const actualAmount = parseFloat(amountStr);
  if (isNaN(actualAmount)) {
    return { success: false, message: '❌ Could not read the amount from the receipt.', amount: null, receiptCode, data };
  }
  if (actualAmount < expectedAmount) {
    return {
      success: false,
      message: `❌ Insufficient amount. Paid ${actualAmount} Birr but expected ${expectedAmount} Birr.`,
      amount: actualAmount, receiptCode, data,
    };
  }

  return {
    success: true,
    message: `✅ Payment verified! Amount: ${actualAmount} Birr | Receipt: ${receiptCode}`,
    amount: actualAmount,
    receiptCode,
    data,
  };
}
