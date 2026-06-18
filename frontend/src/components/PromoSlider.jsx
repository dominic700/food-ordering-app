import { useState, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

// Converts a relative URL like /uploads/promos/x.jpg
// to a full URL using the backend base
function getImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
}

// slides: array from backend promotions table
//   { id, image_url, title, is_active }
// fallbackSlides: shown when no promos exist in DB
//   [{ badge, title, desc, emoji }]
export default function PromoSlider({ slides = [], fallbackSlides = [] }) {
  const [current, setCurrent] = useState(0);

  const hasRealSlides = slides.length > 0;
  const displaySlides = hasRealSlides ? slides : fallbackSlides;
  const total = displaySlides.length;

  // Auto slide every 10 seconds
  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % total);
    }, 10000);
    return () => clearInterval(timer);
  }, [total]);

  // Reset to first slide when slides change
  useEffect(() => {
    setCurrent(0);
  }, [slides.length]);

  if (total === 0) return null;

  return (
    <div style={{
      margin: '0 16px 20px',
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
      background: '#1a1a1a',
    }}>

      {/* Slides */}
      <div style={{
        display: 'flex',
        transition: 'transform 0.5s ease',
        transform: `translateX(-${current * 100}%)`,
      }}>
        {displaySlides.map((slide, i) => (
          <div
            key={slide.id || i}
            style={{ minWidth: '100%', position: 'relative' }}
          >
            {/* Real image slide */}
            {hasRealSlides && slide.image_url ? (
              <div style={{ position: 'relative', height: 180 }}>
                <img
                  src={getImageUrl(slide.image_url)}
                  alt={slide.title || `Promo ${i + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                {/* Dark overlay for text readability */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 100%)',
                }} />
                {/* Title overlay */}
                {slide.title && (
                  <div style={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    right: 16,
                  }}>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#fff',
                      textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                    }}>
                      {slide.title}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback text slide (no real image) */
              <div style={{
                padding: '24px 20px',
                minHeight: 170,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #1a1a1a 60%, #2d1a1a)',
              }}>
                <div>
                  {slide.badge && (
                    <div style={{
                      background: 'var(--red)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 4,
                      display: 'inline-block',
                      marginBottom: 8,
                      letterSpacing: 0.5,
                    }}>
                      {slide.badge}
                    </div>
                  )}
                  <div style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: '#fff',
                    lineHeight: 1.2,
                    marginBottom: 4,
                  }}>
                    {slide.title}
                  </div>
                  {slide.desc && (
                    <div style={{ fontSize: 12, color: '#aaa', marginBottom: 14 }}>
                      {slide.desc}
                    </div>
                  )}
                </div>
                <div style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3d1a1a, #5a2020)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  flexShrink: 0,
                  marginLeft: 12,
                }}>
                  {slide.emoji || '🍔'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          padding: '10px',
          background: '#1a1a1a',
        }}>
          {displaySlides.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 20 : 8,
                height: 8,
                borderRadius: i === current ? 4 : '50%',
                background: i === current ? 'var(--red)' : '#555',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* Slide counter */}
      {total > 1 && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 12,
          background: 'rgba(0,0,0,0.5)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 10,
        }}>
          {current + 1} / {total}
        </div>
      )}
    </div>
  );
}
