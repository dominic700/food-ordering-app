import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.js';
import telegram from '../telegram.js';
import useLanguage from '../hooks/useLanguage.js';


 

// NOTE: getRegistrations is imported lazily inside the useEffect
// below (only when variant === 'cafe-owner') to avoid crashing
// customer pages that also use this component.

export default function BottomNav({ variant = 'customer-global', cafeId, active }) {
  const navigate    = useNavigate();
  const { t } = useLanguage();
  const cartCount   = useStore(s => s.cartCount());
  const currentCafe = useStore(s => s.currentCafe);
  

  // Live pending-registration badge — only fetched for cafe-owner
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (variant !== 'cafe-owner') return;

    let mounted = true;

    async function fetchPending() {
      try {
        // Dynamic import so customer pages never trigger this call
        const { getRegistrations } = await import('../api/cafe.js');
        const regs = await getRegistrations();
        if (mounted) setPendingCount(Array.isArray(regs) ? regs.length : 0);
      } catch {
        // Silent — badge just won't show if this fails
      }
    }

    fetchPending();
    const interval = setInterval(fetchPending, 20000);
    return () => { mounted = false; clearInterval(interval); };
  }, [variant]);

  function go(path) {
    telegram.haptic();
    navigate(path);
  }

  function goCafeScoped(suffix) {
    if (currentCafe?.id) go(`/cafe/${currentCafe.id}/${suffix}`);
    else { telegram.alert('Select a cafe first'); go('/'); }
  }

  // ── Customer: inside a cafe ──────────────────────────────────
  if (variant === 'customer-cafe') {
    return (
      <div className="bottom-nav">
        <button className={`nav-item ${active === 'menu' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/menu`)}>
          <span className="nav-icon">🍽️</span>
          <span className="nav-label">Menu</span>
        </button>
        <button className={`nav-item ${active === 'orders' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/orders`)}>
          <span className="nav-icon">🧾</span>
          <span className="nav-label">Orders</span>
        </button>
        <button className="nav-cart-btn" onClick={() => go(`/cafe/${cafeId}/cart`)}>
          🛒
          {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
        </button>
        <button className={`nav-item ${active === 'deposits' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/deposit`)}>
          <span className="nav-icon">👛</span>
          <span className="nav-label">Deposits</span>
        </button>
        <button className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/profile`)}>
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </button>
      </div>
    );
  }

  // ── Cafe owner ───────────────────────────────────────────────
  if (variant === 'cafe-owner') {
    return (
      <div className="bottom-nav">
        <button className={`nav-item ${active === 'dashboard' ? 'active' : ''}`} onClick={() => go('/cafe-home')}>
          <span className="nav-icon" style={active === 'dashboard' ? { color: 'var(--red)' } : {}}>🏠</span>
          <span className="nav-label" style={active === 'dashboard' ? { color: 'var(--red)' } : {}}>Home</span>
        </button>
        <button className={`nav-item ${active === 'orders' ? 'active' : ''}`} onClick={() => go('/cafe-home/orders')}>
          <span className="nav-icon" style={active === 'orders' ? { color: 'var(--red)' } : {}}>📋</span>
          <span className="nav-label" style={active === 'orders' ? { color: 'var(--red)' } : {}}>Orders</span>
        </button>
        <button className={`nav-item ${active === 'menu' ? 'active' : ''}`} onClick={() => go('/cafe-home/menu')}>
          <span className="nav-icon" style={active === 'menu' ? { color: 'var(--red)' } : {}}>▦</span>
          <span className="nav-label" style={active === 'menu' ? { color: 'var(--red)' } : {}}>Menu</span>
        </button>
        {/* Customers tab — contains Registrations + Customers upper tabs.
            Red badge shows count of pending registration requests. */}
        <button
          className={`nav-item ${active === 'credit' ? 'active' : ''}`}
          onClick={() => go('/cafe-home/credit')}
          style={{ position: 'relative' }}
        >
          <span className="nav-icon" style={active === 'credit' ? { color: 'var(--red)' } : {}}>👥</span>
          <span className="nav-label" style={active === 'credit' ? { color: 'var(--red)' } : {}}>Customers</span>
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 8,
              background: 'var(--red)', color: '#fff',
              borderRadius: '50%', fontSize: 10, fontWeight: 800,
              width: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>
        <button className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => go('/cafe-home/profile')}>
          <span className="nav-icon" style={active === 'profile' ? { color: 'var(--red)' } : {}}>👤</span>
          <span className="nav-label" style={active === 'profile' ? { color: 'var(--red)' } : {}}>Profile</span>
        </button>
      </div>
    );
  }

  // ── Customer: global (home, favorites) ───────────────────────
  return (
    <div className="bottom-nav">
      <button className={`nav-item ${active === 'home' ? 'active' : ''}`} onClick={() => go('/')}>
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Home</span>
      </button>
      <button className={`nav-item ${active === 'orders' ? 'active' : ''}`} onClick={() => goCafeScoped('orders')}>
        <span className="nav-icon">🧾</span>
        <span className="nav-label">Orders</span>
      </button>
      <button className={`nav-item ${active === 'favorites' ? 'active' : ''}`} onClick={() => go('/favorites')}>
        <span className="nav-icon">♡</span>
        <span className="nav-label">Favorites</span>
      </button>
      <button className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => goCafeScoped('profile')}>
        <span className="nav-icon">👤</span>
        <span className="nav-label">Profile</span>
      </button>
    </div>
  );
}
