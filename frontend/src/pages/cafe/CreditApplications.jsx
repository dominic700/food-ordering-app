import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers, getCustomerDetail, setCustomerCreditLimit } from '../../api/cafe.js';
import { getCreditApplications, reviewCreditApplication } from '../../api/deposits.js';
import BottomNav from '../../components/BottomNav.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
const COLORS = ['#e63946', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6'];
function avatarColor(name) { return COLORS[(name?.charCodeAt(0) || 0) % COLORS.length]; }

// Dedicated bottom-nav page for credit application approval, with
// an "upper sliding nav" splitting Customers (with balance) vs
// pending Credit Applications. Tapping a customer opens a detail
// sheet with full profile + credit limit setter + deposit/order
// history with payer name — all per the request.
export default function CreditApplications() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('customers'); // 'customers' | 'applications'

  const [customers, setCustomers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected]       = useState(null); // customer detail sheet
  const [detail, setDetail]           = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creditLimit, setCreditLimit] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);

  const load = useCallback(async () => {
    try {
      const [custs, apps] = await Promise.all([getCustomers(), getCreditApplications()]);
      setCustomers(custs);
      setApplications(apps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openCustomer(customer) {
    setSelected(customer);
    setCreditLimit(customer.credit_limit?.toString() || '0');
    setLoadingDetail(true);
    try {
      const d = await getCustomerDetail(customer.id);
      setDetail(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeSheet() {
    setSelected(null);
    setDetail(null);
  }

  async function handleSetCreditLimit() {
    const limit = parseFloat(creditLimit);
    if (isNaN(limit) || limit < 0) return telegram.alert('Enter a valid credit limit.');
    setSavingLimit(true);
    try {
      await setCustomerCreditLimit(selected.id, limit);
      telegram.haptic('success');
      await load();
      setSelected(prev => ({ ...prev, credit_limit: limit }));
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSavingLimit(false);
    }
  }

  async function handleReviewApplication(appId, status) {
    if (status === 'approved') {
      const limit = prompt('Enter the approved credit limit (ETB):');
      if (!limit || parseFloat(limit) <= 0) return;
      try {
        await reviewCreditApplication(appId, 'approved', parseFloat(limit));
        telegram.haptic('success');
        await load();
      } catch (err) {
        telegram.alert(err.message);
      }
    } else {
      try {
        await reviewCreditApplication(appId, 'rejected', null);
        telegram.haptic();
        await load();
      } catch (err) {
        telegram.alert(err.message);
      }
    }
  }

  const pendingApps = applications.filter(a => a.status === 'pending');

  if (loading) return <Spinner fullPage label="Loading..." />;

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/cafe-home')}>‹</button>
        <div className="header-title">Credit & Customers</div>
        <NotificationBell to="/cafe-home/notifications" />
      </div>

      {/* Upper sliding tab nav */}
      <div className="upper-tabs">
        <button className={`upper-tab ${tab === 'customers' ? 'active' : ''}`} onClick={() => setTab('customers')}>
          👥 Customers
          <span className="upper-tab-badge">{customers.length}</span>
        </button>
        <button className={`upper-tab ${tab === 'applications' ? 'active' : ''}`} onClick={() => setTab('applications')}>
          ✨ Credit Applications
          {pendingApps.length > 0 && <span className="upper-tab-badge">{pendingApps.length}</span>}
        </button>
      </div>

      <div style={{ padding: '14px 16px 0' }}>

        {/* ── Customers tab: list with balance ──────────────── */}
        {tab === 'customers' && (
          customers.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">👥</div>
              <div className="empty-title">No registered customers yet</div>
            </div>
          ) : (
            customers.map(customer => (
              <div
                key={customer.id}
                className="card"
                style={{ marginBottom: 10, padding: 14, cursor: 'pointer' }}
                onClick={() => openCustomer(customer)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar avatar-md" style={{ background: avatarColor(customer.name) }}>
                    {getInitials(customer.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{customer.name || 'Unknown'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {customer.phone}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12 }}>
                      <span style={{ color: 'var(--green)' }}>Balance: {parseFloat(customer.balance || 0).toFixed(0)} ETB</span>
                      <span style={{ color: 'var(--blue)' }}>Credit limit: {parseFloat(customer.credit_limit || 0).toFixed(0)} ETB</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 18 }}>›</div>
                </div>
              </div>
            ))
          )
        )}

        {/* ── Applications tab ──────────────────────────────── */}
        {tab === 'applications' && (
          applications.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✨</div>
              <div className="empty-title">No credit applications</div>
            </div>
          ) : (
            applications.map(app => (
              <div key={app.id} className="card" style={{ marginBottom: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{app.customer_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>📞 {app.customer_phone}</div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
                  Requested: <strong>{parseFloat(app.requested_limit).toFixed(2)} ETB</strong>
                  {app.approved_limit && <span> · Approved: <strong>{parseFloat(app.approved_limit).toFixed(2)} ETB</strong></span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: app.status === 'pending' ? 10 : 0 }}>
                  Applied {new Date(app.applied_at).toLocaleDateString()}
                </div>
                {app.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => handleReviewApplication(app.id, 'rejected')}>
                      ✕ Reject
                    </button>
                    <button className="btn btn-red btn-sm" style={{ flex: 1 }} onClick={() => handleReviewApplication(app.id, 'approved')}>
                      ✓ Approve
                    </button>
                  </div>
                )}
              </div>
            ))
          )
        )}
      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="cafe-owner" active="credit" />

      {/* ── Customer detail sheet ("upper bile") ──────────────── */}
      {selected && (
        <div className="overlay" onClick={closeSheet}>
          <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh' }}>
            <div className="sheet-handle" />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div className="avatar avatar-lg" style={{ background: avatarColor(selected.name) }}>
                {getInitials(selected.name)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {selected.phone}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ background: '#e8f5e9', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Balance</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#22c55e' }}>{parseFloat(selected.balance || 0).toFixed(0)} ETB</div>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Credit Used</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{parseFloat(selected.credit_used || 0).toFixed(0)} ETB</div>
              </div>
            </div>

            {/* Set credit limit — directly here, in the customer's profile detail */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>✨ Set Credit Limit</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                Current limit: <strong>{parseFloat(selected.credit_limit || 0).toFixed(2)} ETB</strong>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  style={{ paddingLeft: 14, flex: 1, fontWeight: 700 }}
                  type="number" min="0" placeholder="0.00"
                  value={creditLimit}
                  onChange={e => setCreditLimit(e.target.value)}
                />
                <button className="btn btn-red" style={{ width: 'auto', padding: '13px 20px', flexShrink: 0 }} onClick={handleSetCreditLimit} disabled={savingLimit}>
                  {savingLimit ? '...' : 'Set'}
                </button>
              </div>
            </div>

            {/* Deposit history with payer name */}
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Deposits</div>
            {loadingDetail ? (
              <div className="spinner" />
            ) : !detail?.deposits?.length ? (
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '12px 0 20px' }}>No deposits yet</div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                {detail.deposits.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>+{parseFloat(d.amount).toFixed(2)} ETB</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>by {d.payer_name} · {d.payment_method.replace('_', ' ')}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(d.created_at).toLocaleDateString()}</div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            )}

            {/* Order / payment history with payer name */}
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Order History (Last 30 Days)</div>
            {loadingDetail ? null : !detail?.orders?.length ? (
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '12px 0' }}>No recent orders</div>
            ) : (
              detail.orders.map(order => (
                <div key={order.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>#{order.id?.slice(0, 6)} · {order.payer_name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--red)' }}>{parseFloat(order.total).toFixed(0)} ETB</span>
                  </div>
                  {order.items?.map((item, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text2)' }}>{item.quantity}× {item.name}</div>
                  ))}
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    {order.payment_method} · {new Date(order.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
