import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ErrorBanner } from '../components/common/EmptyState';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-3 w-3 rounded-full bg-signal-500" />
          <h1 className="text-xl font-semibold">Sectorial Wallet</h1>
          <p className="text-sm text-ink-400 mt-1">Sign in to review or approve transactions.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <ErrorBanner message={error} />

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-ink-400 text-center mt-4">
          No account yet?{' '}
          <Link to="/register" className="text-signal-400 hover:text-signal-300">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
