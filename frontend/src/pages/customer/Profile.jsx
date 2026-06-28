import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { getAccountHistory, transferBalance } from '../../api/customer.js';
import useCafeContext from '../../hooks/useCafeContext.js';
import BottomNav from '../../components/BottomNav.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';
import LangToggle from '../../components/LangToggle.jsx';
import useLanguage from '../../hooks/useLanguage.js';

const DEPOSIT_ICON = { verified: '⬇️', failed: '✕', pending: '⏳' };

export default function Profile() {
  const { cafeId } = useParams();
  const navigate   = useNavigate();
  const account    = useStore(s => s.account);
  const { cafe, cafeAccount, loading: ctxLoading, refreshAccount } = useCafeContext();

  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Send money sheet state
  const [showSend, setShowSend]   = useState(false);
  const [toPhone, setToPhone]     = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sending, setSending]     = useState(false);
  const [sendResult, setSendResult] = useState(null); // success result

  useEffect(() => {
    telegram.showBackButton(() => navigate(`/cafe/${cafeId}/menu`));
    return () => telegram.hideBackButton();
  }, []);

  useEffect(() => {
    getAccountHistory(cafeId)
      .then(data => setDeposits(data.deposits.slice(0, 3)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cafeId]);

  const { t } = useLanguage();

  const initials    = (account?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const balance     = parseFloat(cafeAccount?.balance || 0);
  const isNegative  = balance < 0;
  const creditLimit = parseFloat(cafeAccount?.credit_limit || 0);
  const maxSend     = balance + creditLimit; // can go into credit

  function openSend() {
    setToPhone('');
    setSendAmount('');
    setSendResult(null);
    setShowSend(true);
  }

  function closeSend() {
    setShowSend(false);
    setSendResult(null);
  }

  async function handleSend() {
    const amount = parseFloat(sendAmount);

    if (!toPhone.trim()) return telegram.alert('Enter the receiver\'s phone number.');
    if (!amount || amount <= 0) return telegram.alert('Enter a valid amount greater than 0.');
    if (amount > maxSend) {
      return telegram.alert(
        `You can send up to ${maxSend.toFixed(2)} ETB (balance + credit limit).`
      );
    }

    setSending(true);
    try {
      const result = await transferBalance(cafeId, toPhone.trim(), amount);
      setSendResult(result);
      telegram.haptic('success');
      // Refresh the balance display
      await refreshAccount?.();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSending(false);
    }
  }

  if (ctxLoading || loading) return <Spinner fullPage label="Loading profile..." />;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate(`/cafe/${cafeId}/menu`)}>‹</button>
        <div className="header-title">{t('profile')}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <LangToggle />
          <NotificationBell to="/notifications" />
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* User info */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div className="avatar avatar-lg" style={{ background: 'var(--red)' }}>{initials}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{account?.name || 'Customer'}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {account?.phone || '—'}</div>
            <div style={{ marginTop: 4 }}>
              <StatusBadge
                status={cafeAccount?.status || 'pending'}
                label={`${cafe?.name || 'This cafe'}: ${cafeAccount?.status || 'not registered'}`}
              />
            </div>
          </div>
        </div>

        {/* Balance card */}
        <div className="balance-card" style={{ marginBottom: 16, background: isNegative ? 'linear-gradient(135deg, #e63946, #c0000a)' : undefined }}>
          <div className="balance-emoji">{isNegative ? '⚠️' : '👛'}</div>
          <div className="balance-label">{isNegative ? t('youOwe') : t('currentBalance')}</div>
          <div className="balance-amount">
            {isNegative ? '−' : ''}{Math.abs(balance).toFixed(2)} <span>{t('etb')}</span>
          </div>
          {creditLimit > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 14, color: 'rgba(255,255,255,0.85)' }}>
              <span>{t('creditLimit')}: {creditLimit.toFixed(2)} {t('etb')}</span>
              <span>{t('remainingCredit')}: {(creditLimit - Math.max(-balance, 0)).toFixed(2)} {t('etb')}</span>
            </div>
          )}
          <div className="balance-actions">
            <button className="btn btn-white" onClick={() => navigate(`/cafe/${cafeId}/deposit`)}>
              {t('deposit')}
            </button>
            {cafeAccount?.status === 'approved' && (
              <button className="btn btn-white" onClick={openSend}>
                {t('sendMoney')}
              </button>
            )}
          </div>
        </div>

        {/* Deposit history */}
        <div className="section-header">
          <div className="section-title" style={{ fontSize: 16 }}>{t('depositHistory')}</div>
          <div className="section-link" onClick={() => navigate(`/cafe/${cafeId}/deposit`)}>{t('viewAll')}</div>
        </div>
      </div>

      {deposits.length === 0 ? (
        <div style={{ padding: '0 16px 16px', color: 'var(--text2)', fontSize: 13 }}>No deposits yet</div>
      ) : (
        <div className="card" style={{ margin: '0 16px 16px' }}>
          {deposits.map(d => (
            <div key={d.id} className="deposit-row">
              <div className={`deposit-icon ${d.status === 'pending' ? 'pending' : ''}`}>
                {DEPOSIT_ICON[d.status] || '⏳'}
              </div>
              <div>
                <div className="deposit-amount">+{parseFloat(d.amount).toFixed(2)} ETB</div>
                <div className="deposit-sub">{d.payment_method.replace('_', ' ').toUpperCase()}</div>
              </div>
              <div className="deposit-right">
                <div className="deposit-date">{new Date(d.created_at).toLocaleDateString()}</div>
                <StatusBadge status={d.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Menu links */}
      <div className="card" style={{ margin: '0 16px', padding: 0, overflow: 'hidden' }}>
        {cafeAccount?.status !== 'approved' && (
          <div className="profile-menu-item" onClick={() => navigate(`/cafe/${cafeId}/menu?register=1`)}>
            <div className="profile-menu-icon" style={{ background: 'var(--red-light)' }}>📝</div>
            <div className="profile-menu-label" style={{ color: 'var(--red)', fontWeight: 700 }}>
              {cafeAccount?.status === 'pending' ? t('registrationPending') : t('registerAtCafe')}
            </div>
            <div className="profile-chevron">›</div>
          </div>
        )}
        {cafeAccount?.status === 'approved' && (
          <div className="profile-menu-item" onClick={openSend}>
            <div className="profile-menu-icon" style={{ background: '#e8f5e9' }}>💸</div>
            <div className="profile-menu-label">{t('sendMoneyTitle')}</div>
            <div className="profile-chevron">›</div>
          </div>
        )}
        <div className="profile-menu-item" onClick={() => navigate(`/cafe/${cafeId}/orders`)}>
          <div className="profile-menu-icon">🧾</div>
          <div className="profile-menu-label">{t('orderHistory')}</div>
          <div className="profile-chevron">›</div>
        </div>
        <div className="profile-menu-item" onClick={() => navigate(`/cafe/${cafeId}/menu`)}>
          <div className="profile-menu-icon">🍽️</div>
          <div className="profile-menu-label">{t('browseMenu')}</div>
          <div className="profile-chevron">›</div>
        </div>
        <div className="profile-menu-item" onClick={() => navigate('/')}>
          <div className="profile-menu-icon">🏪</div>
          <div className="profile-menu-label">{t('switchCafe')}</div>
          <div className="profile-chevron">›</div>
        </div>
      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="customer-cafe" cafeId={cafeId} active="profile" />

      {/* ── Send Money sheet ──────────────────────────────────── */}
      {showSend && (
        <div className="overlay" onClick={closeSend}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />

            {sendResult ? (
              /* ── Success state ─────────────────────────────── */
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Sent Successfully!</div>
                <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 6 }}>
                  You sent <strong>{parseFloat(sendResult.amount).toFixed(2)} ETB</strong>
                </div>
                <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
                  to <strong>{sendResult.to}</strong>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, marginBottom: 24, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text2)' }}>Your new balance</span>
                    <span style={{ fontWeight: 700, color: sendResult.sender_balance < 0 ? 'var(--red)' : '#22c55e' }}>
                      {sendResult.sender_balance < 0 ? '−' : ''}{Math.abs(sendResult.sender_balance).toFixed(2)} ETB
                    </span>
                  </div>
                </div>
                <button className="btn btn-red" onClick={closeSend}>Done</button>
              </div>
            ) : (
              /* ── Send form ─────────────────────────────────── */
              <>
                <div className="sheet-title">{t('sendMoneyTitle')}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.5 }}>
                  {t('sendMoneyDesc')} <strong>{cafe?.name}</strong>.
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{t('availableToSend')}</span>
                  <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: 16 }}>
                    {maxSend.toFixed(2)} {t('etb')}
                  </span>
                </div>
                <div className="input-group">
                  <label className="input-label">{t('receiverPhone')}</label>
                  <input
                    className="input"
                    style={{ paddingLeft: 14 }}
                    type="tel"
                    placeholder="+251 9__ __ __ __"
                    value={toPhone}
                    onChange={e => setToPhone(e.target.value)}
                  />
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                    {t('receiverPhoneHint')}
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">{t('amountEtb')}</label>
                  <input
                    className="input"
                    style={{ paddingLeft: 14, fontWeight: 700, fontSize: 20 }}
                    type="number" min="1" placeholder="0.00"
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                  />
                </div>
                <button className="btn btn-red" onClick={handleSend} disabled={sending} style={{ marginBottom: 10 }}>
                  {sending ? t('sending') : `💸 ${t('send')} ${sendAmount ? parseFloat(sendAmount).toFixed(2) + ' ' + t('etb') : ''}`}
                </button>
                <button className="btn btn-outline" onClick={closeSend}>{t('cancel')}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
