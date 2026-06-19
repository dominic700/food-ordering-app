import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRegistrations, approveRegistration, rejectRegistration } from '../../api/cafe.js';
import BottomNav from '../../components/BottomNav.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

export default function Registrations() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [actionId, setActionId]           = useState(null);
  const [selected, setSelected]           = useState(null); // for detail sheet

  const load = useCallback(async () => {
    try {
      const data = await getRegistrations();
      setRegistrations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Poll every 20 seconds so new requests appear automatically
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleApprove(pcaId) {
    setActionId(pcaId);
    try {
      await approveRegistration(pcaId);
      telegram.haptic('success');
      setSelected(null);
      await load();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(pcaId) {
    setActionId(pcaId);
    try {
      await rejectRegistration(pcaId);
      telegram.haptic();
      setSelected(null);
      await load();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setActionId(null);
    }
  }

  function getInitials(name) {
    return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  const COLORS = ['#e63946','#3b82f6','#22c55e','#f97316','#8b5cf6'];
  function avatarColor(name) {
    return COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];
  }

  if (loading) return <Spinner fullPage label="Loading registrations..." />;

  return (
    <div className="page">

      {/* Header */}
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/cafe-home')}>‹</button>
        <div className="header-title">
          Registration Requests
          {registrations.length > 0 && (
            <span style={{
              background: 'var(--red)', color: '#fff',
              borderRadius: 12, fontSize: 11,
              padding: '2px 8px', marginLeft: 8,
            }}>
              {registrations.length}
            </span>
          )}
        </div>
        <button className="header-icon" onClick={load} title="Refresh">↻</button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {registrations.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📝</div>
            <div className="empty-title">No pending registrations</div>
            <div className="empty-desc">
              New customer registration requests will appear here automatically
            </div>
          </div>
        ) : (
          registrations.map(reg => (
            <div
              key={reg.id}
              className="card"
              style={{ marginBottom: 12, padding: 16, cursor: 'pointer' }}
              onClick={() => setSelected(reg)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Avatar */}
                <div
                  className="avatar avatar-md"
                  style={{ background: avatarColor(reg.name), flexShrink: 0 }}
                >
                  {getInitials(reg.name)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {reg.name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                    📞 {reg.phone}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    Applied {new Date(reg.registered_at).toLocaleDateString()} at{' '}
                    {new Date(reg.registered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Pending badge + chevron */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{
                    background: '#fff3e0', color: '#f97316',
                    borderRadius: 12, fontSize: 11, fontWeight: 700,
                    padding: '3px 10px',
                  }}>
                    Pending
                  </span>
                  <span style={{ color: 'var(--text3)', fontSize: 16 }}>›</span>
                </div>
              </div>

              {/* Quick action buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, fontSize: 14, padding: '10px' }}
                  onClick={e => { e.stopPropagation(); handleReject(reg.id); }}
                  disabled={actionId === reg.id}
                >
                  ✕ Reject
                </button>
                <button
                  className="btn btn-red"
                  style={{ flex: 1, fontSize: 14, padding: '10px' }}
                  onClick={e => { e.stopPropagation(); handleApprove(reg.id); }}
                  disabled={actionId === reg.id}
                >
                  {actionId === reg.id ? '...' : '✓ Approve'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="cafe-owner" active="dashboard" />

      {/* ── Upper bile detail sheet ─────────────────────────── */}
      {selected && (
        <div
          className="overlay"
          onClick={() => setSelected(null)}
        >
          <div
            className="sheet"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '85vh' }}
          >
            <div className="sheet-handle" />

            {/* Customer avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div
                className="avatar avatar-xl"
                style={{ background: avatarColor(selected.name) }}
              >
                {getInitials(selected.name)}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>
                  {selected.name || 'Unknown'}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 2 }}>
                  📞 {selected.phone}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                  Telegram ID: {selected.telegram_id}
                </div>
              </div>
            </div>

            {/* Registration info card */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: 12,
              padding: 14,
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Status</span>
                <span style={{
                  background: '#fff3e0', color: '#f97316',
                  borderRadius: 10, fontSize: 12, fontWeight: 700,
                  padding: '2px 10px',
                }}>
                  Pending
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Applied</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {new Date(selected.registered_at).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Time</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {new Date(selected.registered_at).toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* Info text */}
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 13,
              color: '#1e40af',
              marginBottom: 20,
              lineHeight: 1.6,
            }}>
              ℹ️ Approving this customer allows them to use wallet balance and credit payments at your cafe.
              They can already order with Cash or Transfer without registration.
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1, padding: '14px', fontSize: 15 }}
                onClick={() => handleReject(selected.id)}
                disabled={actionId === selected.id}
              >
                ✕ Reject
              </button>
              <button
                className="btn btn-red"
                style={{ flex: 1, padding: '14px', fontSize: 15 }}
                onClick={() => handleApprove(selected.id)}
                disabled={actionId === selected.id}
              >
                {actionId === selected.id ? 'Processing...' : '✓ Approve'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
