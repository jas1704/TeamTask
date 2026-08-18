import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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
          <h1 className="font-display text-2xl font-bold text-ink">Reset your password</h1>
          <p className="text-center text-sm text-ink/50">
            Enter your email and we'll send you a link to reset it.
          </p>
        </div>

        {sent ? (
          <div className="card space-y-4 p-6 text-center">
            <p className="text-sm text-ink/70">
              If an account exists for <span className="font-semibold text-ink">{email}</span>, a reset link is on
              its way. Check your inbox.
            </p>
            <Link to="/login" className="btn-primary block w-full text-center">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4 p-6">
            {error && <p className="rounded-lg bg-coral-500/10 px-3 py-2 text-sm text-coral-500">{error}</p>}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-ink/50">
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
