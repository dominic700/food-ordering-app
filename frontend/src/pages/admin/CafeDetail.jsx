import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCafeDetail, toggleCafe, updateCafe } from '../../api/admin.js';
import AdminBottomNav from '../../components/AdminBottomNav.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

export default function CafeDetail() {
  const { cafeId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingFee, setEditingFee] = useState(false);
  const [newFee, setNewFee] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const d = await getCafeDetail(cafeId);
      setData(d);
      setNewFee(d.cafe.service_fee?.toString() || '0');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [cafeId]);

  async function handleToggle() {
    try {
      await toggleCafe(cafeId);
      telegram.haptic();
      await load();
    } catch (err) {
      telegram.alert(err.message);
    }
  }

  async function handleSaveFee() {
    const fee = parseFloat(newFee);
    if (isNaN(fee) || fee < 0) return telegram.alert('Enter a valid service fee.');
    setSaving(true);
    try {
      await updateCafe(cafeId, { service_fee: fee });
      telegram.haptic('success');
      setEditingFee(false);
      await load();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner fullPage label="Loading cafe..." />;
  if (!data) return <div className="empty"><div className="empty-title">Cafe not found</div></div>;

  const { cafe, orders, stats } = data;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/admin')}>‹</button>
        <div className="header-title">{cafe.name}</div>
        <button className="header-icon">🔔</button>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>

        {/* Cafe info card */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{cafe.name}</div>
              {cafe.address && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>📍 {cafe.address}</div>}
              {cafe.phone && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>📞 {cafe.phone}</div>}
              <div style={{ marginTop: 8 }}>
                <span style={{
                  background: cafe.is_active ? '#e8f5e9' : '#fff3e0',
                  color: cafe.is_active ? '#22c55e' : '#f97316',
                  borderRadius: 12, fontSize: 12, fontWeight: 700, padding: '3px 12px',
                }}>
                  {cafe.is_active ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <button
              className="btn btn-sm"
              style={{
                background: cafe.is_active ? '#fff3e0' : '#e8f5e9',
                color: cafe.is_active ? '#f97316' : '#22c55e',
                border: '1.5px solid currentColor',
                flexShrink: 0,
              }}
              onClick={handleToggle}
            >
              {cafe.is_active ? '⏸ Deactivate' : '▶ Activate'}
            </button>
          </div>

          {/* Owner info */}
          {cafe.owner_name && (
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Owner</div>
              <div style={{ fontWeight: 600 }}>{cafe.owner_name}</div>
              {cafe.owner_phone && <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {cafe.owner_phone}</div>}
              {cafe.owner_telegram_id && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Telegram ID: {cafe.owner_telegram_id}</div>}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Customers', value: stats?.customer_count || 0, icon: '👥' },
            { label: 'Total Orders', value: stats?.total_orders || 0, icon: '📋' },
            { label: 'Revenue', value: `${parseFloat(stats?.total_revenue || 0).toFixed(0)} ETB`, icon: '💰' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Service fee editor */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingFee ? 12 : 0 }}>
            <div>
              <div style={{ fontWeight: 700 }}>💰 Service Fee</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Added per item per unit</div>
            </div>
            {!editingFee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--red)' }}>{parseFloat(cafe.service_fee || 0).toFixed(2)} ETB</div>
                <button className="btn btn-outline btn-sm" onClick={() => setEditingFee(true)}>Edit</button>
              </div>
            ) : null}
          </div>
          {editingFee && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                style={{ paddingLeft: 14, flex: 1, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                type="number" min="0" placeholder="0.00"
                value={newFee}
                onChange={e => setNewFee(e.target.value)}
                autoFocus
              />
              <button className="btn btn-red" style={{ width: 'auto', padding: '13px 16px', flexShrink: 0 }} onClick={handleSaveFee} disabled={saving}>
                {saving ? '...' : 'Save'}
              </button>
              <button className="btn btn-outline" style={{ width: 'auto', padding: '13px 16px', flexShrink: 0 }} onClick={() => setEditingFee(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Order history last 30 days */}
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div className="section-title" style={{ fontSize: 16 }}>Orders — Last 30 Days</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{orders?.length || 0} orders</div>
        </div>

        {!orders?.length ? (
          <div className="empty" style={{ padding: '24px 0' }}>
            <div className="empty-icon">📋</div>
            <div className="empty-title">No orders yet</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {orders.map((order, i) => (
              <div key={order.id} style={{ padding: '12px 14px', borderBottom: i < orders.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{order.customer_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {new Date(order.created_at).toLocaleDateString()} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--red)' }}>{parseFloat(order.total).toFixed(0)} ETB</div>
                    <span style={{
                      background: order.status === 'approved' ? '#e8f5e9' : order.status === 'cancelled' ? '#ffeaea' : '#fff3e0',
                      color: order.status === 'approved' ? '#22c55e' : order.status === 'cancelled' ? 'var(--red)' : '#f97316',
                      borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    }}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminBottomNav active="cafes" />
    </div>
  );
}
