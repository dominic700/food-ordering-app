import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCafeDetail, toggleCafe, updateCafe, getFeeStats, restartFeeWeek } from '../../api/admin.js';
import AdminBottomNav from '../../components/AdminBottomNav.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Spinner from '../../components/Spinner.jsx';
import useStore from '../../store/useStore.js';
import telegram from '../../telegram.js';

export default function CafeDetail() {
  const { cafeId } = useParams();
  const navigate   = useNavigate();
  const account    = useStore(s => s.account);

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editingFee, setEditingFee] = useState(false);
  const [newFee, setNewFee]     = useState('');
  const [saving, setSaving]     = useState(false);

  const [feeStats, setFeeStats]         = useState(null);
  const [loadingFee, setLoadingFee]     = useState(true);
  const [restarting, setRestarting]     = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getCafeDetail(cafeId);
      setData(d);
      setNewFee(d.cafe.service_fee?.toString() || '0');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  const loadFeeStats = useCallback(async () => {
    try {
      const f = await getFeeStats(cafeId);
      setFeeStats(f);
    } catch (err) {
      console.error('fee stats error:', err.message);
    } finally {
      setLoadingFee(false);
    }
  }, [cafeId]);

  useEffect(() => {
    load();
    loadFeeStats();
  }, [load, loadFeeStats]);

  async function handleToggle() {
    try {
      await toggleCafe(cafeId);
      telegram.haptic();
      await load();
    } catch (err) {
      telegram.alert(err.message);
    }
  }

  if (loading) return <Spinner fullPage label="Loading cafe..." />;
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

  async function handleRestart() {
    setRestarting(true);
    try {
      await restartFeeWeek(cafeId, account?.name || 'admin');
      telegram.haptic('success');
      await loadFeeStats();
      telegram.alert('✅ Week restarted! Item count and fee have been saved to history and reset to 0.');
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setRestarting(false);
    }
  }
  if (!data) return <div className="empty"><div className="empty-title">Cafe not found</div></div>;

  const { cafe, orders, stats } = data;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/admin')}>‹</button>
        <div className="header-title">{cafe.name}</div>
        <NotificationBell to="/admin/notifications" />
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

        {/* ── Weekly Fee Collection ─────────────────────────── */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>📦 This Week's Items & Fee</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                Since {feeStats?.period_start
                  ? new Date(feeStats.period_start).toLocaleDateString()
                  : '—'}
              </div>
            </div>
            <button
              className="btn btn-red"
              style={{ width: 'auto', padding: '10px 16px', fontSize: 13 }}
              onClick={handleRestart}
              disabled={restarting}
            >
              {restarting ? '...' : '↺ Restart Week'}
            </button>
          </div>

          {loadingFee ? (
            <div className="spinner" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#ffeaea', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Items This Week</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--red)' }}>
                  {parseInt(feeStats?.current_period?.total_items || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>approved items</div>
              </div>
              <div style={{ background: '#fff3e0', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Fee Owed</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#f97316' }}>
                  {parseFloat(feeStats?.current_period?.total_fee || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>ETB</div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, lineHeight: 1.5 }}>
            Press <strong>Restart Week</strong> after collecting the fee. This saves the current count to history and resets to 0 for the next week.
          </div>
        </div>

        {/* ── Collection History (last 30 days) ────────────────── */}
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>📋 Collection History (30 Days)</div>
        {!feeStats?.history?.length ? (
          <div className="card" style={{ padding: 16, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>No collections yet — press Restart Week after collecting your first fee.</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            {feeStats.history.map((h, i) => (
              <div
                key={h.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: i < feeStats.history.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {new Date(h.period_start).toLocaleDateString()} → {new Date(h.period_end).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {parseInt(h.total_items).toLocaleString()} items · collected by {h.collected_by}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {new Date(h.collected_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontWeight: 800, color: '#f97316', fontSize: 16 }}>
                    {parseFloat(h.total_fee).toFixed(2)} ETB
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
