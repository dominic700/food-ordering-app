import { request } from './auth.js';

// paymentMethod: 'telebirr' | 'cbe_birr' | 'bank_transfer' | 'cash'
export const submitDeposit = (cafeId, amount, paymentMethod, transactionNumber, screenshotData = null) =>
  request('POST', '/deposits', {
    cafe_id: cafeId,
    amount,
    payment_method: paymentMethod,
    transaction_number: transactionNumber,
    screenshot_data: screenshotData,
  });

export const verifyDepositTelebirr = (cafeId, receiptInput, expectedAmount) =>
  request('POST', '/deposits/verify-telebirr', {
    cafe_id: cafeId,
    receipt_input: receiptInput,
    expected_amount: expectedAmount,
  });
