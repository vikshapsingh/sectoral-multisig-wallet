import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AppLayout } from '../components/layout/AppLayout';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorBanner, EmptyState } from '../components/common/EmptyState';
import { AddressPill } from '../components/common/AddressPill';
import { formatDateTime } from '../utils/format';

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { logs: entries } = await api.get('/audit');
        if (!cancelled) setLogs(entries);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppLayout>
      <h1 className="text-xl font-semibold mb-1">Audit log</h1>
      <p className="text-ink-400 text-sm mb-6">
        Every sensitive action, whether it happened in this app (like a login or role change) or on
        the blockchain itself (like a confirmation or execution). This view is read-only.
      </p>

      {loading && <LoadingSpinner label="Loading audit log…" />}
      <ErrorBanner message={error} />

      {!loading && !error && logs.length === 0 && (
        <EmptyState title="No audit entries yet" description="Actions will appear here as they happen." />
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-900 text-ink-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Tx hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="px-4 py-3 text-ink-400 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-3">
                    {log.actor ? (
                      <span>{log.actor.name}</span>
                    ) : log.actorAddress ? (
                      <AddressPill address={log.actorAddress} />
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-400 font-mono text-xs max-w-xs truncate">
                    {log.details && Object.keys(log.details).length > 0
                      ? JSON.stringify(log.details)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {log.blockchainTxHash ? <AddressPill address={log.blockchainTxHash} /> : '—'}
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
