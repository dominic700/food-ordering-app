import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAccountHistory } from '../../api/customer.js';
import { submitDeposit } from '../../api/deposits.js';
import useCafeContext from '../../hooks/useCafeContext.js';
import BottomNav from '../../components/BottomNav.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

const PAYMENT_METHODS = [
  { value: 'telebirr',      label: '📱 Telebirr' },
  { value: 'cbe_birr',      label: '🏦 CBE Birr' },
  { value: 'bank_transfer', label: '🏛️ Bank Transfer' },
  { value: 'cash',          label: '💵 Cash' },
];

const DEPOSIT_ICON = { verified: '⬇️', failed: '✕', pending: '⏳' };

export default function Deposit() {
  const { cafeId } = useParams();
  const navigate = useNavigate();
  const { cafeAccount, loading: ctxLoading, refreshAccount } = useCafeContext();

  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('telebirr');
  const [amount, setAmount] = useState('');
  const [txNumber, setTxNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit() {
    if (!amount || parseFloat(amount) <= 0) return telegram.alert('Enter a valid amount.');
    if (!txNumber.trim()) return telegram.alert('Enter the transaction number.');

    setSubmitting(true);
    try {
      await submitDeposit(cafeId, parseFloat(amount), method, txNumber.trim());
      setAmount('');
      setTxNumber('');
      telegram.haptic('success');
      telegram.alert('Deposit submitted! It will be verified automatically and added to your balance.');
      loadDeposits();
      refreshAccount();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (ctxLoading || loading) return <Spinner fullPage label="Loading..." />;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate(`/cafe/${cafeId}/profile`)}>‹</button>
        <div className="header-title">Deposit</div>
        <button className="header-icon">❓</button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>Current Balance</div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {parseFloat(cafeAccount?.balance || 0).toFixed(2)} <span style={{ fontSize: 14, color: 'var(--text2)' }}>ETB</span>
              </div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              👛
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Payment Method</label>
          <select className="input" style={{ paddingLeft: 14 }} value={method} onChange={e => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Amount (ETB)</label>
          <input
            className="input"
            style={{ paddingLeft: 14, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18 }}
            type="number" min="1" placeholder="0.00"
            value={amount} onChange={e => setAmount(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Transaction Number</label>
          <input
            className="input" style={{ paddingLeft: 14 }}
            placeholder="e.g. 1234567890"
            value={txNumber} onChange={e => setTxNumber(e.target.value)}
          />
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
            Enter the transaction ID / reference number from your payment
          </div>
        </div>

        <button className="btn btn-red" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Deposit'}
        </button>

        <div className="divider" style={{ margin: '24px 0 16px' }} />

        <div className="section-header">
          <div className="section-title" style={{ fontSize: 16 }}>Recent Deposits</div>
        </div>
      </div>

      {deposits.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">💳</div>
          <div className="empty-title">No deposits yet</div>
        </div>
      ) : (
        <div className="card" style={{ borderRadius: 0, boxShadow: 'none' }}>
          {deposits.map(d => (
            <div key={d.id} className="deposit-row">
              <div className={`deposit-icon ${d.status === 'pending' ? 'pending' : ''}`}>
                {DEPOSIT_ICON[d.status] || '⏳'}
              </div>
              <div>
                <div className="deposit-amount">+{parseFloat(d.amount).toFixed(2)} ETB</div>
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
