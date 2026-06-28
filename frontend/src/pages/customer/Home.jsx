import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { getCafes } from '../../api/customer.js';
import BottomNav from '../../components/BottomNav.jsx';
import PromoSlider from '../../components/PromoSlider.jsx';
import CafeCard from '../../components/CafeCard.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';
import LangToggle from '../../components/LangToggle.jsx';
import Spinner from '../../components/Spinner.jsx';
import useLanguage from '../../hooks/useLanguage.js';

export default function Home() {
  const navigate = useNavigate();
  const account = useStore(s => s.account);
  const setCurrentCafe = useStore(s => s.setCurrentCafe);
  const favorites = useStore(s => s.favorites);
  const toggleFavorite = useStore(s => s.toggleFavorite);
  const { t } = useLanguage();

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

  const fallbackSlides = [
    { badge: '🍽️ WELCOME', title: 'Order from your favorite cafes', desc: 'Browse menus and pay with wallet, credit, or transfer', emoji: '🍔' },
    { badge: '💳 EASY PAY', title: 'Deposit & Pay with Balance', desc: 'Load your wallet and order in seconds', emoji: '💰' },
    { badge: '✨ CREDIT', title: 'Use Credit Limit', desc: 'Order now, pay later with your cafe credit limit', emoji: '🎯' },
  ];

  if (loading) return <Spinner fullPage label={t('loading')} />;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" style={{ position: 'relative' }} onClick={() => {}}>
          📍
        </button>
        <div style={{ flex: 1, color: '#fff' }}>
          <div style={{ fontSize: 11, color: '#999' }}>{t('welcomeBack')}</div>
          <div style={{ fontWeight: 700 }}>{account?.name?.split(' ')[0] || 'Guest'}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <LangToggle />
          <NotificationBell to="/notifications" />
        </div>
      </div>

      <div style={{ paddingTop: 16 }}>
        <PromoSlider slides={promotions} fallbackSlides={fallbackSlides} />
      </div>

      <div style={{ padding: '0 16px' }}>
        <div className="section-header">
          <div className="section-title">{t('chooseCafe')}</div>
          <div className="section-link" onClick={() => navigate('/favorites')}>{t('navFavorites')} ›</div>
        </div>

        {cafes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🍽️</div>
            <div className="empty-title">{t('noCafes')}</div>
            <div className="empty-desc">{t('noCafesDesc')}</div>
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
