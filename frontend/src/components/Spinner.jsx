// Simple loading spinner.
// fullPage: centers it in a tall container with an optional label
export default function Spinner({ fullPage, label }) {
  if (fullPage) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        {label && <span>{label}</span>}
      </div>
    );
  }
  return <div className="spinner" />;
}
