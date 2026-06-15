import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRegistrations, approveRegistration, rejectRegistration } from '../../api/cafe.js';
import BottomNav from '../../components/BottomNav.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

export default function Registrations() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

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

  useEffect(() => { load(); }, [load]);

  async function handleApprove(pcaId) {
    setActionId(pcaId);
    try {
      await approveRegistration(pcaId);
      telegram.haptic('success');
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

  const COLORS = ['#e63946', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6'];
  function avatarColor(name) { return COLORS[(name?.charCodeAt(0) || 0) % COLORS.length]; }

  if (loading) return <Spinner fullPage label="Loading registrations..." />;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/cafe-home')}>‹</button>
        <div className="header-title">
          Registration Requests
          {registrations.length > 0 && (
            <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 12, fontSize: 11, padding: '2px 8px', marginLeft: 8 }}>
              {registrations.length}
            </span>
          )}
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {registrations.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📝</div>
            <div className="empty-title">No pending registrations</div>
            <div className="empty-desc">New customer registrations will appear here</div>
          </div>
        ) : (
          registrations.map(reg => {
            const busy = actionId === reg.id;
            return (
              <div key={reg.id} className="card" style={{ marginBottom: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div className="avatar avatar-md" style={{ background: avatarColor(reg.name) }}>
                    {getInitials(reg.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{reg.name || 'Unknown'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {reg.phone}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      Applied {new Date(reg.registered_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{ background: '#fff3e0', color: '#f97316', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '3px 10px' }}>
                    Pending
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1, fontSize: 14, padding: '10px' }}
                    onClick={() => handleReject(reg.id)}
                    disabled={busy}
                  >
                    ✕ Reject
                  </button>
                  <button
                    className="btn btn-red"
                    style={{ flex: 1, fontSize: 14, padding: '10px' }}
                    onClick={() => handleApprove(reg.id)}
                    disabled={busy}
                  >
                    {busy ? '...' : '✓ Approve'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="cafe-owner" active="dashboard" />
    </div>
  );
}
