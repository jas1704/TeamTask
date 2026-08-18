import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notifications';
import { useSocket } from '../context/SocketContext';

const ICONS = {
  'task-assigned': '→',
  'task-completed': '✓',
  'new-comment': '💬',
  'project-invite': '★',
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  const load = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent fail — notifications are non-critical
    }
  };

  // Initial load on mount, then the socket keeps this in sync live. A slow
  // 90s poll stays as a safety net in case a socket event is ever missed
  // (a dropped connection during a brief reconnect window, for example).
  useEffect(() => {
    load();
    const interval = setInterval(load, 90000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNew = ({ notification, unreadCount: count }) => {
      setNotifications((n) => [notification, ...n].slice(0, 50));
      setUnreadCount(count);
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [socket]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((o) => !o);
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    load();
  };

  const handleClickOne = async (n) => {
    if (!n.read) {
      await markNotificationRead(n._id);
      load();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="btn-ghost relative !px-2.5"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl2 border border-line bg-white shadow-panel">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h4 className="font-display text-sm font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={handleReadAll} className="text-xs font-medium text-teal-600 hover:text-teal-700">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink/40">You're all caught up.</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n._id}
                  to={n.project ? `/projects/${n.project._id}` : '#'}
                  onClick={() => handleClickOne(n)}
                  className={`flex gap-3 border-b border-line/60 px-4 py-3 text-sm transition hover:bg-slate-50 ${
                    !n.read ? 'bg-teal-50/50' : ''
                  }`}
                >
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs">
                    {ICONS[n.type] || '•'}
                  </span>
                  <span className="flex-1">
                    <span className="block text-ink/80">{n.message}</span>
                    <span className="mt-0.5 block text-xs text-ink/40">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-teal-500" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
