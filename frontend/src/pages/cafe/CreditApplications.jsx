import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCustomers, getCustomerDetail, setCustomerCreditLimit,
  getRegistrations, approveRegistration, rejectRegistration
} from '../../api/cafe.js';
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

export default function CreditApplications() {
  const navigate = useNavigate();

  // upper tab: 'registrations' | 'customers'
  const [tab, setTab] = useState('registrations');

  const [registrations, setRegistrations] = useState([]);
  const [customers, setCustomers]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [actionId, setActionId]           = useState(null);

  // customer detail sheet
  const [selected, setSelected]           = useState(null);
  const [detail, setDetail]               = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creditLimit, setCreditLimit]     = useState('');
  const [savingLimit, setSavingLimit]     = useState(false);

  const load = useCallback(async () => {
    try {
      const [regs, custs] = await Promise.all([
        getRegistrations(),
        getCustomers(),
      ]);
      setRegistrations(regs);
      setCustomers(custs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Poll every 20s so new registrations appear automatically
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  // ── Registration actions ──────────────────────────────────────
  async function handleApprove(pcaId) {
    setActionId(pcaId);
    try {
      await approveRegistration(pcaId);
      telegram.haptic('success');
      await load();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(pcaId) {
    setActionId(pcaId);
    try {
      await rejectRegistration(pcaId);
      telegram.haptic();
      await load();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setActionId(null);
    }
  }

  // ── Customer detail sheet ─────────────────────────────────────
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
        <div className="header-title">Customers & Registrations</div>
        <NotificationBell to="/cafe-home/notifications" />
      </div>

      {/* Upper sliding tab nav */}
      <div className="upper-tabs">
        <button
          className={`upper-tab ${tab === 'registrations' ? 'active' : ''}`}
          onClick={() => setTab('registrations')}
        >
          📝 Registrations
          {registrations.length > 0 && (
            <span className="upper-tab-badge">{registrations.length}</span>
          )}
        </button>
        <button
          className={`upper-tab ${tab === 'customers' ? 'active' : ''}`}
          onClick={() => setTab('customers')}
        >
          👥 Customers
          <span className="upper-tab-badge">{customers.length}</span>
        </button>
      </div>

      <div style={{ padding: '14px 16px 0' }}>

        {/* ── REGISTRATIONS TAB ─────────────────────────────── */}
        {tab === 'registrations' && (
          registrations.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📝</div>
              <div className="empty-title">No pending registrations</div>
              <div className="empty-desc">New registration requests will appear here automatically</div>
            </div>
          ) : (
            registrations.map(reg => (
              <div key={reg.id} className="card" style={{ marginBottom: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div className="avatar avatar-md" style={{ background: avatarColor(reg.name), flexShrink: 0 }}>
                    {getInitials(reg.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{reg.name || 'Unknown'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>📞 {reg.phone}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      Requested {new Date(reg.registered_at).toLocaleDateString()} at{' '}
                      {new Date(reg.registered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span style={{ background: '#fff3e0', color: '#f97316', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '3px 10px' }}>
                    Pending
                  </span>
                </div>

                {/* Approve / Reject buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1, fontSize: 14, padding: '11px' }}
                    disabled={actionId === reg.id}
                    onClick={() => handleReject(reg.id)}
                  >
                    ✕ Reject
                  </button>
                  <button
                    className="btn btn-red"
                    style={{ flex: 1, fontSize: 14, padding: '11px' }}
                    disabled={actionId === reg.id}
                    onClick={() => handleApprove(reg.id)}
                  >
                    {actionId === reg.id ? 'Processing...' : '✓ Approve'}
                  </button>
                </div>
              </div>
            ))
          )
        )}

        {/* ── CUSTOMERS TAB ─────────────────────────────────── */}
        {tab === 'customers' && (
          customers.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">👥</div>
              <div className="empty-title">No approved customers yet</div>
              <div className="empty-desc">Approved customers will appear here</div>
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
                        <span style={{ color: isNegative ? 'var(--red)' : '#22c55e', fontWeight: 700 }}>
                          {isNegative ? '−' : ''}{Math.abs(balance).toFixed(0)} ETB
                          {isNegative ? ' (owes)' : ' balance'}
                        </span>
                        <span style={{ color: '#3b82f6' }}>
                          Limit: {parseFloat(customer.credit_limit || 0).toFixed(0)} ETB
                        </span>
                      </div>
                    </div>
                    <div style={{ color: 'var(--text3)', fontSize: 18 }}>›</div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="cafe-owner" active="credit" />

      {/* ── Customer detail sheet ──────────────────────────────── */}
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

            {/* Signed balance card */}
            {(() => {
              const balance = parseFloat(selected.balance || 0);
              const isNeg = balance < 0;
              return (
                <div style={{
                  background: isNeg ? '#ffeaea' : '#e8f5e9',
                  borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 20,
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                    {isNeg ? 'Currently Owes' : 'Current Balance'}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: isNeg ? 'var(--red)' : '#22c55e' }}>
                    {isNeg ? '−' : ''}{Math.abs(balance).toFixed(2)} ETB
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                    Credit limit: {parseFloat(selected.credit_limit || 0).toFixed(2)} ETB
                  </div>
                </div>
              );
            })()}

            {/* Set credit limit */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>✨ Set Credit Limit</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                How far negative this customer's balance can go (e.g. 500 ETB means they can owe up to 500 ETB).
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  style={{ paddingLeft: 14, flex: 1, fontWeight: 700 }}
                  type="number" min="0" placeholder="0.00"
                  value={creditLimit}
                  onChange={e => setCreditLimit(e.target.value)}
                />
                <button
                  className="btn btn-red"
                  style={{ width: 'auto', padding: '13px 20px', flexShrink: 0 }}
                  onClick={handleSetCreditLimit}
                  disabled={savingLimit}
                >
                  {savingLimit ? '...' : 'Set'}
                </button>
              </div>
            </div>

            {/* Deposit history */}
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Deposits</div>
            {loadingDetail ? (
              <div className="spinner" />
            ) : !detail?.deposits?.length ? (
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '12px 0 20px' }}>
                No deposits yet
              </div>
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

            {/* Order history */}
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Order History (Last 30 Days)</div>
            {loadingDetail ? null : !detail?.orders?.length ? (
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '12px 0' }}>
                No recent orders
              </div>
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
