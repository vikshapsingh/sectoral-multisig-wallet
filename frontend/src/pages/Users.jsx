import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AppLayout } from '../components/layout/AppLayout';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorBanner } from '../components/common/EmptyState';
import { AddressPill } from '../components/common/AddressPill';
import { useAuth } from '../hooks/useAuth';

const ROLES = ['ADMIN', 'APPROVER', 'AUDITOR'];

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { users: list } = await api.get('/users');
      setUsers(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (id, role) => {
    setSavingId(id);
    setError(null);
    try {
      const { user: updated } = await api.patch(`/users/${id}/role`, { role });
      setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (id, isActive) => {
    setSavingId(id);
    setError(null);
    try {
      const { user: updated } = await api.patch(`/users/${id}`, { isActive: !isActive });
      setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AppLayout>
      <h1 className="text-xl font-semibold mb-1">Users</h1>
      <p className="text-ink-400 text-sm mb-6">
        Assign roles and manage account access. A user's role only governs what they can do in this
        app — actual approval power still requires their address to be a wallet owner on-chain.
      </p>

      {loading && <LoadingSpinner label="Loading users…" />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-900 text-ink-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Wallet address</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-ink-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <AddressPill address={u.walletAddress} />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="input py-1.5 text-xs w-32"
                      value={u.role}
                      disabled={savingId === u.id || u.id === currentUser.id}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.isActive ? 'text-confirm-500' : 'text-alert-500'}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActive(u.id, u.isActive)}
                      disabled={savingId === u.id || u.id === currentUser.id}
                      className="btn-secondary text-xs px-2.5 py-1.5"
                    >
                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
