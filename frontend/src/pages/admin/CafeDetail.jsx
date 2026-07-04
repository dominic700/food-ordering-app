import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCafeDetail, toggleCafe, updateCafe, getFeeStats, restartFeeWeek } from '../../api/admin.js';
import AdminBottomNav from '../../components/AdminBottomNav.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';
import LangToggle from '../../components/LangToggle.jsx';
import useLanguage from '../../hooks/useLanguage.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import Spinner from '../../components/Spinner.jsx';
import useStore from '../../store/useStore.js';
import telegram from '../../telegram.js';

export default function CafeDetail() {
  const { cafeId } = useParams();
  const navigate   = useNavigate();
  const account    = useStore(s => s.account);
  const { t }      = useLanguage();

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [editingFee, setEditingFee] = useState(false);
  const [newFee, setNewFee]         = useState('');
  const [saving, setSaving]         = useState(false);
  const [feeStats, setFeeStats]     = useState(null);
  const [loadingFee, setLoadingFee] = useState(true);
  const [restarting, setRestarting] = useState(false);

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

  // ── Handlers — ALL declared before any early returns ─────────
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

  async function handleRestart() {
    setRestarting(true);
    try {
      await restartFeeWeek(cafeId, account?.name || 'admin');
      telegram.haptic('success');
      await loadFeeStats();
      telegram.alert('✅ Week restarted! Saved to history and reset to 0.');
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setRestarting(false);
    }
  }

  // ── Early returns AFTER all hooks and handlers ───────────────
  if (loading) return <Spinner fullPage label="Loading cafe..." />;
  if (!data)   return <div className="empty"><div className="empty-title">{t('cafeNotFound')}</div></div>;

  const { cafe, orders, stats } = data;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/admin')}>‹</button>
        <div className="header-title">{cafe.name}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <LangToggle />
          <NotificationBell to="/admin/notifications" />
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', paddingBottom: 100 }}>

        {/* Cafe info card */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{cafe.name}</div>
              {cafe.address && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>📍 {cafe.address}</div>}
              {cafe.phone  && <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {cafe.phone}</div>}
            </div>
            <button
              className="btn"
              style={{ width: 'auto', padding: '8px 14px', fontSize: 12, background: cafe.is_active ? '#e8f5e9' : '#ffeaea', color: cafe.is_active ? '#22c55e' : 'var(--red)', border: 'none' }}
              onClick={handleToggle}
            >
              {cafe.is_active ? t('active') : t('inactive')}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t('customersCountLabel')}</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{stats?.customer_count || 0}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t('ordersLabel')}</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{stats?.total_orders || 0}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t('revenueLabel')}</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{parseFloat(stats?.total_revenue || 0).toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* Owner info */}
        {cafe.owner_name && (
          <div className="card" style={{ marginBottom: 16, padding: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('cafeOwnerLabel')}</div>
            <div style={{ fontSize: 14 }}>{cafe.owner_name}</div>
            {cafe.owner_phone && <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {cafe.owner_phone}</div>}
          </div>
        )}

        {/* ── Weekly Fee Collection ────────────────────────────── */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t('weeklyItems')}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                {t('since')} {feeStats?.period_start
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
              {restarting ? '...' : t('restartWeek')}
            </button>
          </div>

          {loadingFee ? (
            <div className="spinner" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#ffeaea', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{t('itemsThisWeek')}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--red)' }}>
                  {parseInt(feeStats?.current_period?.total_items || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t('approvedItems')}</div>
              </div>
              <div style={{ background: '#fff3e0', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{t('feeOwed')}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#f97316' }}>
                  {parseFloat(feeStats?.current_period?.total_fee || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t('etb')}</div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, lineHeight: 1.5 }}>
            {t('restartDesc')}
          </div>
        </div>

        {/* ── Collection History (last 30 days) ───────────────── */}
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{t('collectionHistory')}</div>
        {!feeStats?.history?.length ? (
          <div className="card" style={{ padding: 16, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{t('noCollections')}</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            {feeStats.history.map((h, i) => (
              <div key={h.id} style={{
                padding: '12px 16px',
                borderBottom: i < feeStats.history.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {new Date(h.period_start).toLocaleDateString()} → {new Date(h.period_end).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {parseInt(h.total_items).toLocaleString()} {t('items')} · {parseFloat(h.total_revenue || 0).toFixed(0)} {t('etb')} {t('revenueLabel').toLowerCase()} · {h.collected_by}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {new Date(h.collected_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontWeight: 800, color: '#f97316', fontSize: 16 }}>
                    {parseFloat(h.total_fee).toFixed(2)} {t('etb')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Service fee editor */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>{t('serviceFeeEdit')}</div>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--red)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              onClick={() => setEditingFee(f => !f)}
            >
              {editingFee ? t('cancel') : t('edit')}
            </button>
          </div>
          {editingFee ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                style={{ paddingLeft: 14, flex: 1, fontWeight: 700 }}
                type="number" min="0" step="0.5"
                value={newFee}
                onChange={e => setNewFee(e.target.value)}
              />
              <button className="btn btn-red" style={{ width: 'auto', padding: '13px 20px', flexShrink: 0 }} onClick={handleSaveFee} disabled={saving}>
                {saving ? '...' : t('save')}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--red)' }}>
              {parseFloat(cafe.service_fee || 0).toFixed(2)} {t('etb')}
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text2)', marginLeft: 8 }}>{t('perItem')}</span>
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{t('recentOrdersAdmin')}</div>
        {!orders?.length ? (
          <div className="card" style={{ padding: 16, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{t('noOrdersAdmin')}</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            {orders.slice(0, 15).map((order, i) => (
              <div key={order.id} style={{
                padding: '12px 16px',
                borderBottom: i < Math.min(orders.length, 15) - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    #{order.id?.slice(0, 6)} · {order.customer_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {order.payment_method} · {new Date(order.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--red)' }}>{parseFloat(order.total).toFixed(0)} {t('etb')}</div>
                  <StatusBadge status={order.status} />
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
