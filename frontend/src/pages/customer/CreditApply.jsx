import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applyForCredit } from '../../api/deposits.js';
import useCafeContext from '../../hooks/useCafeContext.js';
import BottomNav from '../../components/BottomNav.jsx';
import Header from '../../components/Header.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

export default function CreditApply() {
  const { cafeId } = useParams();
  const navigate = useNavigate();
  const { cafeAccount, loading: ctxLoading } = useCafeContext();

  const [requestedLimit, setRequestedLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const currentLimit = parseFloat(cafeAccount?.credit_limit || 0);

  async function handleSubmit() {
    if (!requestedLimit || parseFloat(requestedLimit) <= 0) {
      return telegram.alert('Enter a valid amount.');
    }
    setSubmitting(true);
    try {
      await applyForCredit(cafeId, parseFloat(requestedLimit));
      setDone(true);
      telegram.haptic('success');
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (ctxLoading) return <Spinner fullPage label="Loading..." />;

  if (done) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✨</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Application Submitted!</div>
        <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
          The cafe will review your request and set your credit limit.
        </div>
        <button className="btn btn-red" style={{ maxWidth: 240 }} onClick={() => navigate(`/cafe/${cafeId}/profile`)}>
          Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <Header title="Apply for Credit" onBack={() => navigate(`/cafe/${cafeId}/profile`)} />

      <div style={{ padding: 16 }}>
        {currentLimit > 0 && (
          <div className="card" style={{ marginBottom: 16, background: 'var(--green-light)' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Current credit limit</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{currentLimit.toFixed(2)} ETB</div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            Credit lets you order even when your balance is low. The cafe reviews your request
            and sets a credit limit. Orders use your balance first, then your credit.
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Requested Credit Limit (ETB)</label>
          <input className="input" style={{ paddingLeft: 14, fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
            type="number" min="1" placeholder="0.00" value={requestedLimit} onChange={e => setRequestedLimit(e.target.value)} />
        </div>

        <button className="btn btn-red" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Apply for Credit'}
        </button>
      </div>

      <BottomNav variant="customer-cafe" cafeId={cafeId} active="profile" />
    </div>
  );
}
