import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { placeOrder } from '../../api/orders.js';
import useCafeContext from '../../hooks/useCafeContext.js';
import BottomNav from '../../components/BottomNav.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';
import useLanguage from '../../hooks/useLanguage.js';

export default function Cart() {
  const { cafeId }  = useParams();
  const navigate    = useNavigate();
  const { t }       = useLanguage();
  const { cafeAccount, loading: ctxLoading } = useCafeContext();

  const TRANSFER_PROVIDERS = [
    { value: 'telebirr',      label: '📱 Telebirr' },
    { value: 'cbe_birr',      label: '🏦 CBE Birr' },
    { value: 'bank_transfer', label: `🏛️ ${t('transfer')}` },
  ];

  const cart            = useStore(s => s.cart);
  const addToCart       = useStore(s => s.addToCart);
  const removeFromCart  = useStore(s => s.removeFromCart);
  const removeItemFully = useStore(s => s.removeItemFully);
  const clearCart       = useStore(s => s.clearCart);

  const [paymentMethod,    setPaymentMethod]    = useState('cash');
  const [transferProvider, setTransferProvider] = useState('telebirr');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [note,     setNote]     = useState('');
  const [placing,  setPlacing]  = useState(false);
  const [success,  setSuccess]  = useState(null);

  const isApproved = cafeAccount?.status === 'approved';

  // Totals
  const subtotal      = cart.reduce((s, i) => s + i.base_price * i.quantity, 0);
  const feeTotal      = cart.reduce((s, i) => s + (i.service_fee || 0) * i.quantity, 0);
  const listTotal     = cart.reduce((s, i) => s + i.list_price * i.quantity, 0);
  const walletTotal   = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountTotal = listTotal - walletTotal;

  const balance     = parseFloat(cafeAccount?.balance || 0);
  const creditLimit = parseFloat(cafeAccount?.credit_limit || 0);
  // balance is a single SIGNED number now. It can go as low as
  // -creditLimit, so the most this order can spend is balance + creditLimit
  // (e.g. balance=50, creditLimit=200 -> can spend up to 250 before blocked).
  const spendable = balance + creditLimit;
  const canAffordWallet = spendable >= walletTotal;

  // Wallet uses discounted price, cash/transfer use list price
  const total = paymentMethod === 'wallet' ? walletTotal : listTotal;

  async function handlePlaceOrder() {
    if (cart.length === 0) return;

    // Wallet requires approved account
    if (paymentMethod === 'wallet') {
      if (!isApproved) {
        return telegram.alert(t('notApproved'));
      }
      if (!canAffordWallet) {
        return telegram.alert(t('insufficientFunds'));
      }
    }

    if (paymentMethod === 'transfer' && !transactionNumber.trim()) {
      return telegram.alert(t('enterTxNumber'));
    }

    setPlacing(true);
    try {
      const items = cart.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity }));

      let paymentInfo = { payment_method: 'wallet' };
      if (paymentMethod === 'transfer') {
        paymentInfo = {
          payment_method:     'transfer',
          transfer_provider:  transferProvider,
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

  if (ctxLoading) return <Spinner fullPage label={t('loading')} />;

  // ── Success screen ─────────────────────────────────────────
  if (success) {
    const isCash = paymentMethod === 'cash';
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{isCash ? '💵' : '✅'}</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{t('orderPlacedTitle')}</div>

        {isCash && (
          <div style={{ background: '#fff3e0', border: '1.5px solid #f97316', borderRadius: 12, padding: '14px 20px', margin: '0 24px 16px', fontSize: 14, color: '#c2410c', lineHeight: 1.6 }}>
            ⚠️ <strong>{t('cashPaymentLabel')}</strong><br />
            {t('prepareWord')} <strong>{total.toFixed(2)} {t('etb')}</strong> {t('inCashPeriod')}<br />
            {t('cashPayCollectLine2')}
          </div>
        )}

        {!isCash && (
          <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16, padding: '0 32px' }}>
            {paymentMethod === 'transfer'
              ? t('transferReceivedMsg')
              : t('orderWaitingMsg')}
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)', fontSize: 22, fontWeight: 800, marginBottom: 32 }}>
          {total.toFixed(2)} {t('etb')}
        </div>
        <button className="btn btn-red" style={{ maxWidth: 240 }} onClick={() => navigate(`/cafe/${cafeId}/menu`)}>
          {t('backToMenu')}
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
          <div className="header-title">{t('myCart')}</div>
          <div style={{ width: 36 }} />
        </div>
        <div className="empty" style={{ marginTop: 60 }}>
          <div className="empty-icon">🛒</div>
          <div className="empty-title">{t('cartEmpty')}</div>
          <button className="btn btn-red" style={{ maxWidth: 200, margin: '16px auto 0' }} onClick={() => navigate(`/cafe/${cafeId}/menu`)}>
            {t('browseMenu')}
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
        <div className="header-title">{t('myCart')}</div>
        <button className="header-icon" onClick={() => clearCart()}>🗑️</button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Cart items */}
        <div className="section-label">{t('selectedFoods')}</div>
        <div className="card" style={{ padding: 0, marginBottom: 16 }}>
          {cart.map(item => (
            <div key={item.menu_item_id} className="cart-item">
              <div className="food-thumb" style={{ background: 'var(--bg)' }}>🍽️</div>
              <div className="cart-item-info">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-price">{parseFloat(item.price).toFixed(2)} {t('etb')}</div>
                {parseFloat(item.discount_percent || 0) > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--green)' }}>
                    {item.discount_percent}{t('offWithWallet')}
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
            <span>{t('subtotal')}</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{subtotal.toFixed(2)} {t('etb')}</span>
          </div>
          {feeTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: 'var(--text2)' }}>
              <span>{t('serviceFee')}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{feeTotal.toFixed(2)} {t('etb')}</span>
            </div>
          )}
          {discountTotal > 0 && paymentMethod === 'wallet' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: 'var(--green)' }}>
              <span>{t('walletDiscount')}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>−{discountTotal.toFixed(2)} {t('etb')}</span>
            </div>
          )}
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 17 }}>
            <span>{t('total')}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>
              {total.toFixed(2)} {t('etb')}
            </span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="section-label">{t('paymentMethod')}</div>

        {/* Cash — shown first, always available */}
        <div
          className={`payment-option ${paymentMethod === 'cash' ? 'selected' : ''}`}
          onClick={() => setPaymentMethod('cash')}
        >
          <div className={`payment-radio ${paymentMethod === 'cash' ? 'selected' : ''}`}>
            {paymentMethod === 'cash' && <div className="payment-radio-dot" />}
          </div>
          <div className="payment-info">
            <div className="payment-name">💵 {t('payWithCash')}</div>
            <div className="payment-desc">{t('payCashDesc')}</div>
          </div>
        </div>

        {/* Transfer — always available */}
        <div
          className={`payment-option ${paymentMethod === 'transfer' ? 'selected' : ''}`}
          onClick={() => setPaymentMethod('transfer')}
        >
          <div className={`payment-radio ${paymentMethod === 'transfer' ? 'selected' : ''}`}>
            {paymentMethod === 'transfer' && <div className="payment-radio-dot" />}
          </div>
          <div className="payment-info">
            <div className="payment-name">🏦 {t('payViaTransfer')}</div>
            <div className="payment-desc">{t('payTransferDesc')}</div>
          </div>
        </div>

        {/* Transfer sub-form */}
        {paymentMethod === 'transfer' && (
          <div style={{ marginBottom: 10, padding: '12px 14px', background: 'var(--bg)', borderRadius: 10 }}>
            <div className="input-group" style={{ marginBottom: 10 }}>
              <label className="input-label">{t('provider')}</label>
              <select className="input" style={{ paddingLeft: 14 }} value={transferProvider} onChange={e => setTransferProvider(e.target.value)}>
                {TRANSFER_PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">{t('transactionNo')}</label>
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

        {/* Wallet — only shown if approved */}
        {isApproved && (
          <div
            className={`payment-option ${paymentMethod === 'wallet' ? 'selected' : ''}`}
            onClick={() => setPaymentMethod('wallet')}
          >
            <div className={`payment-radio ${paymentMethod === 'wallet' ? 'selected' : ''}`}>
              {paymentMethod === 'wallet' && <div className="payment-radio-dot" />}
            </div>
            <div className="payment-info">
              <div className="payment-name">👛 {creditLimit > 0 ? t('walletAndCredit') : t('wallet')}</div>
              <div className="payment-desc">
                {balance < 0
                  ? `${t('youOwe')} ${Math.abs(balance).toFixed(2)} ${t('etb')}`
                  : `${t('balance')}: ${balance.toFixed(2)} ${t('etb')}`}
                {creditLimit > 0 && ` · ${t('creditLimit')}: ${creditLimit.toFixed(2)} ${t('etb')}`}
              </div>
            </div>
            <span className={`badge ${canAffordWallet ? 'badge-approved' : 'badge-cancelled'}`}>
              {canAffordWallet ? t('statusOk') : t('statusLow')}
            </span>
          </div>
        )}

        {/* Not registered info */}
        {!isApproved && (
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>
            💡 {t('registerUnlockHint')}
          </div>
        )}

        {/* Cash warning */}
        {paymentMethod === 'cash' && (
          <div style={{ background: '#fff3e0', border: '1.5px solid #f97316', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#c2410c', lineHeight: 1.6 }}>
            ⚠️ {t('prepareWord')} <strong>{total.toFixed(2)} {t('etb')}</strong> {t('cashPrepareCollectSuffix')}
          </div>
        )}

        {/* Wallet summary */}
        {paymentMethod === 'wallet' && isApproved && (
          <div className="card" style={{ marginBottom: 16, fontSize: 13 }}>
            {balance > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text2)' }}>{t('fromBalance')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                  {Math.min(balance, walletTotal).toFixed(2)} {t('etb')}
                </span>
              </div>
            )}
            {walletTotal > Math.max(balance, 0) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text2)' }}>{t('fromCredit')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>
                  {(walletTotal - Math.max(balance, 0)).toFixed(2)} {t('etb')}
                </span>
              </div>
            )}
            <div className="divider" style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>{t('balanceAfter')}</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                color: (balance - walletTotal) < 0 ? 'var(--red)' : 'var(--green)'
              }}>
                {(balance - walletTotal) < 0 ? '−' : ''}{Math.abs(balance - walletTotal).toFixed(2)} {t('etb')}
                {(balance - walletTotal) < 0 ? ` ${t('owedSuffix')}` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Note */}
        <div className="input-group">
          <label className="input-label">{t('note')}</label>
          <input
            className="input"
            style={{ paddingLeft: 14 }}
            placeholder={t('specialRequestsPlaceholder')}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <button
          className="btn btn-red"
          onClick={handlePlaceOrder}
          disabled={placing}
        >
          {placing ? t('placingOrder') : `${t('placeOrder')} · ${total.toFixed(2)} ${t('etb')}`}
        </button>

        <div style={{ height: 90 }} />
      </div>

      <BottomNav variant="customer-cafe" cafeId={cafeId} active="cart" />
    </div>
  );
}
