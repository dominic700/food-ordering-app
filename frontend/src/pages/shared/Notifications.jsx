import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getNotifications, markAsRead, markAllAsRead } from '../../api/notifications.js';
import Spinner from '../../components/Spinner.jsx';

const TYPE_ICON = {
  new_order:              '🛍️',
  order_approved:         '✅',
  registration_request:   '📝',
  registration_approved:  '🎉',
  credit_application:     '✨',
  credit_approved:        '💳',
  credit_rejected:        '🚫',
  credit_limit_set:       '💳',
  deposit_verified:       '💰',
  promo_added:            '🖼️',
  cafe_created:           '☕',
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

// Shared notification history page, mounted at three different
// routes (/notifications, /cafe-home/notifications,
// /admin/notifications) — works identically everywhere since the
// backend scopes by telegram_id, not by role. The back button
// figures out where "home" is from the current path prefix.
export default function Notifications() {
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function backHome() {
    if (location.pathname.startsWith('/cafe-home')) navigate('/cafe-home');
    else if (location.pathname.startsWith('/admin')) navigate('/admin');
    else navigate('/');
  }

  async function handleTap(n) {
    if (!n.is_read) {
      try {
        await markAsRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      } catch (err) {
        console.error(err);
      }
    }
  }

  async function handleMarkAll() {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <Spinner fullPage label="Loading notifications..." />;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={backHome}>‹</button>
        <div className="header-title">Notifications</div>
        <div style={{ width: 36 }} />
      </div>

      {unreadCount > 0 && (
        <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleMarkAll}
            style={{ background: 'none', border: 'none', color: 'var(--red)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Mark all as read
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="empty" style={{ marginTop: 40 }}>
          <div className="empty-icon">🔔</div>
          <div className="empty-title">No notifications yet</div>
          <div className="empty-desc">You'll see updates about orders, registrations, and more here.</div>
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {notifications.map(n => (
            <div
              key={n.id}
              className={`notification-row ${!n.is_read ? 'unread' : ''}`}
              onClick={() => handleTap(n)}
            >
              <div className="notification-icon">{TYPE_ICON[n.type] || '🔔'}</div>
              <div className="notification-content">
                <div className="notification-title">{n.title}</div>
                {n.body && <div className="notification-body">{n.body}</div>}
                <div className="notification-time">{timeAgo(n.created_at)}</div>
              </div>
              {!n.is_read && <div className="notification-dot" />}
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 30 }} />
    </div>
  );
}
