import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { AppLayout } from '../components/layout/AppLayout';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorBanner } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatTokenAmount, functionLabel } from '../utils/format';

function Card({ label, value, hint }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-ink-400">{label}</p>
      <p className="text-2xl font-semibold mt-1 text-ink-100">{value}</p>
      {hint && <p className="text-xs text-ink-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [walletInfo, setWalletInfo] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [wallet, token, txs] = await Promise.all([
          api.get('/wallet/info'),
          api.get('/wallet/token'),
          api.get('/transactions'),
        ]);
        if (cancelled) return;
        setWalletInfo(wallet);
        setTokenInfo(token);
        setTransactions(txs.transactions);
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

  const pending = transactions.filter((t) => t.status === 'PENDING' || t.status === 'APPROVED');
  const executed = transactions.filter((t) => t.status === 'EXECUTED');
  const recent = transactions.slice(0, 5);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="text-ink-400 text-sm mt-1">
          Here's the current state of the multisig wallet and its sectorial stablecoin.
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading wallet state…" />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card
              label="Approval threshold"
              value={walletInfo ? `${walletInfo.threshold} of ${walletInfo.owners.length}` : '—'}
              hint="Owners required per transaction"
            />
            <Card label="Pending / approved" value={pending.length} hint="Awaiting execution" />
            <Card label="Executed" value={executed.length} hint="Completed on-chain" />
            <Card
              label={`${tokenInfo?.symbol || 'Token'} supply`}
              value={tokenInfo ? formatTokenAmount(tokenInfo.totalSupply, tokenInfo.decimals) : '—'}
              hint={tokenInfo ? `Sector: ${tokenInfo.sector}` : ''}
            />
          </div>

          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800">
              <h2 className="font-medium">Recent transactions</h2>
              <Link to="/transactions" className="text-sm text-signal-400 hover:text-signal-300">
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-ink-400 px-5 py-6">No transactions have been proposed yet.</p>
            ) : (
              <ul className="divide-y divide-ink-800">
                {recent.map((tx) => (
                  <li key={tx.txIndex} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{functionLabel(tx.functionName)}</p>
                      <p className="text-xs text-ink-500 mt-0.5">
                        {tx.numConfirmations} of {tx.numConfirmationsRequired} confirmations
                      </p>
                    </div>
                    <StatusBadge status={tx.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
