import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { placeOrder } from '../../api/orders.js';
import useCafeContext from '../../hooks/useCafeContext.js';
import BottomNav from '../../components/BottomNav.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

const TRANSFER_PROVIDERS = [
  { value: 'telebirr',      label: '📱 Telebirr' },
  { value: 'cbe_birr',      label: '🏦 CBE Birr' },
  { value: 'bank_transfer', label: '🏛️ Bank Transfer' },
];

export default function Cart() {
  const { cafeId } = useParams();
  const navigate   = useNavigate();
  const { cafeAccount, loading: ctxLoading } = useCafeContext();

  const cart           = useStore(s => s.cart);
  const addToCart      = useStore(s => s.addToCart);
  const removeFromCart = useStore(s => s.removeFromCart);
  const removeItemFully = useStore(s => s.removeItemFully);
  const clearCart      = useStore(s => s.clearCart);

  const [paymentMethod, setPaymentMethod]   = useState('wallet');
  const [transferProvider, setTransferProvider] = useState('telebirr');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [note, setNote]       = useState('');
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(null);

  // Totals
  const subtotal     = cart.reduce((s, i) => s + i.base_price * i.quantity, 0);
  const feeTotal     = cart.reduce((s, i) => s + (i.service_fee || 0) * i.quantity, 0);
  const listTotal    = cart.reduce((s, i) => s + i.list_price * i.quantity, 0);
  const walletTotal  = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountTotal = listTotal - walletTotal;

  const balance      = parseFloat(cafeAccount?.balance || 0);
  const creditLimit  = parseFloat(cafeAccount?.credit_limit || 0);
  const creditUsed   = parseFloat(cafeAccount?.credit_used || 0);
  const creditAvail  = creditLimit - creditUsed;
  const canAffordWallet = (balance + creditAvail) >= walletTotal;

  // Cash and transfer pay full list price (no discount)
  const total = paymentMethod === 'wallet' ? walletTotal : listTotal;

  async function handlePlaceOrder() {
    if (cart.length === 0) return;

    if (paymentMethod === 'wallet' && !canAffordWallet) {
      return telegram.alert('Insufficient balance and credit. Please deposit money or choose Cash payment.');
    }
    if (paymentMethod === 'transfer' && !transactionNumber.trim()) {
      return telegram.alert('Please enter the transaction number.');
    }

    setPlacing(true);
    try {
      const items = cart.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity }));

      let paymentInfo = { payment_method: 'wallet' };
      if (paymentMethod === 'transfer') {
        paymentInfo = {
          payment_method:    'transfer',
          transfer_provider: transferProvider,
          transaction_number: transactionNumber.trim(),
        };
      } else if (paymentMethod === 'cash') {
        paymentInfo = { payment_method: 'cash' };
      }

      const result = await placeOrder(cafeId, items, note, paymentInfo);
      clearCart();
      setSuccess(result);
      telegram.haptic('success');
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setPlacing(false);
    }
  }

  if (ctxLoading) return <Spinner fullPage label="Loading cart..." />;

  // ── Success screen ─────────────────────────────────────────
  if (success) {
    const isCash = paymentMethod === 'cash';
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{isCash ? '💵' : '✅'}</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Order Placed!</div>

        {isCash ? (
          <div style={{ background: '#fff3e0', border: '1.5px solid #f97316', borderRadius: 12, padding: '14px 20px', margin: '0 24px 16px', fontSize: 14, color: '#c2410c', lineHeight: 1.6 }}>
            ⚠️ <strong>Cash Payment</strong><br />
            Please prepare <strong>{total.toFixed(2)} ETB</strong> in cash.<br />
            Pay the cafe when you collect your order.
          </div>
        ) : (
          <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16, padding: '0 32px' }}>
            {paymentMethod === 'transfer'
              ? "Transfer received. The cafe will prepare your order."
              : "Your order is waiting for the cafe's approval."}
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)', fontSize: 22, fontWeight: 800, marginBottom: 32 }}>
          {total.toFixed(2)} ETB
        </div>
        <button
          className="btn btn-red"
          style={{ maxWidth: 240 }}
          onClick={() => navigate(`/cafe/${cafeId}/menu`)}
        >
          Back to Menu
        </button>
        <BottomNav variant="customer-cafe" cafeId={cafeId} active="cart" />
      </div>
    );
  }

  // ── Empty cart ─────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div className="page">
        <div className="header">
          <button className="header-icon" onClick={() => navigate(`/cafe/${cafeId}/menu`)}>‹</button>
          <div className="header-title">My Cart</div>
          <div style={{ width: 36 }} />
        </div>
        <div className="empty" style={{ marginTop: 60 }}>
          <div className="empty-icon">🛒</div>
          <div className="empty-title">Your cart is empty</div>
          <button className="btn btn-red" style={{ maxWidth: 200, margin: '16px auto 0' }} onClick={() => navigate(`/cafe/${cafeId}/menu`)}>
            Browse Menu
          </button>
        </div>
        <BottomNav variant="customer-cafe" cafeId={cafeId} active="cart" />
      </div>
    );
  }

  // ── Cart page ──────────────────────────────────────────────
  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate(`/cafe/${cafeId}/menu`)}>‹</button>
        <div className="header-title">My Cart</div>
        <button className="header-icon" onClick={() => clearCart()}>🗑️</button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Cart items */}
        <div className="section-label">Selected Foods</div>
        <div className="card" style={{ padding: 0, marginBottom: 16 }}>
          {cart.map(item => (
            <div key={item.menu_item_id} className="cart-item">
              <div className="food-thumb" style={{ background: 'var(--bg)' }}>🍽️</div>
              <div className="cart-item-info">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-price">{parseFloat(item.price).toFixed(2)} ETB</div>
                {parseFloat(item.discount_percent || 0) > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--green)' }}>
                    {item.discount_percent}% off applied
                  </div>
                )}
                <div className="qty-ctrl">
                  <button className="qty-btn" onClick={() => removeFromCart(item.menu_item_id)}>−</button>
                  <span className="qty-num">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => addToCart(item)}>+</button>
                </div>
              </div>
              <button className="cart-remove" onClick={() => removeItemFully(item.menu_item_id)}>✕</button>
            </div>
          ))}
        </div>

        {/* Price summary */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: 'var(--text2)' }}>
            <span>Subtotal</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{subtotal.toFixed(2)} ETB</span>
          </div>
          {feeTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: 'var(--text2)' }}>
              <span>Service Fee</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{feeTotal.toFixed(2)} ETB</span>
            </div>
          )}
          {discountTotal > 0 && paymentMethod === 'wallet' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: 'var(--green)' }}>
              <span>Discount</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>−{discountTotal.toFixed(2)} ETB</span>
            </div>
          )}
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 17 }}>
            <span>Total</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>
              {total.toFixed(2)} ETB
            </span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="section-label">Payment Method</div>

        {/* Wallet & Credit */}
        <div
          className={`payment-option ${paymentMethod === 'wallet' ? 'selected' : ''}`}
          onClick={() => setPaymentMethod('wallet')}
        >
          <div className={`payment-radio ${paymentMethod === 'wallet' ? 'selected' : ''}`}>
            {paymentMethod === 'wallet' && <div className="payment-radio-dot" />}
          </div>
          <div className="payment-info">
            <div className="payment-name">👛 Wallet Balance &amp; Credit</div>
            <div className="payment-desc">
              Balance: {balance.toFixed(2)} ETB · Credit: {creditAvail.toFixed(2)} ETB
            </div>
          </div>
          <span className={`badge ${canAffordWallet ? 'badge-approved' : 'badge-cancelled'}`}>
            {canAffordWallet ? 'Sufficient' : 'Low'}
          </span>
        </div>

        {/* Pay via Transfer */}
        <div
          className={`payment-option ${paymentMethod === 'transfer' ? 'selected' : ''}`}
          onClick={() => setPaymentMethod('transfer')}
        >
          <div className={`payment-radio ${paymentMethod === 'transfer' ? 'selected' : ''}`}>
            {paymentMethod === 'transfer' && <div className="payment-radio-dot" />}
          </div>
          <div className="payment-info">
            <div className="payment-name">🏦 Pay via Transfer</div>
            <div className="payment-desc">Telebirr, CBE Birr, or Bank Transfer</div>
          </div>
        </div>

        {/* Transfer sub-form */}
        {paymentMethod === 'transfer' && (
          <div style={{ marginBottom: 10, padding: '12px 14px', background: 'var(--bg)', borderRadius: 10 }}>
            <div className="input-group" style={{ marginBottom: 10 }}>
              <label className="input-label">Provider</label>
              <select
                className="input"
                style={{ paddingLeft: 14 }}
                value={transferProvider}
                onChange={e => setTransferProvider(e.target.value)}
              >
                {TRANSFER_PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Transaction Number</label>
              <input
                className="input"
                style={{ paddingLeft: 14 }}
                placeholder="e.g. 1234567890"
                value={transactionNumber}
                onChange={e => setTransactionNumber(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Cash Payment */}
        <div
          className={`payment-option ${paymentMethod === 'cash' ? 'selected' : ''}`}
          onClick={() => setPaymentMethod('cash')}
          style={{ marginBottom: 16 }}
        >
          <div className={`payment-radio ${paymentMethod === 'cash' ? 'selected' : ''}`}>
            {paymentMethod === 'cash' && <div className="payment-radio-dot" />}
          </div>
          <div className="payment-info">
            <div className="payment-name">💵 Pay with Cash</div>
            <div className="payment-desc">Pay the cafe directly when you collect your order</div>
          </div>
        </div>

        {/* Cash warning banner */}
        {paymentMethod === 'cash' && (
          <div style={{
            background: '#fff3e0',
            border: '1.5px solid #f97316',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: '#c2410c',
            lineHeight: 1.6,
          }}>
            ⚠️ <strong>Cash Payment Selected</strong><br />
            Please prepare <strong>{total.toFixed(2)} ETB</strong> in cash.<br />
            The cafe will be notified to collect payment from you.
          </div>
        )}

        {/* Order summary */}
        {paymentMethod === 'wallet' && (
          <div className="card" style={{ marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text2)' }}>From Balance</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                {Math.min(balance, walletTotal).toFixed(2)} ETB
              </span>
            </div>
            {walletTotal > balance && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text2)' }}>From Credit</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>
                  {Math.min(walletTotal - balance, creditAvail).toFixed(2)} ETB
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Remaining Balance</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                {Math.max(balance - walletTotal, 0).toFixed(2)} ETB
              </span>
            </div>
          </div>
        )}

        {/* Note */}
        <div className="input-group">
          <label className="input-label">Note (optional)</label>
          <input
            className="input"
            style={{ paddingLeft: 14 }}
            placeholder="Any special requests..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {/* Place Order button */}
        <button
          className="btn btn-red"
          onClick={handlePlaceOrder}
          disabled={placing}
        >
          {placing
            ? 'Placing order...'
            : `Place Order · ${total.toFixed(2)} ETB`}
        </button>

        <div style={{ height: 90 }} />
      </div>

      <BottomNav variant="customer-cafe" cafeId={cafeId} active="cart" />
    </div>
  );
}
