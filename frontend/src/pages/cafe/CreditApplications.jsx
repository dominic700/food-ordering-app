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
import LangToggle from '../../components/LangToggle.jsx';
import useLanguage from '../../hooks/useLanguage.js';

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
const COLORS = ['#e63946', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6'];
function avatarColor(name) { return COLORS[(name?.charCodeAt(0) || 0) % COLORS.length]; }

export default function CreditApplications() {
  const navigate = useNavigate();
  const { t }    = useLanguage();

  const [tab, setTab]                     = useState('registrations');
  const [registrations, setRegistrations] = useState([]);
  const [customers, setCustomers]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null); // ← show errors visibly
  const [actionId, setActionId]           = useState(null);

  const [selected, setSelected]           = useState(null);
  const [detail, setDetail]               = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creditLimit, setCreditLimit]     = useState('');
  const [savingLimit, setSavingLimit]     = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Call each separately so we can see which one fails
      let regs = [];
      let custs = [];

      try {
        regs = await getRegistrations();
        console.log('registrations:', regs);
      } catch (err) {
        console.error('getRegistrations failed:', err.message);
        setError(`Registrations error: ${err.message}`);
      }

      try {
        custs = await getCustomers();
        console.log('customers:', custs);
      } catch (err) {
        console.error('getCustomers failed:', err.message);
        setError(prev => `${prev || ''} | Customers error: ${err.message}`);
      }

      setRegistrations(Array.isArray(regs) ? regs : []);
      setCustomers(Array.isArray(custs) ? custs : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleApprove(pcaId) {
    setActionId(pcaId);
    try {
      await approveRegistration(pcaId);
      telegram.haptic('success');
      await load();
    } catch (err) {
      telegram.alert(`Approve failed: ${err.message}`);
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
      telegram.alert(`Reject failed: ${err.message}`);
    } finally {
      setActionId(null);
    }
  }

  async function openCustomer(customer) {
    setSelected(customer);
    setCreditLimit(customer.credit_limit?.toString() || '0');
    setLoadingDetail(true);
    try {
      const d = await getCustomerDetail(customer.id);
      setDetail(d);
    } catch (err) {
      console.error('getCustomerDetail failed:', err);
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeSheet() { setSelected(null); setDetail(null); }

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

      <div className="header">
        <button className="header-icon" onClick={() => navigate('/cafe-home')}>‹</button>
        <div className="header-title">{t('customersAndRegs')}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <LangToggle />
          <NotificationBell to="/cafe-home/notifications" />
        </div>
      </div>

      {/* Upper tabs */}
      <div className="upper-tabs">
        <button
          className={`upper-tab ${tab === 'registrations' ? 'active' : ''}`}
          onClick={() => setTab('registrations')}
        >
          {t('registrations')}
          {registrations.length > 0 && (
            <span className="upper-tab-badge">{registrations.length}</span>
          )}
        </button>
        <button
          className={`upper-tab ${tab === 'customers' ? 'active' : ''}`}
          onClick={() => setTab('customers')}
        >
          {t('customers')}
          {customers.length > 0 && (
            <span className="upper-tab-badge">{customers.length}</span>
          )}
        </button>
      </div>

      {/* Error banner — visible in production so you can see what failed */}
      {error && (
        <div style={{
          margin: '12px 16px', padding: '10px 14px',
          background: '#ffeaea', border: '1px solid var(--red)',
          borderRadius: 10, fontSize: 12, color: 'var(--red)',
          wordBreak: 'break-all',
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ padding: '14px 16px 0' }}>

        {/* ── REGISTRATIONS TAB ─────────────────────────────── */}
        {tab === 'registrations' && (
          registrations.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📝</div>
              <div className="empty-title">{t('noPendingRegs')}</div>
              <div className="empty-desc">{t('noPendingRegsDesc')}</div>
              <button className="btn btn-red" style={{ marginTop: 16, maxWidth: 200 }} onClick={load}>
                {t('refreshNow')}
              </button>
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
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>📞 {reg.phone || 'No phone'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {new Date(reg.registered_at).toLocaleDateString()} {' '}
                      {new Date(reg.registered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span style={{ background: '#fff3e0', color: '#f97316', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '3px 10px' }}>
                    {t('pending')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1, fontSize: 14, padding: '11px' }}
                    disabled={actionId === reg.id}
                    onClick={() => handleReject(reg.id)}
                  >
                    ✕ {t('reject')}
                  </button>
                  <button
                    className="btn btn-red"
                    style={{ flex: 1, fontSize: 14, padding: '11px' }}
                    disabled={actionId === reg.id}
                    onClick={() => handleApprove(reg.id)}
                  >
                    {actionId === reg.id ? t('processing') : `✓ ${t('approve')}`}
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
              <div className="empty-title">{t('noCustomers')}</div>
              <div className="empty-desc">{t('noCustomersDesc')}</div>
            </div>
          ) : (
            customers.map(customer => {
              const balance = parseFloat(customer.balance || 0);
              const isNeg = balance < 0;
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
                        <span style={{ color: isNeg ? 'var(--red)' : '#22c55e', fontWeight: 700 }}>
                          {isNeg ? '−' : ''}{Math.abs(balance).toFixed(0)} {t('etb')}
                          {' '}{isNeg ? t('owes') : t('balance')}
                        </span>
                        <span style={{ color: '#3b82f6' }}>
                          {t('creditLimitLabel')}: {parseFloat(customer.credit_limit || 0).toFixed(0)} {t('etb')}
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

      {/* ── Customer detail sheet ──────────────────────────── */}
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

            {(() => {
              const balance = parseFloat(selected.balance || 0);
              const isNeg = balance < 0;
              return (
                <div style={{ background: isNeg ? '#ffeaea' : '#e8f5e9', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 20 }}>
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

            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{t('setCreditLimit')}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                {t('setCreditDesc')}
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
                  {savingLimit ? '...' : t('set')}
                </button>
              </div>
            </div>

            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('navDeposits')}</div>
            {loadingDetail ? <div className="spinner" /> : !detail?.deposits?.length ? (
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '12px 0 20px' }}>{t('noDeposits')}</div>
            ) : detail.deposits.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>+{parseFloat(d.amount).toFixed(2)} {t('etb')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{d.payment_method?.replace('_', ' ')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(d.created_at).toLocaleDateString()}</div>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}

            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('orderHistoryLast30')}</div>
            {loadingDetail ? null : !detail?.orders?.length ? (
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '12px 0' }}>{t('noRecentOrdersShort')}</div>
            ) : detail.orders.map(order => (
              <div key={order.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>#{order.id?.slice(0, 6)}</span>
                  <span style={{ fontWeight: 700, color: 'var(--red)' }}>{parseFloat(order.total).toFixed(0)} {t('etb')}</span>
                </div>
                {order.items?.map((item, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text2)' }}>{item.quantity}× {item.name}</div>
                ))}
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  {order.payment_method} · {new Date(order.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
