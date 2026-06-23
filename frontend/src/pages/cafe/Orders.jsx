import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingOrders, getOrderHistory, approveOrder, cancelOrder } from '../../api/orders.js';
import BottomNav from '../../components/BottomNav.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

const TABS = [
  { key: 'new',       label: 'New',       status: 'pending'   },
  { key: 'preparing', label: 'Preparing', status: 'pending'   },
  { key: 'ready',     label: 'Ready',     status: 'approved'  },
  { key: 'completed', label: 'Completed', status: 'approved'  },
];

const STATUS_BADGE = {
  NEW:        { bg: 'var(--red)',    color: '#fff',           label: 'NEW' },
  PREPARING:  { bg: '#f97316',      color: '#fff',           label: 'PREPARING' },
  READY:      { bg: '#e8f5e9',      color: '#22c55e',        label: 'READY' },
  COMPLETED:  { bg: '#e8f5e9',      color: '#22c55e',        label: 'COMPLETED' },
};

export default function Orders() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('new');
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([getPendingOrders(), getOrderHistory()]);
      setPending(p);
      setHistory(h);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleApprove(orderId) {
    setActionId(orderId);
    try {
      await approveOrder(orderId);
      telegram.haptic('success');
      await load();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(orderId) {
    setActionId(orderId);
    try {
      await cancelOrder(orderId);
      telegram.haptic();
      await load();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setActionId(null);
    }
  }

  // Map tabs to orders
  const newOrders       = pending;
  const preparingOrders = pending; // same backend bucket — pending orders being worked on
  const readyOrders     = history.filter(o => o.status === 'approved');
  const completedOrders = history.filter(o => o.status === 'approved');

  const tabOrders = {
    new: newOrders,
    preparing: preparingOrders,
    ready: readyOrders,
    completed: completedOrders,
  };

  const displayed = tabOrders[tab] || [];

  function renderOrderCard(order) {
    const isNew = order.status === 'pending';
    const isPreparing = order.status === 'pending';
    const time = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const shortId = order.id?.slice(0, 6);
    const busy = actionId === order.id;

    let badge = STATUS_BADGE.COMPLETED;
    if (tab === 'new')       badge = STATUS_BADGE.NEW;
    if (tab === 'preparing') badge = STATUS_BADGE.PREPARING;
    if (tab === 'ready')     badge = STATUS_BADGE.READY;

    return (
      <div key={order.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
        {/* Order header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>#{shortId}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              {order.items?.reduce((s, i) => s + i.quantity, 0) || 0} items · {order.payment_method}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>{time}</span>
            <span style={{ background: badge.bg, color: badge.color, borderRadius: 6, fontSize: 11, fontWeight: 800, padding: '3px 10px' }}>{badge.label}</span>
          </div>
        </div>

        {/* Items — each with name, quantity, price */}
        {order.items?.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4, color: 'var(--text)' }}>
            <span>{item.name}</span>
            <div style={{ display: 'flex', gap: 24 }}>
              <span style={{ color: 'var(--text2)', fontWeight: 700 }}>×{item.quantity}</span>
              <span>{parseFloat(item.item_total).toFixed(0)} ETB</span>
            </div>
          </div>
        ))}

        {/* Total + item count summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>
              ({order.items?.reduce((s, i) => s + i.quantity, 0) || 0} items)
            </span>
          </div>
          <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: 16 }}>{parseFloat(order.total).toFixed(0)} ETB</span>
        </div>

        {/* Customer */}
        {order.customer_phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: 'var(--text2)' }}>
            <span>Customer</span>
          </div>
        )}
        {order.customer_phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <span>📞</span>
            <span>{order.customer_phone}</span>
          </div>
        )}

        {/* Action buttons */}
        {tab === 'new' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1, padding: '10px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => handleCancel(order.id)}
              disabled={busy}
            >
              ✕ Reject
            </button>
            <button
              className="btn btn-red"
              style={{ flex: 1, padding: '10px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => handleApprove(order.id)}
              disabled={busy}
            >
              {busy ? '...' : '✓ Accept'}
            </button>
          </div>
        )}

        {tab === 'preparing' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1, padding: '10px', fontSize: 14 }}
              onClick={() => handleCancel(order.id)}
              disabled={busy}
            >
              ✦ Mark Ready
            </button>
            <button
              style={{ flex: 1, padding: '10px', fontSize: 14, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
              onClick={() => handleApprove(order.id)}
              disabled={busy}
            >
              {busy ? '...' : '✓ Complete'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading) return <Spinner fullPage label="Loading orders..." />;

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <button className="header-icon">☰</button>
        <div className="header-title">Orders</div>
        <NotificationBell to="/cafe-home/notifications" />
      </div>

      {/* Status tabs */}
      <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => {
          const count = t.key === 'new' ? newOrders.length : null;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flexShrink: 0,
                padding: '7px 16px',
                borderRadius: 20,
                border: isActive ? 'none' : '1.5px solid var(--border)',
                background: isActive ? 'var(--red)' : 'transparent',
                color: isActive ? '#fff' : t.key === 'ready' ? 'var(--blue)' : t.key === 'completed' ? 'var(--green)' : 'var(--text)',
                fontFamily: 'var(--font)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {t.label}
              {count !== null && count > 0 && (
                <span style={{ background: isActive ? 'rgba(255,255,255,0.3)' : 'var(--red)', color: isActive ? '#fff' : '#fff', borderRadius: 10, fontSize: 11, fontWeight: 800, padding: '0px 6px' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {displayed.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No {TABS.find(t => t.key === tab)?.label.toLowerCase()} orders</div>
          </div>
        ) : (
          displayed.map(order => renderOrderCard(order))
        )}
      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="cafe-owner" active="orders" />
    </div>
  );
}
