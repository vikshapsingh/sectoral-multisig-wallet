import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useWallet } from '../hooks/useWallet';
import { AppLayout } from '../components/layout/AppLayout';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorBanner } from '../components/common/EmptyState';
import { AddressPill } from '../components/common/AddressPill';
import { formatTokenAmount } from '../utils/format';

export default function WalletPage() {
  const { address, isConnected, connect, readWalletContract, readTokenContract } = useWallet();
  const [walletInfo, setWalletInfo] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [myBalance, setMyBalance] = useState(null);
  const [isOwner, setIsOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [wallet, token] = await Promise.all([api.get('/wallet/info'), api.get('/wallet/token')]);
        if (cancelled) return;
        setWalletInfo(wallet);
        setTokenInfo(token);
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

  useEffect(() => {
    let cancelled = false;
    async function loadConnectedStatus() {
      if (!address || !readWalletContract || !readTokenContract) {
        setMyBalance(null);
        setIsOwner(null);
        return;
      }
      try {
        const [owner, balance] = await Promise.all([
          readWalletContract.isOwner(address),
          readTokenContract.balanceOf(address),
        ]);
        if (cancelled) return;
        setIsOwner(owner);
        setMyBalance(balance.toString());
      } catch {
        if (!cancelled) {
          setIsOwner(null);
          setMyBalance(null);
        }
      }
    }
    loadConnectedStatus();
    return () => {
      cancelled = true;
    };
  }, [address, readWalletContract, readTokenContract]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner label="Loading wallet…" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-xl font-semibold mb-1">Wallet</h1>
      <p className="text-ink-400 text-sm mb-6">
        The multisig wallet and the sectorial stablecoin it governs. All figures below are read directly
        from the chain.
      </p>

      <ErrorBanner message={error} />

      {!error && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="font-medium mb-4">Multisig wallet</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <dt className="text-ink-400">Address</dt>
                <dd>
                  <AddressPill address={walletInfo?.address} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400">Threshold</dt>
                <dd>
                  {walletInfo?.threshold} of {walletInfo?.owners.length} owners
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400">Transactions proposed</dt>
                <dd>{walletInfo?.transactionCount}</dd>
              </div>
            </dl>

            <p className="text-ink-400 text-sm mt-5 mb-2">Owners</p>
            <ul className="space-y-2">
              {walletInfo?.owners.map((owner) => (
                <li key={owner} className="flex items-center justify-between">
                  <AddressPill address={owner} />
                  {address?.toLowerCase() === owner.toLowerCase() && (
                    <span className="text-xs text-signal-400">you</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="font-medium mb-4">Sectorial stablecoin</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <dt className="text-ink-400">Address</dt>
                <dd>
                  <AddressPill address={tokenInfo?.address} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400">Name / symbol</dt>
                <dd>
                  {tokenInfo?.name} ({tokenInfo?.symbol})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400">Sector</dt>
                <dd>{tokenInfo?.sector}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400">Total supply</dt>
                <dd>
                  {formatTokenAmount(tokenInfo?.totalSupply, tokenInfo?.decimals)} {tokenInfo?.symbol}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400">Status</dt>
                <dd>{tokenInfo?.paused ? 'Paused' : 'Active'}</dd>
              </div>
            </dl>

            <div className="mt-5 pt-5 border-t border-ink-800">
              {!isConnected ? (
                <button onClick={connect} className="btn-secondary w-full">
                  Connect wallet to see your balance
                </button>
              ) : (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-400">Your balance</dt>
                    <dd>
                      {myBalance !== null ? formatTokenAmount(myBalance, tokenInfo?.decimals) : '—'}{' '}
                      {tokenInfo?.symbol}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-400">Wallet owner?</dt>
                    <dd>{isOwner === null ? '—' : isOwner ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
