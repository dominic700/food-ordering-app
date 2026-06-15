import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCafes } from '../../api/customer.js';
import useStore from '../../store/useStore.js';
import BottomNav from '../../components/BottomNav.jsx';
import CafeCard from '../../components/CafeCard.jsx';
import Header from '../../components/Header.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

export default function Favorites() {
  const navigate = useNavigate();
  const favorites = useStore(s => s.favorites);
  const toggleFavorite = useStore(s => s.toggleFavorite);
  const setCurrentCafe = useStore(s => s.setCurrentCafe);

  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    telegram.hideBackButton();
    getCafes()
      .then(d => setCafes(d.cafes || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const favCafes = cafes.filter(c => favorites.includes(c.id));

  function enterCafe(cafe) {
    setCurrentCafe(cafe);
    navigate(`/cafe/${cafe.id}/menu`);
  }

  if (loading) return <Spinner fullPage />;

  return (
    <div className="page">
      <Header title="Favorites" />

      <div style={{ padding: '16px' }}>
        {favCafes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🤍</div>
            <div className="empty-title">No favorites yet</div>
            <div className="empty-desc">Tap the heart on a cafe to save it here</div>
          </div>
        ) : (
          <div className="grid-3">
            {favCafes.map(cafe => (
              <CafeCard
                key={cafe.id}
                cafe={cafe}
                isFavorite
                onToggleFavorite={toggleFavorite}
                onClick={() => enterCafe(cafe)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav variant="customer-global" active="favorites" />
    </div>
  );
}
