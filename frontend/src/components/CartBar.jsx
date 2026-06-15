// Floating "View Cart" summary bar, shown while browsing the menu
// once the cart has items. Sits above the bottom nav.
export default function CartBar({ count, total, onClick }) {
  if (!count) return null;

  return (
    <div
      className="cart-bar"
      onClick={onClick}
      style={{ bottom: 'calc(var(--nav-height) + 12px)' }}
    >
      <div className="cart-bar-left">
        <span className="cart-bar-count">{count}</span>
        <span className="cart-bar-label">View Cart</span>
      </div>
      <span className="cart-bar-total">{total.toFixed(2)} ETB</span>
    </div>
  );
}
