export default function Spinner({ fullPage, label }) {
  if (fullPage) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        background: '#ffffff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 32, zIndex: 9999,
      }}>
        {/* Logo */}
        <img
          src="/logo-watermark.png"
          alt="Poly Fuka"
          style={{ width: '75vw', maxWidth: 320, objectFit: 'contain' }}
        />

        {/* Animated bar spinner */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 5, borderRadius: 4,
              background: '#E63946',
              animation: `bar-bounce 1s ease-in-out infinite`,
              animationDelay: `${i * 0.12}s`,
            }} />
          ))}
        </div>

        {label && (
          <span style={{ fontSize: 13, color: '#aaaaaa', letterSpacing: 1 }}>
            {label}
          </span>
        )}

        <style>{`
          @keyframes bar-bounce {
            0%, 100% { height: 10px; opacity: 0.4; }
            50%       { height: 32px; opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  /* Inline spinner — used inside pages */
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      border: '3px solid #f0f0f0',
      borderTop: '3px solid #E63946',
      animation: 'spin 0.8s linear infinite',
      margin: '12px auto',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
