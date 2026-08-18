import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

let idCounter = 0;

/**
 * App-wide toast stack driven entirely by socket events — this is the
 * "ambient awareness" layer: a quiet ping in the corner when a teammate does
 * something, without needing to re-fetch or refresh anything.
 *
 * Two event sources:
 *  - `activity:new`     → project activity (task moved, comment added, etc).
 *                          Suppressed for the actor's own actions, since they
 *                          already see the result on screen.
 *  - `notification:new` → personal notifications (assignments, invites).
 *                          Always shown, since these are addressed to you.
 */
export default function ToastLayer() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const pushToast = (toast) => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, ...toast }]);
    timers.current[id] = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
      delete timers.current[id];
    }, 4500);
  };

  useEffect(() => {
    if (!socket) return;

    const onActivity = ({ activity }) => {
      if (activity.actor?._id === user?._id) return;
      pushToast({ icon: '◈', tone: 'activity', title: activity.actor?.name || 'Someone', message: activity.message });
    };

    const onNotification = ({ notification }) => {
      pushToast({ icon: '🔔', tone: 'notification', title: 'Notification', message: notification.message });
    };

    socket.on('activity:new', onActivity);
    socket.on('notification:new', onNotification);
    return () => {
      socket.off('activity:new', onActivity);
      socket.off('notification:new', onNotification);
    };
  }, [socket, user]);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-xs flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-2.5 rounded-xl2 border border-line bg-white px-4 py-3 shadow-panel animate-[slideIn_.2s_ease-out]"
        >
          <span
            className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs ${
              t.tone === 'notification' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'
            }`}
          >
            {t.icon}
          </span>
          <p className="text-sm leading-snug text-ink/75">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
