import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { getAccountHistory } from '../../api/customer.js';
import useCafeContext from '../../hooks/useCafeContext.js';
import BottomNav from '../../components/BottomNav.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

const DEPOSIT_ICON = { verified: '⬇️', failed: '✕', pending: '⏳' };

export default function Profile() {
  const { cafeId } = useParams();
  const navigate = useNavigate();
  const account = useStore(s => s.account);
  const { cafe, cafeAccount, loading: ctxLoading } = useCafeContext();

  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const initials = (account?.name || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const creditLimit = parseFloat(cafeAccount?.credit_limit || 0);
  const creditUsed  = parseFloat(cafeAccount?.credit_used || 0);
  const creditAvail = creditLimit - creditUsed;

  if (ctxLoading || loading) return <Spinner fullPage label="Loading profile..." />;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate(`/cafe/${cafeId}/menu`)}>‹</button>
        <div className="header-title">Profile</div>
        <div style={{ width: 36 }} />
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
        <div className="balance-card" style={{ marginBottom: 16 }}>
          <div className="balance-emoji">👛</div>
          <div className="balance-label">Current Balance</div>
          <div className="balance-amount">
            {parseFloat(cafeAccount?.balance || 0).toFixed(2)} <span>ETB</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 14, color: 'rgba(255,255,255,0.85)' }}>
            <span>Credit limit: {creditLimit.toFixed(2)} ETB</span>
            <span>Available: {creditAvail.toFixed(2)} ETB</span>
          </div>
          <div className="balance-actions">
            <button className="btn btn-white" onClick={() => navigate(`/cafe/${cafeId}/deposit`)}>+ Deposit</button>
            <button className="btn btn-white" onClick={() => navigate(`/cafe/${cafeId}/credit`)}>✨ Apply Credit</button>
          </div>
        </div>

        {/* Deposit history */}
        <div className="section-header">
          <div className="section-title" style={{ fontSize: 16 }}>Deposit History</div>
          <div className="section-link" onClick={() => navigate(`/cafe/${cafeId}/deposit`)}>View All ›</div>
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
        <div className="profile-menu-item" onClick={() => navigate(`/cafe/${cafeId}/orders`)}>
          <div className="profile-menu-icon">🧾</div>
          <div className="profile-menu-label">Order History</div>
          <div className="profile-chevron">›</div>
        </div>
        <div className="profile-menu-item" onClick={() => navigate(`/cafe/${cafeId}/menu`)}>
          <div className="profile-menu-icon">🍽️</div>
          <div className="profile-menu-label">Browse Menu</div>
          <div className="profile-chevron">›</div>
        </div>
        <div className="profile-menu-item" onClick={() => navigate(`/cafe/${cafeId}/credit`)}>
          <div className="profile-menu-icon">✨</div>
          <div className="profile-menu-label">Apply for Credit</div>
          <div className="profile-chevron">›</div>
        </div>
        <div className="profile-menu-item" onClick={() => navigate('/')}>
          <div className="profile-menu-icon">🏪</div>
          <div className="profile-menu-label">Switch Cafe</div>
          <div className="profile-chevron">›</div>
        </div>
      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="customer-cafe" cafeId={cafeId} active="profile" />
    </div>
  );
}
