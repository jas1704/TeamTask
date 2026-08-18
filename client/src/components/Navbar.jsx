import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-display text-sm font-bold text-teal-400">
            T
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-ink">TeamTask</span>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link to="/profile" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
            <Avatar user={user} size="sm" />
            <span className="hidden text-sm font-medium text-ink/80 sm:block">{user.name}</span>
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="btn-ghost"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
