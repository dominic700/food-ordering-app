// Cafe grid card for the Home / Favorites screens.
// No real images — uses a colored tile + emoji as a placeholder,
// picked deterministically from the cafe name so it stays consistent.
import useLanguage from '../hooks/useLanguage.js';

const EMOJIS = ['☕', '🍔', '🍕', '🍜', '🥗', '🍰', '🍣', '🥪', '🍩', '🌮'];
const COLORS = ['#fde2e2', '#e2f0fd', '#e2fde7', '#fdf6e2', '#f0e2fd', '#fde2f6'];

function hashIndex(str, mod) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % mod;
  return Math.abs(h) % mod;
}

export default function CafeCard({ cafe, isFavorite, onToggleFavorite, onClick }) {
  const { t } = useLanguage();
  const emoji = EMOJIS[hashIndex(cafe.name || '', EMOJIS.length)];
  const bg = COLORS[hashIndex((cafe.name || '') + 'x', COLORS.length)];

  return (
    <div className="cafe-card" onClick={onClick}>
      <div className="cafe-card-img" style={{ background: bg }}>
        {emoji}
        {onToggleFavorite && (
          <button
            className="cafe-heart"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(cafe.id); }}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      <div className="cafe-card-info">
        <div className="cafe-card-name">{cafe.name}</div>
        <div className="cafe-card-meta">
          {cafe.address
            ? <span>📍 {cafe.address}</span>
            : <span>{t('feePrefix')}: {parseFloat(cafe.service_fee || 0).toFixed(0)} {t('etb')}</span>}
        </div>
      </div>
    </div>
  );
}
