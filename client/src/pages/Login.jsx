import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign you in.');
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
          <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
          <p className="text-sm text-ink/50">Sign in to keep your team moving.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && <p className="rounded-lg bg-coral-500/10 px-3 py-2 text-sm text-coral-500">{error}</p>}
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input-field"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label">Password</label>
              <Link to="/forgot-password" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="input-field"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink/50">
          New to TeamTask?{' '}
          <Link to="/register" className="font-semibold text-teal-600 hover:text-teal-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
