import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications } from '../api/notifications.js';

// Shared bell icon button used in every portal's header.
// Polls unread count every 30s and navigates to the given
// notifications route on click.
//
// props:
//   to -> route to navigate to on click (e.g. '/notifications',
//         '/cafe-home/notifications', '/admin/notifications')
export default function NotificationBell({ to }) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await getNotifications();
        if (mounted) setUnread(data.unread_count || 0);
      } catch {
        // Silent — bell just won't show a badge if this fails
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <button
      className="header-icon"
      style={{ position: 'relative' }}
      onClick={() => navigate(to)}
    >
      🔔
      {unread > 0 && (
        <span className="header-badge">{unread > 9 ? '9+' : unread}</span>
      )}
    </button>
  );
}
