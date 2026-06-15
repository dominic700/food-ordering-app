// Simple black header bar — back arrow, centered title, optional right icon
export default function Header({ title, onBack, right }) {
  return (
    <div className="header">
      {onBack ? (
        <button className="header-icon" onClick={onBack}>‹</button>
      ) : <div style={{ width: 36 }} />}
      <div className="header-title">{title}</div>
      {right || <div style={{ width: 36 }} />}
    </div>
  );
}
