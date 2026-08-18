import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-4 text-center">
      <span className="font-display text-6xl font-bold text-ink/15">404</span>
      <h1 className="font-display text-xl font-semibold text-ink">Page not found</h1>
      <p className="text-sm text-ink/50">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="btn-primary mt-3">Back to dashboard</Link>
    </div>
  );
}
