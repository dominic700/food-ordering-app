// Menu item row used on the cafe Menu page.
// `item` comes from GET /api/menu/:cafeId, which already includes:
//   - price            -> wallet/credit price (after item discount)
//   - list_price       -> full price (what 'transfer' orders pay)
//   - discount_percent -> 0-100, shown as a badge + strikethrough
export default function MenuItemCard({ item, qty = 0, onAdd, onRemove }) {
  const price = parseFloat(item.price);
  const listPrice = parseFloat(item.list_price ?? item.price);
  const discount = parseFloat(item.discount_percent || 0);
  const hasDiscount = discount > 0 && listPrice > price;

  return (
    <div className="menu-item">
      <div className="food-thumb" style={{ background: 'var(--bg)' }}>🍽️</div>

      <div className="menu-item-info">
        <div className="menu-item-name">{item.name}</div>
        {item.description && <div className="menu-item-desc">{item.description}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="menu-item-price">{price.toFixed(2)} ETB</span>
          {hasDiscount && (
            <>
              <span style={{ fontSize: 12, color: 'var(--text3)', textDecoration: 'line-through' }}>
                {listPrice.toFixed(2)}
              </span>
              <span className="badge badge-approved">{discount}% off</span>
            </>
          )}
        </div>
      </div>

      {qty > 0 ? (
        <div className="qty-ctrl" style={{ marginTop: 0 }}>
          <button className="qty-btn" onClick={onRemove}>−</button>
          <span className="qty-num">{qty}</span>
          <button className="qty-btn" onClick={onAdd}>+</button>
        </div>
      ) : (
        <button className="add-btn" onClick={onAdd}>+ Add</button>
      )}
    </div>
  );
}
