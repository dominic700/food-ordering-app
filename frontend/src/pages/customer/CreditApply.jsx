import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applyForCredit, getCreditEligibility } from '../../api/deposits.js';
import useCafeContext from '../../hooks/useCafeContext.js';
import BottomNav from '../../components/BottomNav.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

// Credit applications are gated: a customer must be registered
// (approved) at the cafe AND have at least 1000 ETB in lifetime
// verified deposits before they're allowed to apply. This page
// checks eligibility first and shows progress toward the threshold
// if they haven't reached it yet, instead of letting them submit
// a doomed application.
export default function CreditApply() {
  const { cafeId } = useParams();
  const navigate = useNavigate();
  const { cafeAccount, loading: ctxLoading } = useCafeContext();

  const [eligibility, setEligibility] = useState(null);
  const [loadingElig, setLoadingElig] = useState(true);
  const [requestedLimit, setRequestedLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const currentLimit = parseFloat(cafeAccount?.credit_limit || 0);
  const isApproved   = cafeAccount?.status === 'approved';

  useEffect(() => {
    if (ctxLoading) return;
    if (!isApproved) { setLoadingElig(false); return; }
    getCreditEligibility(cafeId)
      .then(setEligibility)
      .catch(err => console.error(err))
      .finally(() => setLoadingElig(false));
  }, [ctxLoading, isApproved, cafeId]);

  async function handleSubmit() {
    if (!requestedLimit || parseFloat(requestedLimit) <= 0) return telegram.alert('Enter a valid amount.');
    setSubmitting(true);
    try {
      await applyForCredit(cafeId, parseFloat(requestedLimit));
      telegram.haptic('success');
      setDone(true);
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (ctxLoading || loadingElig) return <Spinner fullPage label="Loading..." />;

  if (done) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✨</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Application Submitted!</div>
        <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 32, padding: '0 32px' }}>
          The cafe will review your credit application and set your limit.
        </div>
        <button className="btn btn-red" style={{ maxWidth: 240 }} onClick={() => navigate(`/cafe/${cafeId}/profile`)}>
          Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate(`/cafe/${cafeId}/profile`)}>‹</button>
        <div className="header-title">Apply for Credit</div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ padding: '20px 16px 0' }}>

        {currentLimit > 0 && (
          <div className="card" style={{ marginBottom: 16, background: '#e8f5e9', borderColor: '#22c55e30' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Current credit limit</div>
            <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 20 }}>{currentLimit.toFixed(2)} ETB</div>
          </div>
        )}

        {/* Not registered at all */}
        {!isApproved && (
          <div className="card" style={{ marginBottom: 16, padding: 16, background: '#fff3e0', borderColor: '#f9731630' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#c2410c' }}>🔒 Registration Required</div>
            <div style={{ fontSize: 13, color: '#c2410c', lineHeight: 1.6, marginBottom: 12 }}>
              You need an approved account at this cafe before applying for credit.
            </div>
            <button className="btn btn-red" onClick={() => navigate(`/cafe/${cafeId}/menu?register=1`)}>
              Register at this Cafe
            </button>
          </div>
        )}

        {/* Registered but hasn't hit the deposit threshold yet */}
        {isApproved && eligibility && !eligibility.eligible && (
          <div className="card" style={{ marginBottom: 16, padding: 16, background: '#fff3e0', borderColor: '#f9731630' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#c2410c' }}>🔒 Deposit Required First</div>
            <div style={{ fontSize: 13, color: '#c2410c', lineHeight: 1.6, marginBottom: 12 }}>
              Deposit at least <strong>{eligibility.minimum_required.toFixed(0)} ETB</strong> before you can apply for credit.
              You've deposited <strong>{eligibility.total_deposited.toFixed(2)} ETB</strong> so far.
            </div>
            <div style={{ height: 8, background: '#fff', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{
                height: '100%', background: '#f97316',
                width: `${Math.min(100, (eligibility.total_deposited / eligibility.minimum_required) * 100)}%`
              }} />
            </div>
            <button className="btn btn-red" onClick={() => navigate(`/cafe/${cafeId}/deposit`)}>
              + Deposit Now
            </button>
          </div>
        )}

        {/* Eligible — show the actual application form */}
        {isApproved && eligibility?.eligible && (
          <>
            <div className="card" style={{ marginBottom: 20, padding: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                Credit lets you order even when your wallet balance is low. The cafe will review your request and set your limit. Orders use wallet balance first, then credit.
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Requested Credit Limit (ETB)</label>
              <input
                className="input"
                style={{ paddingLeft: 14, fontWeight: 700, fontSize: 20 }}
                type="number" min="1" placeholder="0.00"
                value={requestedLimit}
                onChange={e => setRequestedLimit(e.target.value)}
              />
            </div>
            <button className="btn btn-red" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </>
        )}
      </div>

      <BottomNav variant="customer-cafe" cafeId={cafeId} active="profile" />
    </div>
  );
}
