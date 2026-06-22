import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCafes, toggleCafe } from '../../api/admin.js';
import AdminBottomNav from '../../components/AdminBottomNav.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

const COLORS = ['#e63946','#3b82f6','#22c55e','#f97316','#8b5cf6','#ec4899'];
function avatarColor(name) { return COLORS[(name?.charCodeAt(0) || 0) % COLORS.length]; }
function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(null); // cafe id with open ⋮ menu

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

  const filtered = cafes.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.address?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCafes    = cafes.length;
  const activeCafes   = cafes.filter(c => c.is_active).length;
  const inactiveCafes = cafes.filter(c => !c.is_active).length;
  const totalOrders   = cafes.reduce((s, c) => s + parseInt(c.total_orders || 0), 0);

  const STATS = [
    { icon: '🏪', label: 'Total Cafes',       value: totalCafes,    sub: 'Active'    },
    { icon: '🛍️', label: 'Active Cafes',      value: activeCafes,   sub: 'Online'    },
    { icon: '⏸️', label: 'Inactive Cafes',    value: inactiveCafes, sub: 'Offline'   },
    { icon: '📋', label: 'Total Orders Today', value: totalOrders,   sub: 'All Cafes' },
  ];

  if (loading) return <Spinner fullPage label="Loading admin dashboard..." />;

  return (
    <div className="page" style={{ background: '#000', minHeight: '100vh', paddingBottom: 0 }}>
      {/* Header */}
      <div className="header">
        <button className="header-icon">☰</button>
        <div className="header-title">Admin Terminal</div>
        <button className="header-icon" style={{ position: 'relative' }}>
          
          <span className="header-badge">3</span>
        </button>
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

              {/* Orders count */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Today's Orders</div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>{cafe.total_orders || 0}</div>
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
                    style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: cafe.is_active ? '#f97316' : '#22c55e' }}
                    onClick={() => handleToggle(cafe)}
                  >
                    {cafe.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
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

      <AdminBottomNav active="cafes" totalOrdersToday={totalOrders} />
    </div>
  );
}
