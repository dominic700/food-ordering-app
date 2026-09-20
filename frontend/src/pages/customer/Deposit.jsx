import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAccountHistory } from '../../api/customer.js';
import { submitDeposit } from '../../api/deposits.js';
import { verifyTelebirrReceipt } from '../../utils/telebirrVerifier.js';
import useCafeContext from '../../hooks/useCafeContext.js';
import BottomNav from '../../components/BottomNav.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';
import useLanguage from '../../hooks/useLanguage.js';

const DEPOSIT_ICON = { verified: '⬇️', failed: '✕', pending: '⏳' };

export default function Deposit() {
  const { cafeId }  = useParams();
  const navigate    = useNavigate();
  const { t }       = useLanguage();
  const { cafeAccount, cafe, loading: ctxLoading, refreshAccount } = useCafeContext();

  const [method, setMethod]                         = useState('telebirr');
  const [deposits, setDeposits]                     = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [amount, setAmount]                         = useState('');
  const [txNumber, setTxNumber]                     = useState('');
  const [screenshot, setScreenshot]                 = useState(null);
  const [screenshotPreview, setScreenshotPreview]   = useState(null);
  const [submitting, setSubmitting]                 = useState(false);
  const [verifying, setVerifying]                   = useState(false);
  const [verifyResult, setVerifyResult]             = useState(null);

  useEffect(() => {
    telegram.showBackButton(() => navigate(`/cafe/${cafeId}/profile`));
    return () => telegram.hideBackButton();
  }, []);

  useEffect(() => { loadDeposits(); }, [cafeId]);

  function loadDeposits() {
    getAccountHistory(cafeId)
      .then(data => setDeposits(data.deposits))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function switchMethod(m) {
    setMethod(m);
    setVerifyResult(null);
    setTxNumber('');
    setScreenshot(null);
    setScreenshotPreview(null);
  }

  function handleScreenshot(e) {
    const file = e.target.files[0];
    if (!file) return;
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setVerifyResult(null);
    setTxNumber('');
  }

  async function handleSubmit() {
    if (!amount || parseFloat(amount) <= 0) {
      return telegram.alert(t('enterValidAmount'));
    }
    if (method === 'telebirr' && !verifyResult?.success && !screenshot) {
      return telegram.alert('Please verify your Telebirr receipt or upload a screenshot.');
    }

    setSubmitting(true);
    try {
      let screenshotData = null;
      if (screenshot) {
        screenshotData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(screenshot);
        });
      }
      await submitDeposit(
        cafeId,
        parseFloat(amount),
        method,
        txNumber.trim() || (screenshot ? 'screenshot' : 'cash'),
        screenshotData
      );
      setAmount('');
      setTxNumber('');
      setScreenshot(null);
      setScreenshotPreview(null);
      setVerifyResult(null);
      telegram.haptic('success');
      telegram.alert(t('depositSubmittedFull'));
      loadDeposits();
      refreshAccount();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (ctxLoading || loading) return <Spinner fullPage label={t('loading')} />;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate(`/cafe/${cafeId}/profile`)}>‹</button>
        <div className="header-title">{t('depositTitle')}</div>
        <button className="header-icon">❓</button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Balance card */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>{t('currentBalance')}</div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {parseFloat(cafeAccount?.balance || 0).toFixed(2)}
                <span style={{ fontSize: 14, color: 'var(--text2)' }}> {t('etb')}</span>
              </div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              👛
            </div>
          </div>
        </div>

        {/* Method selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => switchMethod('telebirr')}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 14,
              border: `2px solid ${method === 'telebirr' ? '#f97316' : 'var(--border)'}`,
              background: method === 'telebirr' ? '#fff8f3' : 'var(--bg)',
              color: method === 'telebirr' ? '#c2410c' : 'var(--text2)',
              cursor: 'pointer',
            }}
          >
            📱 Telebirr
          </button>
          <button
            onClick={() => switchMethod('cash')}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 14,
              border: `2px solid ${method === 'cash' ? '#22c55e' : 'var(--border)'}`,
              background: method === 'cash' ? '#f0fdf4' : 'var(--bg)',
              color: method === 'cash' ? '#15803d' : 'var(--text2)',
              cursor: 'pointer',
            }}
          >
            💵 Cash
          </button>
        </div>

        {/* Telebirr — cafe phone info */}
        {method === 'telebirr' && cafe?.telebirr_phone && (
          <div style={{
            background: '#fff8f3', border: '1.5px solid #f97316',
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#c2410c', marginBottom: 8 }}>
              📱 Send to Telebirr
            </div>
            {cafe.telebirr_name && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#374151' }}>Full Name</span>
                <span style={{ fontWeight: 700, color: '#7c2d12' }}>{cafe.telebirr_name}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#374151' }}>Phone Number</span>
              <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#7c2d12', fontSize: 15, letterSpacing: 1 }}>
                {cafe.telebirr_phone}
              </span>
            </div>
          </div>
        )}

        {/* Cash info */}
        {method === 'cash' && (
          <div style={{
            background: '#f0fdf4', border: '1.5px solid #22c55e',
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
            fontSize: 13, color: '#15803d', fontWeight: 600,
          }}>
            💵 Pay cash directly to the cafe. The cafe owner will verify and add your balance.
          </div>
        )}

        {/* Amount */}
        <div className="input-group">
          <label className="input-label">{t('depositAmount')}</label>
          <input
            className="input"
            style={{ paddingLeft: 14, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18 }}
            type="number" min="1" placeholder="0.00"
            value={amount} onChange={e => setAmount(e.target.value)}
          />
        </div>

        {/* Telebirr proof section */}
        {method === 'telebirr' && (
          <>
            {/* Caution message */}
            <div style={{
              background: '#fffbeb', border: '1.5px solid #f59e0b',
              borderRadius: 10, padding: '10px 14px', marginBottom: 12,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                <strong>Important:</strong> You must send the <strong>exact amount</strong> of{' '}
                <strong style={{ color: '#dc2626' }}>{parseFloat(amount || 0).toFixed(2)} ETB</strong> to the Telebirr number above.
                Sending a different amount will cause verification to fail and your deposit will not be submitted.
              </div>
            </div>

            {/* Option 1 — receipt code */}
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              Option 1 — Paste Receipt Link or Code
            </div>
            <div className="input-group">
              <input
                className="input" style={{ paddingLeft: 14 }}
                placeholder="Paste receipt URL, code or Amharic SMS..."
                value={txNumber}
                onChange={e => {
                  setTxNumber(e.target.value);
                  setVerifyResult(null);
                  setScreenshot(null);
                  setScreenshotPreview(null);
                }}
              />
            </div>

            {/* Auto verify button */}
            {txNumber.trim().length >= 8 && amount && parseFloat(amount) > 0 && (
              <div style={{ marginBottom: 12 }}>
                {!verifyResult ? (
                  <button
                    onClick={async () => {
                      setVerifying(true);
                      try {
                        const result = await verifyTelebirrReceipt(txNumber.trim(), parseFloat(amount), cafe);
                        setVerifyResult(result);
                      } catch (err) {
                        setVerifyResult({ success: false, message: '❌ Verification failed. Try again or upload a screenshot.' });
                      } finally {
                        setVerifying(false);
                      }
                    }}
                    disabled={verifying}
                    style={{
                      width: '100%', padding: 12, borderRadius: 10,
                      border: '1.5px solid #f97316',
                      background: verifying ? 'var(--bg)' : '#fff8f3',
                      color: '#c2410c', fontWeight: 700, fontSize: 14,
                      cursor: verifying ? 'default' : 'pointer',
                    }}
                  >
                    {verifying ? '⏳ Verifying...' : '🔍 Auto Verify Receipt'}
                  </button>
                ) : (
                  <div style={{
                    padding: '12px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: verifyResult.success ? '#f0fdf4' : '#fff0f0',
                    border: `1.5px solid ${verifyResult.success ? '#22c55e' : '#e63946'}`,
                    color: verifyResult.success ? '#15803d' : '#b91c1c',
                  }}>
                    {verifyResult.message}
                    {!verifyResult.success && (
                      <div onClick={() => setVerifyResult(null)}
                        style={{ marginTop: 8, fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}>
                        Try again
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Option 2 — screenshot */}
            {!verifyResult?.success && (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text2)', margin: '12px 0 8px' }}>
                  Option 2 — Upload Screenshot
                </div>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: '2px dashed #f97316', borderRadius: 12, padding: 16,
                  cursor: 'pointer', background: '#fff8f3', marginBottom: 12,
                }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScreenshot} />
                  {screenshotPreview ? (
                    <img src={screenshotPreview} alt="receipt screenshot"
                      style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }} />
                  ) : (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>📸</div>
                      <div style={{ fontSize: 13, color: '#c2410c', fontWeight: 600 }}>Tap to upload screenshot</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>JPG, PNG accepted</div>
                    </>
                  )}
                </label>
                {screenshotPreview && (
                  <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
                    ✅ Screenshot selected — cafe owner will verify manually
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Cash — optional reference */}
        {method === 'cash' && (
          <div className="input-group">
            <label className="input-label">Reference Number (optional)</label>
            <input
              className="input" style={{ paddingLeft: 14 }}
              placeholder="e.g. receipt number"
              value={txNumber}
              onChange={e => setTxNumber(e.target.value)}
            />
          </div>
        )}

        <button className="btn btn-red" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('submitting') : t('depositSubmit')}
        </button>

        <div className="divider" style={{ margin: '24px 0 16px' }} />

        <div className="section-header">
          <div className="section-title" style={{ fontSize: 16 }}>{t('recentDeposits')}</div>
        </div>
      </div>

      {deposits.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">💳</div>
          <div className="empty-title">{t('noDeposits')}</div>
        </div>
      ) : (
        <div className="card" style={{ borderRadius: 0, boxShadow: 'none' }}>
          {deposits.map(d => (
            <div key={d.id} className="deposit-row">
              <div className={`deposit-icon ${d.status === 'pending' ? 'pending' : ''}`}>
                {DEPOSIT_ICON[d.status] || '⏳'}
              </div>
              <div>
                <div className="deposit-amount">+{parseFloat(d.amount).toFixed(2)} {t('etb')}</div>
                <div className="deposit-sub">{d.payment_method.replace('_', ' ').toUpperCase()} · {d.transaction_number}</div>
              </div>
              <div className="deposit-right">
                <div className="deposit-date">{new Date(d.created_at).toLocaleDateString()}</div>
                <StatusBadge status={d.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 90 }} />
      <BottomNav variant="customer-cafe" cafeId={cafeId} active="deposits" />
    </div>
  );
}
