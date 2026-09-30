import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ErrorBanner } from '../components/common/EmptyState';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', walletAddress: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        walletAddress: form.walletAddress || undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.details?.map((d) => d.msg).join(' ') || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-3 w-3 rounded-full bg-signal-500" />
          <h1 className="text-xl font-semibold">Create an account</h1>
          <p className="text-sm text-ink-400 mt-1">
            The first account created becomes the wallet administrator.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <ErrorBanner message={error} />

          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" required className="input" value={form.name} onChange={update('name')} />
          </div>

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={form.email}
              onChange={update('email')}
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
              minLength={8}
              className="input"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
            />
            <p className="text-xs text-ink-500 mt-1">At least 8 characters.</p>
          </div>

          <div>
            <label className="label" htmlFor="walletAddress">
              Wallet address (optional)
            </label>
            <input
              id="walletAddress"
              className="input font-mono text-sm"
              placeholder="0x…"
              value={form.walletAddress}
              onChange={update('walletAddress')}
            />
            <p className="text-xs text-ink-500 mt-1">
              Required later if you'll be an approver — an admin can also set this for you.
            </p>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-ink-400 text-center mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-signal-400 hover:text-signal-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
