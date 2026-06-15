import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.js';
import telegram from '../telegram.js';

// variant:
//   'customer-global' -> Home | Orders | Favorites | Profile
//                         (Orders/Profile jump into the last-visited cafe)
//   'customer-cafe'   -> Menu | Orders | Cart(big red) | Deposits | Profile
//                         (requires cafeId)
//   'cafe-owner'      -> Dashboard | Orders | Menu | Customers | Registrations
//
// active: which tab is highlighted (string key, see below)
export default function BottomNav({ variant = 'customer-global', cafeId, active }) {
  const navigate = useNavigate();
  const cartCount = useStore(s => s.cartCount());
  const currentCafe = useStore(s => s.currentCafe);

  function go(path) {
    telegram.haptic();
    navigate(path);
  }

  function goCafeScoped(suffix) {
    if (currentCafe?.id) go(`/cafe/${currentCafe.id}/${suffix}`);
    else { telegram.alert('Select a cafe first'); go('/'); }
  }

  // ── Customer: inside a cafe ─────────────────────────────────
  if (variant === 'customer-cafe') {
    return (
      <div className="bottom-nav">
        <button className={`nav-item ${active === 'menu' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/menu`)}>
          <span className="nav-icon">🍽️</span><span className="nav-label">Menu</span>
        </button>
        <button className={`nav-item ${active === 'orders' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/orders`)}>
          <span className="nav-icon">🧾</span><span className="nav-label">Orders</span>
        </button>
        <button className="nav-cart-btn" onClick={() => go(`/cafe/${cafeId}/cart`)}>
          🛒
          {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
        </button>
        <button className={`nav-item ${active === 'deposits' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/deposit`)}>
          <span className="nav-icon">👛</span><span className="nav-label">Deposits</span>
        </button>
        <button className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/profile`)}>
          <span className="nav-icon">👤</span><span className="nav-label">Profile</span>
        </button>
      </div>
    );
  }

  // ── Cafe owner dashboard ─────────────────────────────────────
  if (variant === 'cafe-owner') {
    return (
      <div className="bottom-nav">
        <button className={`nav-item ${active === 'dashboard' ? 'active' : ''}`} onClick={() => go('/cafe-home')}>
          <span className="nav-icon" style={active === 'dashboard' ? { color: 'var(--red)' } : {}}>🏠</span>
          <span className="nav-label" style={active === 'dashboard' ? { color: 'var(--red)' } : {}}>Home</span>
        </button>
        <button className={`nav-item ${active === 'menu' ? 'active' : ''}`} onClick={() => go('/cafe-home/menu')}>
          <span className="nav-icon" style={active === 'menu' ? { color: 'var(--red)' } : {}}>▦</span>
          <span className="nav-label" style={active === 'menu' ? { color: 'var(--red)' } : {}}>Menu</span>
        </button>
        <button className={`nav-item ${active === 'orders' ? 'active' : ''}`} onClick={() => go('/cafe-home/orders')}>
          <span className="nav-icon" style={active === 'orders' ? { color: 'var(--red)' } : {}}>📋</span>
          <span className="nav-label" style={active === 'orders' ? { color: 'var(--red)' } : {}}>Orders</span>
        </button>
        <button className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => go('/cafe-home/profile')}>
          <span className="nav-icon" style={active === 'profile' ? { color: 'var(--red)' } : {}}>👤</span>
          <span className="nav-label" style={active === 'profile' ? { color: 'var(--red)' } : {}}>Profile</span>
        </button>
      </div>
    );
  }

  // ── Customer: global (before entering a cafe) ────────────────
  return (
    <div className="bottom-nav">
      <button className={`nav-item ${active === 'home' ? 'active' : ''}`} onClick={() => go('/')}>
        <span className="nav-icon">🏠</span><span className="nav-label">Home</span>
      </button>
      <button className={`nav-item ${active === 'orders' ? 'active' : ''}`} onClick={() => goCafeScoped('orders')}>
        <span className="nav-icon">🧾</span><span className="nav-label">Orders</span>
      </button>
      <button className={`nav-item ${active === 'favorites' ? 'active' : ''}`} onClick={() => go('/favorites')}>
        <span className="nav-icon">♡</span><span className="nav-label">Favorites</span>
      </button>
      <button className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => goCafeScoped('profile')}>
        <span className="nav-icon">👤</span><span className="nav-label">Profile</span>
      </button>
    </div>
  );
}
