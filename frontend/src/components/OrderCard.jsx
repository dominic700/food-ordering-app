import StatusBadge from './StatusBadge.jsx';

// Order summary card — used on customer Orders page and cafe owner's
// New Orders / Order History pages.
//
// props:
//   order         -> order row from the backend (with .items array)
//   showCustomer  -> true on cafe owner views (shows customer_name)
//   onApprove(orderId), onCancel(orderId) -> shown only when
//     order.status === 'pending' and both handlers are provided
//     (i.e. cafe owner view)
export default function OrderCard({ order, showCustomer, onApprove, onCancel }) {
  const date = new Date(order.created_at);
  const shortId = order.id?.slice(0, 8);

  const paymentLabel = order.payment_method === 'transfer'
    ? `Transfer (${order.transfer_provider?.replace('_', ' ')})`
    : parseFloat(order.paid_from_credit) > 0
      ? 'Wallet + Credit'
      : 'Wallet Balance';

  return (
    <div className="order-card">
      <div className="order-card-header">
        <div className="order-card-info">
          <div className="order-cafe-name">
            {showCustomer ? (order.customer_name || 'Customer') : `Order #${shortId}`}
          </div>
          <div className="order-meta">
            {showCustomer && `#${shortId} • `}
            {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <StatusBadge status={order.status} />
          <div className="order-total">{parseFloat(order.total).toFixed(2)} ETB</div>
          {parseFloat(order.discount_amount) > 0 && (
            <div style={{ fontSize: 11, color: 'var(--green)' }}>
              −{parseFloat(order.discount_amount).toFixed(2)} discount
            </div>
          )}
        </div>
      </div>

      <div className="order-items">
        {order.items?.map((item, i) => (
          <div key={i} className="order-item-row">
            <span style={{ flex: 1 }}>{item.name}</span>
            <span style={{ color: 'var(--text2)' }}>x{item.quantity}</span>
            <span style={{ fontWeight: 700 }}>{parseFloat(item.item_total).toFixed(2)} ETB</span>
          </div>
        ))}
      </div>

      <div className="order-footer">
        <div className="order-payment">👛 {paymentLabel}</div>
        {order.status === 'pending' && onApprove && onCancel && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => onCancel(order.id)}>Cancel</button>
            <button className="btn btn-red btn-sm" onClick={() => onApprove(order.id)}>Approve</button>
          </div>
        )}
      </div>
    </div>
  );
}
