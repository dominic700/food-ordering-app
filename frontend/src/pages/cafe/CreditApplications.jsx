import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers, getCustomerDetail, setCustomerCreditLimit } from '../../api/cafe.js';
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

// Customers + Credit page, reached from the bottom nav's "Credit" tab.
// No application/approval flow here anymore — the cafe owner sets a
// customer's credit limit directly from their profile, at any time,
// with no deposit threshold. Balance is a single SIGNED number:
// positive = customer has funds, negative = customer is using credit
// (they owe that amount, up to credit_limit).
export default function CreditApplications() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);

  const [selected, setSelected]           = useState(null); // customer detail sheet
  const [detail, setDetail]               = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creditLimit, setCreditLimit]     = useState('');
  const [savingLimit, setSavingLimit]     = useState(false);

  const load = useCallback(async () => {
    try {
      const custs = await getCustomers();
      setCustomers(custs);
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

  if (loading) return <Spinner fullPage label="Loading..." />;

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/cafe-home')}>‹</button>
        <div className="header-title">Customers</div>
        <NotificationBell to="/cafe-home/notifications" />
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {customers.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👥</div>
            <div className="empty-title">No registered customers yet</div>
          </div>
        ) : (
          customers.map(customer => {
            const balance = parseFloat(customer.balance || 0);
            const isNegative = balance < 0;
            return (
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
                      <span style={{ color: isNegative ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
                        {isNegative ? '−' : ''}{Math.abs(balance).toFixed(0)} ETB
                        {isNegative ? ' (owes)' : ' balance'}
                      </span>
                      <span style={{ color: 'var(--blue)' }}>Limit: {parseFloat(customer.credit_limit || 0).toFixed(0)} ETB</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 18 }}>›</div>
                </div>
              </div>
            );
          })
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

            {/* Single signed balance — positive or negative */}
            {(() => {
              const balance = parseFloat(selected.balance || 0);
              const isNegative = balance < 0;
              return (
                <div style={{
                  background: isNegative ? '#ffeaea' : '#e8f5e9',
                  borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 20,
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                    {isNegative ? 'Currently Owes' : 'Current Balance'}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: isNegative ? 'var(--red)' : '#22c55e' }}>
                    {isNegative ? '−' : ''}{Math.abs(balance).toFixed(2)} ETB
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                    Credit limit: {parseFloat(selected.credit_limit || 0).toFixed(2)} ETB
                  </div>
                </div>
              );
            })()}

            {/* Set credit limit — directly here, in the customer's profile detail.
                No application step: cafe owner can set/change this any time. */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>✨ Set Credit Limit</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                How far negative this customer's balance can go (e.g. 500 ETB means they can owe up to 500 ETB before being blocked).
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
