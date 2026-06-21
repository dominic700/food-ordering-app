import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { getMenu } from '../../api/menu.js';
import { registerAtCafe } from '../../api/customer.js';
import useCafeContext from '../../hooks/useCafeContext.js';
import BottomNav from '../../components/BottomNav.jsx';
import PromoSlider from '../../components/PromoSlider.jsx';
import MenuItemCard from '../../components/MenuItemCard.jsx';
import CartBar from '../../components/CartBar.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

export default function CafeMenu() {
  const { cafeId }  = useParams();
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const { cafe, cafeAccount, promotions, loading: ctxLoading, refreshAccount } = useCafeContext();

  const account        = useStore(s => s.account);
  const cart           = useStore(s => s.cart);
  const addToCart      = useStore(s => s.addToCart);
  const removeFromCart = useStore(s => s.removeFromCart);
  const cartCount      = useStore(s => s.cartCount());
  const cartTotal      = useStore(s => s.cartTotal());
  const favorites      = useStore(s => s.favorites);
  const toggleFavorite = useStore(s => s.toggleFavorite);

  const [menu, setMenu]               = useState({ categories: [], items: [], service_fee: 0 });
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch]           = useState('');
  const [showSearch, setShowSearch]   = useState(false);
  const [menuLoading, setMenuLoading] = useState(true);

  // Registration popup
  const [showRegSheet, setShowRegSheet] = useState(false);
  const [regName, setRegName]           = useState('');
  const [regPhone, setRegPhone]         = useState('');
  const [registering, setRegistering]   = useState(false);
  const [regDone, setRegDone]           = useState(false);

  useEffect(() => {
    telegram.showBackButton(() => navigate('/'));
    return () => telegram.hideBackButton();
  }, []);

  useEffect(() => {
    getMenu(cafeId)
      .then(setMenu)
      .catch(console.error)
      .finally(() => setMenuLoading(false));
  }, [cafeId]);

  // Pre-fill name + phone from Telegram account
  useEffect(() => {
    if (account) {
      setRegName(account.name || '');
      setRegPhone(account.phone || '');
    }
  }, [account]);

  // Show registration popup if not registered, OR if the customer
  // navigated here from Profile's "Register at this Cafe" link
  // (?register=1) — covers customers who skipped it the first time.
  useEffect(() => {
    if (ctxLoading) return;
    if (!cafeAccount || searchParams.get('register') === '1') {
      setShowRegSheet(true);
    }
  }, [ctxLoading, cafeAccount, searchParams]);

  function getQty(itemId) {
    return cart.find(i => i.menu_item_id === itemId)?.quantity || 0;
  }

  function handleAdd(item) {
    addToCart({
      menu_item_id:     item.id,
      name:             item.name,
      base_price:       parseFloat(item.base_price),
      service_fee:      menu.service_fee,
      list_price:       parseFloat(item.list_price),
      price:            parseFloat(item.price),
      discount_percent: parseFloat(item.discount_percent || 0),
    });
    telegram.haptic();
  }

  async function handleRegister() {
    if (!regName.trim())  return telegram.alert('Please enter your name.');
    if (!regPhone.trim()) return telegram.alert('Please enter your phone number.');

    setRegistering(true);
    try {
      await registerAtCafe(cafeId, regName.trim(), regPhone.trim());
      await refreshAccount();
      setRegDone(true);
      telegram.haptic('success');
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setRegistering(false);
    }
  }

  const status = cafeAccount?.status;
  const isApproved = status === 'approved';

  const filteredItems = menu.items.filter(item => {
    if (activeCategory !== 'all' && item.category_id !== activeCategory) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const cafeName = cafe?.name || 'Cafe';

  const slides = promotions.length > 0
    ? promotions
    : [];

  const fallbackSlides = [{
    badge:  'WELCOME',
    title:  cafeName,
    desc:   cafe?.description || 'Browse the menu and place your order',
    emoji:  '🍽️',
  }];

  if (ctxLoading || menuLoading) return <Spinner fullPage label="Loading menu..." />;

  return (
    <div className="page" style={{ paddingBottom: cartCount > 0 ? 150 : 100 }}>

      {/* Header */}
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/')}>‹</button>
        <div style={{ flex: 1, color: '#fff', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{cafeName}</div>
          {cafe?.address && (
            <div style={{ fontSize: 11, color: '#999' }}>📍 {cafe.address}</div>
          )}
        </div>
        <button className="header-icon" onClick={() => setShowSearch(s => !s)}>🔍</button>
        <button className="header-icon" onClick={() => toggleFavorite(cafeId)}>
          {favorites.includes(cafeId) ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Search */}
      {showSearch && (
        <div style={{ padding: '10px 16px 0' }}>
          <div className="input-wrap">
            <span className="input-icon">🔍</span>
            <input
              className="input"
              placeholder="Search menu..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Status banners for registered but not approved */}
      {status === 'pending' && (
        <div style={{ margin: '12px 16px 0', background: '#fff3e0', border: '1.5px solid #f97316', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#c2410c' }}>
          ⏳ <strong>Registration Pending</strong> — Waiting for cafe approval.
          You can still browse the menu and place cash or transfer orders.
        </div>
      )}
      {status === 'suspended' && (
        <div style={{ margin: '12px 16px 0', background: '#ffeaea', border: '1.5px solid var(--red)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: 'var(--red)' }}>
          🚫 <strong>Account Suspended</strong> — Contact the cafe for assistance.
        </div>
      )}

      {/* Promo slider */}
      <div style={{ paddingTop: 16 }}>
        <PromoSlider slides={slides} fallbackSlides={fallbackSlides} />
      </div>

      {/* Menu */}
      <div style={{ padding: '0 16px' }}>
        <div className="section-header">
          <div className="section-title">Menu</div>
          {!isApproved && !status && (
            <button
              className="btn btn-red btn-sm"
              onClick={() => setShowRegSheet(true)}
            >
              Register
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="cat-tabs" style={{ marginBottom: 14 }}>
          <button
            className={`cat-tab ${activeCategory === 'all' ? 'active' : 'inactive'}`}
            onClick={() => setActiveCategory('all')}
          >
            All
          </button>
          {menu.categories.map(cat => (
            <button
              key={cat.id}
              className={`cat-tab ${activeCategory === cat.id ? 'active' : 'inactive'}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu items */}
        {filteredItems.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🍽️</div>
            <div className="empty-title">No items found</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {filteredItems.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                qty={getQty(item.id)}
                onAdd={() => handleAdd(item)}
                onRemove={() => removeFromCart(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cart bar */}
      <CartBar
        count={cartCount}
        total={cartTotal}
        onClick={() => navigate(`/cafe/${cafeId}/cart`)}
      />

      <BottomNav variant="customer-cafe" cafeId={cafeId} active="menu" />

      {/* ── Registration popup sheet ──────────────────────────── */}
      {showRegSheet && (
        <div className="overlay" onClick={() => !registering && setShowRegSheet(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />

            {regDone ? (
              /* Success state */
              <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  Registration Sent!
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
                  Your request has been sent to <strong>{cafeName}</strong>.<br />
                  You will be notified once approved.<br /><br />
                  You can still order with <strong>Cash</strong> or <strong>Transfer</strong> now.
                </div>
                <button
                  className="btn btn-red"
                  onClick={() => setShowRegSheet(false)}
                >
                  Got it, Browse Menu
                </button>
              </div>
            ) : (
              /* Registration form */
              <>
                <div className="sheet-title">Register at {cafeName}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
                  Create your account to use wallet balance and credit payments.
                  Cash and transfer orders are available without registration.
                </div>

                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <div className="input-wrap">
                    <span className="input-icon">👤</span>
                    <input
                      className="input"
                      placeholder="Enter your full name"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Phone Number</label>
                  <div className="input-wrap">
                    <span className="input-icon">📞</span>
                    <input
                      className="input"
                      placeholder="+251 9XX XXX XXX"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      type="tel"
                    />
                  </div>
                </div>

                <button
                  className="btn btn-red"
                  onClick={handleRegister}
                  disabled={registering}
                  style={{ marginBottom: 10 }}
                >
                  {registering ? 'Sending request...' : 'Send Registration Request'}
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => setShowRegSheet(false)}
                >
                  Skip — Order with Cash or Transfer
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
