import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { getCafes } from '../../api/customer.js';
import BottomNav from '../../components/BottomNav.jsx';
import CafeCard from '../../components/CafeCard.jsx';
import Spinner from '../../components/Spinner.jsx';
import useLanguage from '../../hooks/useLanguage.js';

export default function Favorites() {
  const navigate = useNavigate();
  const { t }     = useLanguage();
  const favorites = useStore(s => s.favorites);
  const toggleFavorite = useStore(s => s.toggleFavorite);
  const setCurrentCafe = useStore(s => s.setCurrentCafe);
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCafes().then(data => setCafes(data.cafes)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const favCafes = cafes.filter(c => favorites.includes(c.id));

  function enterCafe(cafe) { setCurrentCafe(cafe); navigate(`/cafe/${cafe.id}/menu`); }

  if (loading) return <Spinner fullPage label={t('loading')} />;

  return (
    <div className="page">
      <div className="header">
        <div style={{width:36}} />
        <div className="header-title">{t('navFavorites')}</div>
        <div style={{width:36}} />
      </div>
      <div style={{padding:'16px 16px 0'}}>
        {favCafes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">♡</div>
            <div className="empty-title">{t('noFavorites')}</div>
            <div className="empty-desc">{t('noFavoritesDesc')}</div>
            <button className="btn btn-red" style={{maxWidth:200,margin:'16px auto 0'}} onClick={() => navigate('/')}>{t('browseCafes')}</button>
          </div>
        ) : (
          <div className="grid-3">
            {favCafes.map(cafe => (
              <CafeCard key={cafe.id} cafe={cafe} isFavorite={true} onToggleFavorite={toggleFavorite} onClick={() => enterCafe(cafe)} />
            ))}
          </div>
        )}
      </div>
      <BottomNav variant="customer-global" active="favorites" />
    </div>
  );
}
