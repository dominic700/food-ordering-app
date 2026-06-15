import { useNavigate } from 'react-router-dom';
import telegram from '../telegram.js';

// Admin bottom nav — 3 tabs matching the design:
// Cafes | New Cafe (big red circle center) | Orders Today
export default function AdminBottomNav({ active, totalOrdersToday = 0 }) {
  const navigate = useNavigate();

  function go(path) {
    telegram.haptic();
    navigate(path);
  }

  return (
    <div className="bottom-nav">
      {/* Cafes */}
      <button
        className={`nav-item ${active === 'cafes' ? 'active' : ''}`}
        onClick={() => go('/admin')}
        style={{ flex: 1 }}
      >
        <span style={{ fontSize: 22, color: active === 'cafes' ? 'var(--red)' : 'var(--text2)' }}>🏪</span>
        <span className="nav-label" style={{ color: active === 'cafes' ? 'var(--red)' : 'var(--text2)' }}>Cafes</span>
      </button>

      {/* New Cafe — big red circle (center, elevated) */}
      <button
        onClick={() => go('/admin/create')}
        style={{
          width: 56, height: 56,
          background: active === 'create' ? '#c0000a' : 'var(--red)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, color: '#fff',
          border: 'none', cursor: 'pointer',
          marginTop: -16,
          boxShadow: '0 4px 14px rgba(230,57,70,0.4)',
          flexShrink: 0,
        }}
      >
        +
      </button>
      <span style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 600, color: active === 'create' ? 'var(--red)' : 'var(--text2)', pointerEvents: 'none' }}>
        New Cafe
      </span>

      {/* Orders Today */}
      <button
        className={`nav-item ${active === 'orders' ? 'active' : ''}`}
        onClick={() => go('/admin/orders')}
        style={{ flex: 1, position: 'relative' }}
      >
        <span style={{ fontSize: 22, color: active === 'orders' ? 'var(--red)' : 'var(--text2)', position: 'relative' }}>
          📊
          {totalOrdersToday > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -8,
              background: 'var(--red)', color: '#fff',
              fontSize: 9, fontWeight: 800,
              borderRadius: 10, padding: '1px 4px',
              lineHeight: 1.4,
            }}>{totalOrdersToday}</span>
          )}
        </span>
        <span className="nav-label" style={{ color: active === 'orders' ? 'var(--red)' : 'var(--text2)' }}>Orders Today</span>
      </button>
    </div>
  );
}
