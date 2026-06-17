import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applyForCredit } from '../../api/deposits.js';
import useCafeContext from '../../hooks/useCafeContext.js';
import BottomNav from '../../components/BottomNav.jsx';
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

  if (ctxLoading) return <Spinner fullPage label="Loading..." />;

  if (done) {
    return (
      <div className="page" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'80vh',textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>✨</div>
        <div style={{fontSize:20,fontWeight:700,marginBottom:8}}>Application Submitted!</div>
        <div style={{color:'var(--text2)',fontSize:14,marginBottom:32,padding:'0 32px'}}>The cafe will review your credit application and set your limit.</div>
        <button className="btn btn-red" style={{maxWidth:240}} onClick={() => navigate(`/cafe/${cafeId}/profile`)}>Back to Profile</button>
      </div>
    );
  }

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

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate(`/cafe/${cafeId}/profile`)}>‹</button>
        <div className="header-title">Apply for Credit</div>
        <div style={{width:36}} />
      </div>
      <div style={{padding:'20px 16px 0'}}>
        {currentLimit > 0 && (
          <div className="card" style={{marginBottom:16,background:'#e8f5e9',borderColor:'#22c55e30'}}>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Current credit limit</div>
            <div style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'#22c55e',fontSize:20}}>{currentLimit.toFixed(2)} ETB</div>
          </div>
        )}
        <div className="card" style={{marginBottom:20,padding:16}}>
          <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>
            Credit lets you order even when your wallet balance is low. The cafe will review your request and set your limit. Orders use wallet balance first, then credit.
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Requested Credit Limit (ETB)</label>
          <input className="input" style={{paddingLeft:14,fontFamily:'var(--font-mono)',fontWeight:700,fontSize:20}} type="number" min="1" placeholder="0.00" value={requestedLimit} onChange={e => setRequestedLimit(e.target.value)} />
        </div>
        <button className="btn btn-red" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
      <BottomNav variant="customer-cafe" cafeId={cafeId} active="profile" />
    </div>
  );
}
