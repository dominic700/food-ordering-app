import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { getDashboard, getCafeSettings, getFeeStats, toggleCafe, resetRevenue, getRevenueHistory } from '../../api/cafe.js';
import BottomNav from '../../components/BottomNav.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';
import LangToggle from '../../components/LangToggle.jsx';
import useLanguage from '../../hooks/useLanguage.js';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function CafeProfile() {
  const navigate = useNavigate();
  const account = useStore(s => s.account);
  const setAuth = useStore(s => s.setAuth);
  const { t }   = useLanguage();

  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feeStats, setFeeStats] = useState(null);
  const [loadingFee, setLoadingFee] = useState(true);
  const [isActive, setIsActive]     = useState(true);
  const [toggling, setToggling]     = useState(false);
  const [resetting, setResetting]   = useState(false);
  const [history, setHistory]       = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const load = useCallback(async () => {
    try {
      const [dashData, settingsData] = await Promise.all([
        getDashboard(),
        getCafeSettings(),
      ]);
      setStats(dashData);
      setSettings(settingsData);
      setIsActive(settingsData?.is_active ?? true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Separate loader for the period counters (items/revenue/fee since
  // the last admin reset) — this is read-only on the cafe side, so
  // there's no "restart" handler here, just a fetch.
  const loadFeeStats = useCallback(async () => {
    try {
      const f = await getFeeStats();
      setFeeStats(f);
    } catch (err) {
      console.error('fee stats error:', err.message);
    } finally {
      setLoadingFee(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const h = await getRevenueHistory();
      setHistory(h);
    } catch (err) {
      console.error('history error:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { load(); loadFeeStats(); loadHistory(); }, [load, loadFeeStats, loadHistory]);

  async function handleReset() {
    const confirmed = window.confirm(
      '🔄 Reset your 30-day income counter?\n\nThis will save the current period as a snapshot in your history (last 6 months kept).'
    );
    if (!confirmed) return;
    setResetting(true);
    try {
      await resetRevenue();
      telegram.haptic('success');
      await Promise.all([load(), loadHistory()]);
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setResetting(false);
    }
  }

  async function handleToggle() {
    const action = isActive ? 'deactivate' : 'activate';
    const confirmed = window.confirm(
      isActive
        ? '⚠️ Deactivate your cafe? Customers will not be able to place orders until you reactivate.'
        : '✅ Reactivate your cafe? Customers will be able to place orders again.'
    );
    if (!confirmed) return;
    setToggling(true);
    try {
      const result = await toggleCafe();
      setIsActive(result.is_active);
      telegram.haptic('success');
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setToggling(false);
    }
  }

  function handleLogout() {
    setAuth(null, null);
    navigate('/');
  }

  const cafeName    = account?.cafe_name || settings?.name || 'Your Cafe';
  const cafeAddress = account?.address || '';

  if (loading) return <Spinner fullPage label="Loading profile..." />;

  const MENU_ITEMS = [
    { icon: '👤', label: t('editCafeInfo'), action: () => telegram.alert(t('comingSoon')) },
    { icon: '🔒', label: t('changePassword'), action: () => telegram.alert(t('comingSoon')) },
    { icon: '💳', label: t('paymentInfo'),   action: () => telegram.alert(t('comingSoon')) },
    { icon: '❓', label: t('supportHelp'),    action: () => telegram.alert(t('comingSoon')) },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <button className="header-icon">☰</button>
        <div className="header-title">{t('cafeProfile')}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <LangToggle />
          <NotificationBell to="/cafe-home/notifications" />
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Cafe info card */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              className="avatar avatar-xl"
              style={{ background: 'var(--black)', fontSize: 28, borderRadius: 16 }}
            >
              {getInitials(cafeName)}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{cafeName}</div>
              {cafeAddress && (
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>📍 {cafeAddress}</div>
              )}
              <div style={{ marginTop: 6 }}>
                <span style={{
                  background: isActive ? '#e8f5e9' : '#fff3e0',
                  color: isActive ? '#22c55e' : '#f97316',
                  borderRadius: 12, fontSize: 12, fontWeight: 700, padding: '3px 12px'
                }}>
                  {isActive ? t('activeStatus') : '⏸️ Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Total revenue — today / 30 days */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, background: 'var(--red-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 8px' }}>💰</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{t('todayRevenue')}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>
              {parseFloat(stats?.revenue_today || 0).toFixed(0)} {t('etb')}
            </div>
          </div>
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, background: 'var(--red-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 8px' }}>📅</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{t('revenue30d')}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>
              {parseFloat(stats?.revenue_30d || 0).toFixed(0)} {t('etb')}
            </div>
          </div>
        </div>

        {/* Revenue split: Deposited (Wallet/Credit) vs Cash & Transfer */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('revenueBreakdown')}</div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{t('walletRevenue')}</span>
              <span style={{ fontWeight: 700, color: '#3b82f6' }}>{parseFloat(stats?.wallet_revenue_30d || 0).toFixed(2)} {t('etb')}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: '#3b82f6',
                width: stats?.revenue_30d > 0
                  ? `${Math.min(100, (parseFloat(stats.wallet_revenue_30d) / parseFloat(stats.revenue_30d)) * 100)}%`
                  : '0%'
              }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{t('instantRevenue')}</span>
              <span style={{ fontWeight: 700, color: '#22c55e' }}>{parseFloat(stats?.instant_revenue_30d || 0).toFixed(2)} {t('etb')}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: '#22c55e',
                width: stats?.revenue_30d > 0
                  ? `${Math.min(100, (parseFloat(stats.instant_revenue_30d) / parseFloat(stats.revenue_30d)) * 100)}%`
                  : '0%'
              }} />
            </div>
          </div>

          <div className="divider" style={{ margin: '14px 0 10px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--text2)' }}>{t('depositsReceived')}</span>
            <span style={{ fontWeight: 700 }}>{parseFloat(stats?.deposits_30d || 0).toFixed(2)} {t('etb')}</span>
          </div>
          <div className="divider" style={{ margin: '14px 0 10px' }} />
          <button
            onClick={handleReset}
            disabled={resetting}
            style={{
              width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #3b82f6',
              background: resetting ? 'var(--bg)' : '#eff6ff', color: '#1d4ed8',
              fontWeight: 700, fontSize: 14, cursor: resetting ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {resetting ? '⏳ Saving...' : '🔄 Reset 30-Day Counter & Save'}
          </button>
        </div>

        {/* Last 6 months history */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📊 Income History (Last 6 Months)</div>
          {loadingHistory ? (
            <div className="spinner" />
          ) : history.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '10px 0' }}>
              No history yet. Reset your 30-day counter to save a snapshot.
            </div>
          ) : (
            history.map((h, i) => (
              <div key={h.id} style={{
                borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
                paddingBottom: i < history.length - 1 ? 14 : 0,
                marginBottom: i < history.length - 1 ? 14 : 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
                    {new Date(h.period_start).toLocaleDateString()} — {new Date(h.period_end).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{h.orders_count} orders</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Total Revenue</span>
                  <span style={{ fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                    {parseFloat(h.revenue_30d).toFixed(2)} ETB
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>💛 Wallet / Credit</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', fontFamily: 'var(--font-mono)' }}>
                    {parseFloat(h.wallet_revenue).toFixed(2)} ETB
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>💵 Cash & Transfer</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
                    {parseFloat(h.instant_revenue).toFixed(2)} ETB
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Current collection period — items / revenue / fee since the
            last time an admin pressed Restart. No reset button here
            on purpose: this always resets automatically together with
            the admin's fee reset, it isn't a separate action. */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{t('currentPeriod')}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>
            {t('since')} {feeStats?.period_start ? new Date(feeStats.period_start).toLocaleDateString() : '—'}
          </div>

          {loadingFee ? (
            <div className="spinner" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{t('itemsLabel')}</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>
                  {parseInt(feeStats?.current_period?.total_items || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ background: '#e8f5e9', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{t('revenueLabel')}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#22c55e' }}>
                  {parseFloat(feeStats?.current_period?.total_revenue || 0).toFixed(0)}
                </div>
              </div>
              <div style={{ background: '#fff3e0', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{t('feeOwed')}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#f97316' }}>
                  {parseFloat(feeStats?.current_period?.total_fee || 0).toFixed(0)}
                </div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, lineHeight: 1.5 }}>
            {t('periodResetNote')}
          </div>
        </div>

        {/* Settings info */}
        {settings && (
          <div className="card" style={{ marginBottom: 16, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('cafeSettings')}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text2)' }}>{t('serviceFeeLabel')}</span>
              <span style={{ fontWeight: 700 }}>{parseFloat(settings.service_fee || 0).toFixed(2)} {t('etb')} {t('perItem')}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8, lineHeight: 1.5 }}>
              {t('discountLocationNote')}
            </div>
          </div>
        )}

        {/* Menu items */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          {MENU_ITEMS.map((item, i) => (
            <div key={i} className="profile-menu-item" onClick={item.action}>
              <div className="profile-menu-icon">{item.icon}</div>
              <div className="profile-menu-label">{item.label}</div>
              <div className="profile-chevron">›</div>
            </div>
          ))}
          <div
            className="profile-menu-item"
            onClick={handleToggle}
            style={{ opacity: toggling ? 0.6 : 1 }}
          >
            <div className="profile-menu-icon" style={{ background: isActive ? '#fff3e0' : '#e8f5e9' }}>
              {isActive ? '⏸️' : '▶️'}
            </div>
            <div className="profile-menu-label" style={{ color: isActive ? '#f97316' : '#22c55e' }}>
              {toggling ? 'Please wait...' : isActive ? 'Deactivate Cafe' : 'Activate Cafe'}
            </div>
            <div className="profile-chevron">›</div>
          </div>
          <div className="profile-menu-item" onClick={handleLogout} style={{ borderBottom: 'none' }}>
            <div className="profile-menu-icon" style={{ background: '#ffeaea' }}>🚪</div>
            <div className="profile-menu-label" style={{ color: 'var(--red)' }}>{t('logout')}</div>
            <div className="profile-chevron">›</div>
          </div>
        </div>

        {/* Help card */}
        <div style={{ background: 'var(--red-light)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 28 }}>🎧</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t('needHelp')}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                {t('supportDesc')}
              </div>
            </div>
          </div>
          <button className="btn btn-red" onClick={() => telegram.alert('Support: support@foodapp.com')}>
            {t('contactSupport')}
          </button>
        </div>

      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="cafe-owner" active="profile" />
    </div>
  );
}
