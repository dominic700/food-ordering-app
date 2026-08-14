// Simple loading spinner.
// fullPage: centers it in a tall container with an optional label
export default function Spinner({ fullPage, label }) {
  if (fullPage) {
    return (
      <div className="loading-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
        <div className="spinner" />
        {label && <span style={{ fontSize: 14, color: 'var(--text2)' }}>{label}</span>}
      </div>
    );
  }
  return <div className="spinner" />;
}
