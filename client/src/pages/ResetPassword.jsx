import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { resetPassword } from '../services/auth';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const data = await resetPassword(token, password);
      localStorage.setItem('teamtask_token', data.token);
      localStorage.setItem('teamtask_user', JSON.stringify(data.user));
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink font-display text-lg font-bold text-teal-400">
            T
          </span>
          <h1 className="font-display text-2xl font-bold text-ink">Set a new password</h1>
        </div>

        {done ? (
          <div className="card p-6 text-center text-sm text-ink/70">Password updated. Taking you to your dashboard…</div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4 p-6">
            {error && <p className="rounded-lg bg-coral-500/10 px-3 py-2 text-sm text-coral-500">{error}</p>}
            <div>
              <label className="label">New password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-ink/50">
          <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
