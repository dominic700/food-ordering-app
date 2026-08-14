export default function Spinner({ fullPage, label }) {
  if (fullPage) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: '#ffffff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 28,
        zIndex: 9999,
      }}>
        <img
          src="/logo-watermark.png"
          alt="Poly Fuka"
          style={{ width: '75vw', maxWidth: 340, objectFit: 'contain' }}
        />
        <div className="spinner" />
        {label && (
          <span style={{ fontSize: 14, color: '#aaaaaa', letterSpacing: 0.5 }}>
            {label}
          </span>
        )}
      </div>
    );
  }
  return <div className="spinner" />;
}
