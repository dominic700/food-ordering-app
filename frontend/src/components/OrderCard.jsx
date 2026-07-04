import StatusBadge from './StatusBadge.jsx';
import { FiAlertTriangle, FiDollarSign, FiX, FiCheck } from 'react-icons/fi';
import { LuWallet, LuLandmark } from 'react-icons/lu';
import useLanguage from '../hooks/useLanguage.js';

export default function OrderCard({ order, showCustomer, onApprove, onCancel }) {
  const { t } = useLanguage();
  const date    = new Date(order.created_at);
  const shortId = order.id?.slice(0, 8);
  const isCash  = order.payment_method === 'cash';

  // Payment label
  let paymentIcon = <LuWallet size={13} />;
  let paymentLabel = t('walletCreditPayment');
  if (order.payment_method === 'cash') {
    paymentIcon = <FiDollarSign size={13} />;
    paymentLabel = t('cashPaymentLabel');
  } else if (order.payment_method === 'transfer') {
    paymentIcon = <LuLandmark size={13} />;
    paymentLabel = `${t('transfer')} (${order.transfer_provider?.replace('_', ' ') || ''})`;
  } else if (parseFloat(order.paid_from_credit) > 0) {
    paymentIcon = <LuWallet size={13} />;
    paymentLabel = t('walletPlusCreditPayment');
  }

  return (
    <div className="order-card">

      {/* Cash warning banner */}
      {isCash && (
        <div style={{
          background: '#fff3e0',
          borderBottom: '1px solid #fed7aa',
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 700,
          color: '#c2410c',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <FiAlertTriangle size={14} />
          {t('cashOrderPrefix')} {parseFloat(order.total).toFixed(2)} {t('etb')} {t('cashOrderSuffix')}
        </div>
      )}

      {/* Header */}
      <div className="order-card-header">
        <div className="order-card-info">
          <div className="order-cafe-name">
            {showCustomer
              ? (order.customer_name || t('customerFallback'))
              : `Order #${shortId}`}
          </div>
          <div className="order-meta">
            {showCustomer && `#${shortId} • `}
            {date.toLocaleDateString()} •{' '}
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <StatusBadge status={order.status} />
          <div className="order-total">{parseFloat(order.total).toFixed(2)} {t('etb')}</div>
          {parseFloat(order.discount_amount || 0) > 0 && (
            <div style={{ fontSize: 11, color: 'var(--green)' }}>
              −{parseFloat(order.discount_amount).toFixed(2)} {t('discountSuffix')}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="order-items">
        {order.items?.map((item, i) => (
          <div key={i} className="order-item-row">
            <span style={{ flex: 1 }}>{item.name}</span>
            <span style={{ color: 'var(--text2)' }}>x{item.quantity}</span>
            <span style={{ fontWeight: 700 }}>
              {parseFloat(item.item_total).toFixed(2)} {t('etb')}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="order-footer">
        <div className="order-payment" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {paymentIcon}
          {paymentLabel}
        </div>

        {/* Approve / Cancel buttons for cafe owner */}
        {order.status === 'pending' && onApprove && onCancel && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => onCancel(order.id)}
            >
              <FiX size={14} /> {t('cancel')}
            </button>
            <button
              className="btn btn-red btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => onApprove(order.id)}
            >
              <FiCheck size={14} /> {isCash ? t('acceptCashOrder') : t('acceptOrder')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
