import { request } from './auth.js';

// paymentMethod: 'telebirr' | 'cbe_birr' | 'bank_transfer' | 'cash'
export const submitDeposit = (cafeId, amount, paymentMethod, transactionNumber) =>
  request('POST', '/deposits', {
    cafe_id: cafeId,
    amount,
    payment_method: paymentMethod,
    transaction_number: transactionNumber,
  });
