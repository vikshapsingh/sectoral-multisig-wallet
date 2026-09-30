import { Fragment, useEffect, useState } from 'react';
import { api } from '../services/api';
import { AppLayout } from '../components/layout/AppLayout';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorBanner, EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { AddressPill } from '../components/common/AddressPill';
import { formatDateTime, functionLabel } from '../utils/format';

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'EXECUTED'];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [chainResult, setChainResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = filter === 'ALL' ? '' : `?status=${filter}`;
      const { transactions: txs } = await api.get(`/transactions${query}`);
      setTransactions(txs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const verifyOnChain = async (txIndex) => {
    setVerifying(txIndex);
    setChainResult(null);
    try {
      const { transaction } = await api.get(`/transactions/${txIndex}/chain-status`);
      setChainResult({ txIndex, transaction });
    } catch (err) {
      setChainResult({ txIndex, error: err.message });
    } finally {
      setVerifying(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Transactions</h1>
          <p className="text-ink-400 text-sm mt-1">
            Cached from the wallet's on-chain history. Use "Verify on chain" to read a transaction
            directly from the contract.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f
                ? 'bg-signal-500 text-ink-950 border-signal-500'
                : 'border-ink-700 text-ink-300 hover:border-ink-500'
            }`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner label="Loading transactions…" />}
      <ErrorBanner message={error} />

      {!loading && !error && transactions.length === 0 && (
        <EmptyState title="No transactions" description="Nothing has been proposed to the wallet yet." />
      )}

      {!loading && !error && transactions.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-900 text-ink-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Confirmations</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {transactions.map((tx) => (
                <Fragment key={tx.txIndex}>
                  <tr>
                    <td className="px-4 py-3 text-ink-400 font-mono">{tx.txIndex}</td>
                    <td className="px-4 py-3">{functionLabel(tx.functionName)}</td>
                    <td className="px-4 py-3">
                      <AddressPill address={tx.to} />
                    </td>
                    <td className="px-4 py-3">
                      {tx.numConfirmations} / {tx.numConfirmationsRequired}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-400">{formatDateTime(tx.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => verifyOnChain(tx.txIndex)}
                        disabled={verifying === tx.txIndex}
                        className="btn-secondary text-xs px-2.5 py-1.5"
                      >
                        {verifying === tx.txIndex ? 'Reading…' : 'Verify on chain'}
                      </button>
                    </td>
                  </tr>
                  {chainResult?.txIndex === tx.txIndex && (
                    <tr>
                      <td colSpan={7} className="px-4 pb-4">
                        {chainResult.error ? (
                          <ErrorBanner message={chainResult.error} />
                        ) : (
                          <pre className="bg-ink-950 border border-ink-700 rounded-md p-3 text-xs text-ink-300 overflow-x-auto">
                            {JSON.stringify(chainResult.transaction, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
