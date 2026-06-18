import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { getCafes } from '../../api/customer.js';
import BottomNav from '../../components/BottomNav.jsx';
import PromoSlider from '../../components/PromoSlider.jsx';
import CafeCard from '../../components/CafeCard.jsx';
import Spinner from '../../components/Spinner.jsx';

export default function Home() {
  const navigate = useNavigate();
  const account = useStore(s => s.account);
  const setCurrentCafe = useStore(s => s.setCurrentCafe);
  const favorites = useStore(s => s.favorites);
  const toggleFavorite = useStore(s => s.toggleFavorite);

  const [cafes, setCafes] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCafes()
      .then(data => {
        setCafes(data.cafes || []);
        setPromotions(data.promotions || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function enterCafe(cafe) {
    setCurrentCafe(cafe);
    navigate(`/cafe/${cafe.id}/menu`);
  }

  // Fallback slides shown when no promos in database yet
  const fallbackSlides = [
    {
      badge: '🍽️ WELCOME',
      title: 'Order from your favorite cafes',
      desc: 'Browse menus and pay with wallet, credit, or transfer',
      emoji: '🍔',
    },
    {
      badge: '💳 EASY PAY',
      title: 'Deposit & Pay with Balance',
      desc: 'Load your wallet and order in seconds',
      emoji: '💰',
    },
    {
      badge: '✨ CREDIT',
      title: 'Apply for Credit',
      desc: 'Order now, pay later with your cafe credit limit',
      emoji: '🎯',
    },
  ];

  if (loading) return <Spinner fullPage label="Loading..." />;

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <div className="header-icon">📍</div>
        <div style={{ flex: 1, color: '#fff' }}>
          <div style={{ fontSize: 11, color: '#999' }}>Welcome back</div>
          <div style={{ fontWeight: 700 }}>
            {account?.name?.split(' ')[0] || 'Guest'}
          </div>
        </div>
        <button className="header-icon" style={{ position: 'relative' }}>
          🔔
        </button>
      </div>

      {/* Promo Slider — real images from DB or fallback */}
      <div style={{ paddingTop: 16 }}>
        <PromoSlider
          slides={promotions}
          fallbackSlides={fallbackSlides}
        />
      </div>

      {/* Cafe list */}
      <div style={{ padding: '0 16px' }}>
        <div className="section-header">
          <div className="section-title">Popular Cafes</div>
          <div className="section-link" onClick={() => navigate('/favorites')}>
            Favorites ›
          </div>
        </div>

        {cafes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🍽️</div>
            <div className="empty-title">No cafes yet</div>
            <div className="empty-desc">Check back soon</div>
          </div>
        ) : (
          <div className="grid-3">
            {cafes.map(cafe => (
              <CafeCard
                key={cafe.id}
                cafe={cafe}
                isFavorite={favorites.includes(cafe.id)}
                onToggleFavorite={toggleFavorite}
                onClick={() => enterCafe(cafe)}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 30 }} />
      <BottomNav variant="customer-global" active="home" />
    </div>
  );
}
