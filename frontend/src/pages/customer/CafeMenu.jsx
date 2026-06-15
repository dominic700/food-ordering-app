import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const { cafeId } = useParams();
  const navigate = useNavigate();
  const { cafe, cafeAccount, promotions, loading: ctxLoading, refreshAccount } = useCafeContext();

  const cart = useStore(s => s.cart);
  const addToCart = useStore(s => s.addToCart);
  const removeFromCart = useStore(s => s.removeFromCart);
  const cartCount = useStore(s => s.cartCount());
  const cartTotal = useStore(s => s.cartTotal());
  const favorites = useStore(s => s.favorites);
  const toggleFavorite = useStore(s => s.toggleFavorite);

  const [menu, setMenu] = useState({ categories: [], items: [], service_fee: 0 });
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [menuLoading, setMenuLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    telegram.showBackButton(() => navigate('/'));
    return () => telegram.hideBackButton();
  }, []);

  useEffect(() => {
    getMenu(cafeId).then(setMenu).catch(console.error).finally(() => setMenuLoading(false));
  }, [cafeId]);

  function getQty(itemId) {
    return cart.find(i => i.menu_item_id === itemId)?.quantity || 0;
  }

  function handleAdd(item) {
    addToCart({
      menu_item_id: item.id,
      name: item.name,
      base_price: parseFloat(item.base_price),
      service_fee: menu.service_fee,
      list_price: parseFloat(item.list_price),
      price: parseFloat(item.price),
      discount_percent: parseFloat(item.discount_percent),
    });
    telegram.haptic();
  }

  async function handleRegister() {
    setRegistering(true);
    try {
      await registerAtCafe(cafeId);
      await refreshAccount();
      telegram.haptic('success');
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setRegistering(false);
    }
  }

  const status = cafeAccount?.status; // undefined | 'pending' | 'approved' | 'suspended'

  const filteredItems = menu.items.filter(item => {
    if (activeCategory !== 'all' && item.category_id !== activeCategory) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const slides = promotions.length > 0
    ? promotions.map(p => ({ badge: 'TODAY', title: p.title || 'Special Offer', emoji: '🔥' }))
    : cafe ? [{
        badge: parseFloat(cafe.service_fee) > 0 ? `+${parseFloat(cafe.service_fee).toFixed(0)} ETB FEE` : 'WELCOME',
        title: cafe.name,
        desc: cafe.description || 'Browse the menu and place your order',
        emoji: '🍽️',
      }] : [];

  if (ctxLoading || menuLoading) return <Spinner fullPage label="Loading menu..." />;

  return (
    <div className="page" style={{ paddingBottom: cartCount > 0 ? 150 : 100 }}>
      {/* Header */}
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/')}>‹</button>
        <div style={{ flex: 1, color: '#fff', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{cafe?.name || 'Cafe'}</div>
          {cafe?.address && <div style={{ fontSize: 11, color: '#999' }}>📍 {cafe.address}</div>}
        </div>
        <button className="header-icon" onClick={() => setShowSearch(s => !s)}>🔍</button>
        <button className="header-icon" onClick={() => toggleFavorite(cafeId)}>
          {favorites.includes(cafeId) ? '❤️' : '🤍'}
        </button>
      </div>

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

      {/* Registration banner */}
      {status !== 'approved' && (
        <div style={{ padding: '12px 16px 0' }}>
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            {!status && (
              <>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>🆕 Register at {cafe?.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
                  Create your account to deposit money and order food here.
                </div>
                <button className="btn btn-red" onClick={handleRegister} disabled={registering}>
                  {registering ? 'Registering...' : 'Register Now'}
                </button>
              </>
            )}
            {status === 'pending' && (
              <>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>⏳ Registration Pending</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>Waiting for the cafe to approve your account.</div>
              </>
            )}
            {status === 'suspended' && (
              <>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>🚫 Account Suspended</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>Contact the cafe for more information.</div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ paddingTop: 16 }}>
        <PromoSlider slides={slides} />
      </div>

      <div style={{ padding: '0 16px' }}>
        <div className="section-header">
          <div className="section-title">Menu</div>
        </div>

        <div className="cat-tabs" style={{ marginBottom: 14 }}>
          <button className={`cat-tab ${activeCategory === 'all' ? 'active' : 'inactive'}`} onClick={() => setActiveCategory('all')}>
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

      <CartBar count={cartCount} total={cartTotal} onClick={() => navigate(`/cafe/${cafeId}/cart`)} />
      <BottomNav variant="customer-cafe" cafeId={cafeId} active="menu" />
    </div>
  );
}
