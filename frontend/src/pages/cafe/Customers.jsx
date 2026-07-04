import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers, getCustomerDetail, setCustomerCreditLimit } from '../../api/cafe.js';
import { getCreditApplications, reviewCreditApplication } from '../../api/deposits.js';
import BottomNav from '../../components/BottomNav.jsx';
import Spinner from '../../components/Spinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import telegram from '../../telegram.js';
import useLanguage from '../../hooks/useLanguage.js';

export default function Customers() {
  const navigate = useNavigate();
  const { t }     = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [creditApps, setCreditApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('customers'); // 'customers' | 'credit'
  const [selected, setSelected] = useState(null); // customer detail sheet
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creditLimit, setCreditLimit] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [custs, apps] = await Promise.all([getCustomers(), getCreditApplications()]);
      setCustomers(custs);
      setCreditApps(apps);
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

  async function handleSetCreditLimit() {
    const limit = parseFloat(creditLimit);
    if (isNaN(limit) || limit < 0) return telegram.alert(t('validCreditLimitAlert'));
    setSavingLimit(true);
    try {
      await setCustomerCreditLimit(selected.id, limit);
      telegram.haptic('success');
      telegram.alert(`${t('creditLimitSetPrefix')} ${limit.toFixed(2)} ${t('etb')}`);
      await load();
      setSelected(prev => ({ ...prev, credit_limit: limit }));
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSavingLimit(false);
    }
  }

  async function handleReviewCredit(appId, status, approvedLimit) {
    try {
      await reviewCreditApplication(appId, status, approvedLimit);
      telegram.haptic('success');
      await load();
    } catch (err) {
      telegram.alert(err.message);
    }
  }

  const pendingApps = creditApps.filter(a => a.status === 'pending');
  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  if (loading) return <Spinner fullPage label={t('loadingCustomers')} />;

  function getInitials(name) {
    return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  const COLORS = ['#e63946', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6'];
  function avatarColor(name) { return COLORS[(name?.charCodeAt(0) || 0) % COLORS.length]; }

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/cafe-home')}>‹</button>
        <div className="header-title">{t('customersTitle')}</div>
        <div style={{ width: 36 }} />
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'customers' ? 'active' : ''}`} onClick={() => setTab('customers')}>
          {t('customers')} ({customers.length})
        </button>
        <button className={`tab ${tab === 'credit' ? 'active' : ''}`} onClick={() => setTab('credit')}>
          {t('creditAppsTab')}
          {pendingApps.length > 0 && (
            <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', marginLeft: 4 }}>
              {pendingApps.length}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      {tab === 'customers' && (
        <div style={{ padding: '12px 16px 0' }}>
          <div className="input-wrap">
            <span className="input-icon">🔍</span>
            <input className="input" placeholder={t('searchByNamePhone')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      )}

      <div style={{ padding: '12px 16px 0' }}>

        {/* Customers list */}
        {tab === 'customers' && (
          filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">👥</div>
              <div className="empty-title">{t('noCustomers')}</div>
            </div>
          ) : (
            filtered.map(customer => (
              <div key={customer.id} className="card" style={{ marginBottom: 10, padding: 14, cursor: 'pointer' }} onClick={() => openCustomer(customer)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar avatar-md" style={{ background: avatarColor(customer.name) }}>
                    {getInitials(customer.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{customer.name || t('unknownName')}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {customer.phone}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12 }}>
                      <span style={{ color: 'var(--green)' }}>{t('balance')}: {parseFloat(customer.balance || 0).toFixed(0)} {t('etb')}</span>
                      <span style={{ color: 'var(--blue)' }}>{t('creditLimitLabel')}: {parseFloat(customer.credit_limit || 0).toFixed(0)} {t('etb')}</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 18 }}>›</div>
                </div>
              </div>
            ))
          )
        )}

        {/* Credit applications */}
        {tab === 'credit' && (
          creditApps.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✨</div>
              <div className="empty-title">{t('noCreditApps')}</div>
            </div>
          ) : (
            creditApps.map(app => (
              <div key={app.id} className="card" style={{ marginBottom: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{app.customer_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>📞 {app.customer_phone}</div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
                  {t('requestedLabel')}: <strong>{parseFloat(app.requested_limit).toFixed(2)} {t('etb')}</strong>
                  {app.approved_limit && <span> · {t('approved')}: <strong>{parseFloat(app.approved_limit).toFixed(2)} {t('etb')}</strong></span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: app.status === 'pending' ? 10 : 0 }}>
                  {new Date(app.applied_at).toLocaleDateString()}
                </div>
                {app.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => handleReviewCredit(app.id, 'rejected', null)}>
                      {t('rejectBtn')}
                    </button>
                    <button className="btn btn-red btn-sm" style={{ flex: 1 }} onClick={() => {
                      const limit = prompt(`${t('approveCreditPromptPrefix')} ${app.customer_name}${t('approveCreditPromptSuffix')}`);
                      if (limit && parseFloat(limit) > 0) handleReviewCredit(app.id, 'approved', parseFloat(limit));
                    }}>
                      {t('approveOrder')}
                    </button>
                  </div>
                )}
              </div>
            ))
          )
        )}
      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="cafe-owner" active="dashboard" />

      {/* Customer detail sheet */}
      {selected && (
        <div className="overlay" onClick={() => { setSelected(null); setDetail(null); }}>
          <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh' }}>
            <div className="sheet-handle" />

            {/* Customer info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div className="avatar avatar-lg" style={{ background: avatarColor(selected.name) }}>
                {getInitials(selected.name)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {selected.phone}</div>
              </div>
            </div>

            {/* Balance & credit row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ background: '#e8f5e9', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{t('balance')}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#22c55e' }}>{parseFloat(selected.balance || 0).toFixed(0)} {t('etb')}</div>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{t('creditUsedLabel')}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{parseFloat(selected.credit_used || 0).toFixed(0)} {t('etb')}</div>
              </div>
            </div>

            {/* Set credit limit */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{t('setCreditLimit')}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                {t('currentLimitLabel')}: <strong>{parseFloat(selected.credit_limit || 0).toFixed(2)} {t('etb')}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    className="input"
                    style={{ paddingLeft: 14, fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                    type="number" min="0" placeholder="0.00"
                    value={creditLimit}
                    onChange={e => setCreditLimit(e.target.value)}
                  />
                </div>
                <button className="btn btn-red" style={{ width: 'auto', padding: '13px 20px', flexShrink: 0 }} onClick={handleSetCreditLimit} disabled={savingLimit}>
                  {savingLimit ? '...' : t('set')}
                </button>
              </div>
            </div>

            {/* Last 10 days orders */}
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('orderHistoryLast10')}</div>
            {loadingDetail ? (
              <div className="spinner" />
            ) : !detail?.orders?.length ? (
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '16px 0' }}>{t('noRecentOrdersShort')}</div>
            ) : (
              detail.orders.map(order => (
                <div key={order.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>#{order.id?.slice(0, 6)}</span>
                    <span style={{ fontWeight: 700, color: 'var(--red)' }}>{parseFloat(order.total).toFixed(0)} {t('etb')}</span>
                  </div>
                  {order.items?.map((item, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text2)' }}>{item.quantity}× {item.name}</div>
                  ))}
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{new Date(order.created_at).toLocaleDateString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
