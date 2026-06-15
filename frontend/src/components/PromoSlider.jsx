import { useState } from 'react';

// slides: [{ badge, title, desc, cta, onClick, emoji }]
export default function PromoSlider({ slides }) {
  const [index, setIndex] = useState(0);
  if (!slides || slides.length === 0) return null;
  const slide = slides[Math.min(index, slides.length - 1)];

  return (
    <div className="promo-slider">
      <div className="promo-slide">
        <div>
          {slide.badge && <span className="promo-badge">{slide.badge}</span>}
          <div className="promo-title">{slide.title}</div>
          {slide.desc && <div className="promo-desc">{slide.desc}</div>}
          {slide.cta && (
            <button className="promo-btn" onClick={slide.onClick}>
              {slide.cta} <span>→</span>
            </button>
          )}
        </div>
        <div className="promo-food-placeholder">{slide.emoji || '🍔'}</div>
      </div>

      {slides.length > 1 && (
        <div className="promo-dots">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`promo-dot ${i === index ? 'active' : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
