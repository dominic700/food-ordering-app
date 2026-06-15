import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { getDashboard } from '../../api/cafe.js';
import { getPendingOrders, getOrderHistory } from '../../api/orders.js';
import BottomNav from '../../components/BottomNav.jsx';
import Spinner from '../../components/Spinner.jsx';

// Greeting based on time of day
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning! 👋';
  if (h < 17) return 'Good afternoon! 👋';
  return 'Good evening! 👋';
}

// Status badge styles matching the design
const STATUS_STYLE = {
  pending:   { bg: '#fff3e0', color: '#f97316', label: 'Preparing' },
  approved:  { bg: '#e8f5e9', color: '#22c55e', label: 'Ready' },
  cancelled: { bg: '#ffeaea', color: '#e63946', label: 'Cancelled' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const account = useStore(s => s.account);

  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [dashData, historyData] = await Promise.all([
        getDashboard(),
        getOrderHistory(),
      ]);
      setStats(dashData);
      setRecentOrders(historyData.slice(0, 3));

      // Build top selling items from history
      const itemMap = {};
      historyData.forEach(order => {
        order.items?.forEach(item => {
          if (!itemMap[item.name]) itemMap[item.name] = 0;
          itemMap[item.name] += item.quantity;
        });
      });
      const sorted = Object.entries(itemMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, sales]) => ({ name, sales }));
      setTopItems(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <Spinner fullPage label="Loading dashboard..." />;

  const cafeName = account?.cafe_name || 'Your Cafe';

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <button className="header-icon">☰</button>
        <div style={{ flex: 1, color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: 16 }}>
          {cafeName} ▾
        </div>
        <button className="header-icon" style={{ position: 'relative' }}>
          🔔
          <span className="header-badge">{parseInt(stats?.pending_orders || 0) + parseInt(stats?.pending_registrations || 0)}</span>
        </button>
      </div>

      {/* Greeting */}
      <div style={{ background: '#fff', padding: '20px 16px 16px' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{getGreeting()}</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4 }}>Here's what's happening today.</div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Today's Overview */}
        <div className="section-title" style={{ marginBottom: 12 }}>Today's Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ffeaea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛍️</div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Today's Orders</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)' }}>{stats?.approved_orders_30d || 0}</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🕐</div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Pending Orders</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f97316' }}>{stats?.pending_orders || 0}</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✅</div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Completed Orders</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#22c55e' }}>{stats?.approved_orders_30d || 0}</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ffeaea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💰</div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Today's Revenue</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>{parseFloat(stats?.revenue_30d || 0).toFixed(0)} ETB</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div className="section-title">Recent Orders</div>
          <div className="section-link" onClick={() => navigate('/cafe-home/orders')}>View All</div>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24, textAlign: 'center', padding: '16px 0' }}>No orders yet today</div>
        ) : (
          <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
            {recentOrders.map((order, i) => {
              const s = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
              return (
                <div key={order.id} style={{ padding: '12px 14px', borderBottom: i < recentOrders.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700 }}>#{order.id?.slice(0, 6)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {order.items?.slice(0, 2).map((item, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text2)', marginBottom: 2 }}>
                      <span>{item.name}</span><span>x{item.quantity}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <div style={{ fontWeight: 700, color: 'var(--red)' }}>{parseFloat(order.total).toFixed(2)} ETB</div>
                    <span style={{ background: s.bg, color: s.color, borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '3px 10px' }}>{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Top Selling Items */}
        {topItems.length > 0 && (
          <>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div className="section-title">Top Selling Items</div>
              <div className="section-link" onClick={() => navigate('/cafe-home/menu')}>View All</div>
            </div>
            <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
              {topItems.map((item, i) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < topItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 36, height: 36, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍽️</div>
                  <div style={{ color: 'var(--text2)', fontWeight: 700, fontSize: 14 }}>{i + 1}</div>
                  <div style={{ flex: 1, fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{item.sales} Sales</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="cafe-owner" active="dashboard" />
    </div>
  );
}
