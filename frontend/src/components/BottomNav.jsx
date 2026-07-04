import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.js';
import telegram from '../telegram.js';
import useLanguage from '../hooks/useLanguage.js';
import {
  FiHome,
  FiFileText,
  FiGrid,
  FiCreditCard,
  FiUser,
  FiShoppingCart,
  FiHeart,
  FiUsers,
} from 'react-icons/fi';

// NOTE: getRegistrations is imported lazily inside the useEffect
// below (only when variant === 'cafe-owner') to avoid crashing
// customer pages that also use this component.

export default function BottomNav({ variant = 'customer-global', cafeId, active }) {
  const navigate    = useNavigate();
  const cartCount   = useStore(s => s.cartCount());
  const currentCafe = useStore(s => s.currentCafe);
  const { t }       = useLanguage();

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
    else { telegram.alert(t('selectCafeFirst')); go('/'); }
  }

  const ICON_SIZE = 20;

  // ── Customer: inside a cafe ──────────────────────────────────
  if (variant === 'customer-cafe') {
    return (
      <div className="bottom-nav">
        <button className={`nav-item ${active === 'menu' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/menu`)}>
          <span className="nav-icon"><FiGrid size={ICON_SIZE} /></span>
          <span className="nav-label">{t('navMenu')}</span>
        </button>
        <button className={`nav-item ${active === 'orders' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/orders`)}>
          <span className="nav-icon"><FiFileText size={ICON_SIZE} /></span>
          <span className="nav-label">{t('navOrders')}</span>
        </button>
        <button className="nav-cart-btn" onClick={() => go(`/cafe/${cafeId}/cart`)}>
          <FiShoppingCart size={ICON_SIZE} />
          {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
        </button>
        <button className={`nav-item ${active === 'deposits' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/deposit`)}>
          <span className="nav-icon"><FiCreditCard size={ICON_SIZE} /></span>
          <span className="nav-label">{t('navDeposits')}</span>
        </button>
        <button className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => go(`/cafe/${cafeId}/profile`)}>
          <span className="nav-icon"><FiUser size={ICON_SIZE} /></span>
          <span className="nav-label">{t('navProfile')}</span>
        </button>
      </div>
    );
  }

  // ── Cafe owner ───────────────────────────────────────────────
  if (variant === 'cafe-owner') {
    return (
      <div className="bottom-nav">
        <button className={`nav-item ${active === 'dashboard' ? 'active' : ''}`} onClick={() => go('/cafe-home')}>
          <span className="nav-icon"><FiHome size={ICON_SIZE} color={active === 'dashboard' ? 'var(--red)' : undefined} /></span>
          <span className="nav-label" style={active === 'dashboard' ? { color: 'var(--red)' } : {}}>{t('navHome')}</span>
        </button>
        <button className={`nav-item ${active === 'orders' ? 'active' : ''}`} onClick={() => go('/cafe-home/orders')}>
          <span className="nav-icon"><FiFileText size={ICON_SIZE} color={active === 'orders' ? 'var(--red)' : undefined} /></span>
          <span className="nav-label" style={active === 'orders' ? { color: 'var(--red)' } : {}}>{t('navOrders')}</span>
        </button>
        <button className={`nav-item ${active === 'menu' ? 'active' : ''}`} onClick={() => go('/cafe-home/menu')}>
          <span className="nav-icon"><FiGrid size={ICON_SIZE} color={active === 'menu' ? 'var(--red)' : undefined} /></span>
          <span className="nav-label" style={active === 'menu' ? { color: 'var(--red)' } : {}}>{t('navMenu')}</span>
        </button>
        {/* Customers tab — contains Registrations + Customers upper tabs.
            Red badge shows count of pending registration requests. */}
        <button
          className={`nav-item ${active === 'credit' ? 'active' : ''}`}
          onClick={() => go('/cafe-home/credit')}
          style={{ position: 'relative' }}
        >
          <span className="nav-icon"><FiUsers size={ICON_SIZE} color={active === 'credit' ? 'var(--red)' : undefined} /></span>
          <span className="nav-label" style={active === 'credit' ? { color: 'var(--red)' } : {}}>{t('navCustomers')}</span>
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
          <span className="nav-icon"><FiUser size={ICON_SIZE} color={active === 'profile' ? 'var(--red)' : undefined} /></span>
          <span className="nav-label" style={active === 'profile' ? { color: 'var(--red)' } : {}}>{t('navProfile')}</span>
        </button>
      </div>
    );
  }

  // ── Customer: global (home, favorites) ───────────────────────
  return (
    <div className="bottom-nav">
      <button className={`nav-item ${active === 'home' ? 'active' : ''}`} onClick={() => go('/')}>
        <span className="nav-icon"><FiHome size={ICON_SIZE} /></span>
        <span className="nav-label">{t('navHome')}</span>
      </button>
      <button className={`nav-item ${active === 'orders' ? 'active' : ''}`} onClick={() => goCafeScoped('orders')}>
        <span className="nav-icon"><FiFileText size={ICON_SIZE} /></span>
        <span className="nav-label">{t('navOrders')}</span>
      </button>
      <button className={`nav-item ${active === 'favorites' ? 'active' : ''}`} onClick={() => go('/favorites')}>
        <span className="nav-icon"><FiHeart size={ICON_SIZE} /></span>
        <span className="nav-label">{t('navFavorites')}</span>
      </button>
      <button className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => goCafeScoped('profile')}>
        <span className="nav-icon"><FiUser size={ICON_SIZE} /></span>
        <span className="nav-label">{t('navProfile')}</span>
      </button>
    </div>
  );
}
