import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { getDashboard, getCafeSettings } from '../../api/cafe.js';
import BottomNav from '../../components/BottomNav.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

export default function CafeProfile() {
  const navigate = useNavigate();
  const account = useStore(s => s.account);
  const setAuth = useStore(s => s.setAuth);

  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [dashData, settingsData] = await Promise.all([
        getDashboard(),
        getCafeSettings(),
      ]);
      setStats(dashData);
      setSettings(settingsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleLogout() {
    setAuth(null, null);
    navigate('/');
  }

  const cafeName = account?.cafe_name || settings?.name || 'Your Cafe';
  const cafeAddress = account?.address || '';

  function getInitials(name) {
    return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  if (loading) return <Spinner fullPage label="Loading profile..." />;

  const MENU_ITEMS = [
    { icon: '👤', label: 'Edit Cafe Information', action: () => telegram.alert('Coming soon') },
    { icon: '🔒', label: 'Change Password',       action: () => telegram.alert('Coming soon') },
    { icon: '💳', label: 'Payment Information',   action: () => telegram.alert('Coming soon') },
    { icon: '❓', label: 'Support & Help',         action: () => telegram.alert('Coming soon') },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <button className="header-icon">☰</button>
        <div className="header-title">Profile</div>
        <button className="header-icon" style={{ position: 'relative' }}>
          🔔
          <span className="header-badge">{stats?.pending_orders || 0}</span>
        </button>
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
                <span style={{ background: '#e8f5e9', color: '#22c55e', borderRadius: 12, fontSize: 12, fontWeight: 700, padding: '3px 12px' }}>
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, background: 'var(--red-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 8px' }}>💰</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Today's Revenue</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>
              {parseFloat(stats?.revenue_30d || 0).toFixed(0)} ETB
            </div>
          </div>
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, background: 'var(--red-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 8px' }}>📅</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>This Month</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>
              {parseFloat(stats?.revenue_30d || 0).toFixed(0)} ETB
            </div>
          </div>
        </div>

        {/* Settings info */}
        {settings && (
          <div className="card" style={{ marginBottom: 16, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>⚙️ Cafe Settings</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
              <span style={{ color: 'var(--text2)' }}>Service Fee</span>
              <span style={{ fontWeight: 700 }}>{parseFloat(settings.service_fee || 0).toFixed(2)} ETB / item</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text2)' }}>Balance Discount</span>
              <span style={{ fontWeight: 700, color: 'var(--green)' }}>{parseFloat(settings.balance_discount_percent || 0).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Menu items */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          {MENU_ITEMS.map((item, i) => (
            <div
              key={i}
              className="profile-menu-item"
              onClick={item.action}
            >
              <div className="profile-menu-icon">{item.icon}</div>
              <div className="profile-menu-label">{item.label}</div>
              <div className="profile-chevron">›</div>
            </div>
          ))}
          {/* Logout */}
          <div className="profile-menu-item" onClick={handleLogout} style={{ borderBottom: 'none' }}>
            <div className="profile-menu-icon" style={{ background: '#ffeaea' }}>🚪</div>
            <div className="profile-menu-label" style={{ color: 'var(--red)' }}>Logout</div>
            <div className="profile-chevron">›</div>
          </div>
        </div>

        {/* Help card */}
        <div style={{ background: 'var(--red-light)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 28 }}>🎧</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Need Help?</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                Contact our support team if you need any assistance.
              </div>
            </div>
          </div>
          <button className="btn btn-red" onClick={() => telegram.alert('Support: support@foodapp.com')}>
            Contact Support
          </button>
        </div>

      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="cafe-owner" active="profile" />
    </div>
  );
}
