// Simple loading spinner.
// fullPage: centers it in a tall container with an optional label
export default function Spinner({ fullPage, label }) {
  if (fullPage) {
    return (
      <div className="loading-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 24 }}>
        <img
          src="/logo-watermark.png"
          alt="Poly Fuka"
          style={{
            width: 160,
            height: 160,
            objectFit: 'contain',
            animation: 'pulse-logo 1.8s ease-in-out infinite',
          }}
        />
        <div className="spinner" />
        {label && <span style={{ fontSize: 14, color: 'var(--text2)', letterSpacing: 1 }}>{label}</span>}
      </div>
    );
  }
  return <div className="spinner" />;
}
