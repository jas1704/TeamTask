import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// The socket URL is the API origin minus the /api suffix (Socket.IO has its
// own handshake path, separate from the REST routes).
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/**
 * One socket connection per logged-in session, created here and shared via
 * context so every component (Navbar's bell, the Kanban board, comment
 * threads) talks to the same connection instead of each opening its own.
 *
 * Lifecycle: connect once a JWT exists (right after login, or on app load if
 * a token is already in localStorage), disconnect on logout. Reconnection on
 * network hiccups is handled automatically by socket.io-client.
 */
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('teamtask_token');

    if (!user || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      return;
    }

    // Already connected for this session — don't open a second socket.
    if (socketRef.current) return;

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      setConnected(false);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      // Only tear down when the effect is cleaning up because the user
      // logged out (handled by the branch above) or the provider unmounts.
    };
  }, [user]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
