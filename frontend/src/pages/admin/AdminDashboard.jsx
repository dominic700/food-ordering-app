import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCafes, toggleCafe, deleteCafe } from '../../api/admin.js';
import AdminBottomNav from '../../components/AdminBottomNav.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';
import LangToggle from '../../components/LangToggle.jsx';
import useLanguage from '../../hooks/useLanguage.js';

const COLORS = ['#e63946','#3b82f6','#22c55e','#f97316','#8b5cf6','#ec4899'];
function avatarColor(name) { return COLORS[(name?.charCodeAt(0) || 0) % COLORS.length]; }
function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t }    = useLanguage();
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getCafes();
      setCafes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(cafe) {
    try {
      await toggleCafe(cafe.id);
      telegram.haptic();
      setMenuOpen(null);
      await load();
    } catch (err) {
      telegram.alert(err.message);
    }
  }

  async function handleDelete(cafe) {
    const confirmed = window.confirm(`⚠️ Permanently delete "${cafe.name}"?\n\nThis will delete all orders, menus, customers, and data for this cafe. This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteCafe(cafe.id);
      telegram.haptic();
      setMenuOpen(null);
      await load();
    } catch (err) {
      telegram.alert(err.message);
    }
  }

  const filtered = cafes.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.address?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCafes       = cafes.length;
  const activeCafes      = cafes.filter(c => c.is_active).length;
  const inactiveCafes    = cafes.filter(c => !c.is_active).length;
  const totalOrdersToday = cafes.reduce((s, c) => s + parseInt(c.orders_today || 0), 0);
  const totalOrdersAll   = cafes.reduce((s, c) => s + parseInt(c.total_orders || 0), 0);

  const STATS = [
    { icon: '🏪', label: t('activeCafes'),   value: activeCafes,      sub: t('active')  },
    { icon: '⏸️', label: t('inactiveCafes'), value: inactiveCafes,    sub: t('inactive') },
    { icon: '📋', label: t('todayOrdersAll'), value: totalOrdersToday, sub: t('allCafes') },
    { icon: '📦', label: t('totalOrdersAll'), value: totalOrdersAll,   sub: t('allTime')  },
  ];

  if (loading) return <Spinner fullPage label={t('loading')} />;

  return (
    <div className="page" style={{ background: '#000', minHeight: '100vh', paddingBottom: 0 }}>
      {/* Header */}
      <div className="header">
        <button className="header-icon">☰</button>
        <div className="header-title">{t('adminDashboard')}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <LangToggle />
          <NotificationBell to="/admin/notifications" />
        </div>
      </div>

      {/* White rounded main container */}
      <div style={{
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        minHeight: 'calc(100vh - 62px)',
        padding: '20px 16px 100px',
      }}>

        {/* Title + search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Cafes</div>
          <div style={{ position: 'relative', flex: 1, maxWidth: 200, marginLeft: 16 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 16 }}>🔍</span>
            <input
              style={{
                width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                border: '1.5px solid var(--border)', borderRadius: 20, fontSize: 13,
                fontFamily: 'var(--font)', outline: 'none', background: 'var(--bg)', color: 'var(--text)',
              }}
              placeholder="Search cafes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 20, paddingBottom: 4 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              flexShrink: 0, width: 130,
              border: '1.5px solid var(--border)', borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{ width: 36, height: 36, background: 'var(--red-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--red)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Cafe list */}
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏪</div>
            <div className="empty-title">No cafes found</div>
          </div>
        ) : (
          filtered.map(cafe => (
            <div
              key={cafe.id}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', position: 'relative' }}
              onClick={() => navigate(`/admin/cafe/${cafe.id}`)}
            >
              {/* Logo placeholder */}
              <div className="avatar avatar-lg" style={{ background: avatarColor(cafe.name), borderRadius: 50, flexShrink: 0 }}>
                {getInitials(cafe.name)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{cafe.name}</div>
                {cafe.address && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>📍 {cafe.address}</div>}
                <div style={{ marginTop: 6 }}>
                  <span style={{
                    background: cafe.is_active ? '#e8f5e9' : '#fff3e0',
                    color: cafe.is_active ? '#22c55e' : '#f97316',
                    borderRadius: 12, fontSize: 12, fontWeight: 700, padding: '3px 10px',
                  }}>
                    {cafe.is_active ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Item count — total approved items (for fee calculation) */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Items</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--red)' }}>
                  {parseInt(cafe.total_items_all_time || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>approved</div>
              </div>

              {/* Three dot menu */}
              <button
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)', padding: '4px 8px', flexShrink: 0 }}
                onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === cafe.id ? null : cafe.id); }}
              >
                ⋮
              </button>

              {/* Dropdown menu */}
              {menuOpen === cafe.id && (
                <div style={{
                  position: 'absolute', right: 0, top: 44, zIndex: 100,
                  background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  minWidth: 160, overflow: 'hidden',
                }} onClick={e => e.stopPropagation()}>
                  <div
                    style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onClick={() => { navigate(`/admin/cafe/${cafe.id}`); setMenuOpen(null); }}
                  >
                    👁️ View Details
                  </div>
                  <div
                    style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: cafe.is_active ? '#f97316' : '#22c55e', borderBottom: '1px solid var(--border)' }}
                    onClick={() => handleToggle(cafe)}
                  >
                    {cafe.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
                  </div>
                  <div
                    style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#e63946' }}
                    onClick={() => handleDelete(cafe)}
                  >
                    🗑️ Delete Permanently
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Overlay to close menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setMenuOpen(null)} />
      )}

      <AdminBottomNav active="cafes" totalOrdersToday={totalOrdersToday} />
    </div>
  );
}
