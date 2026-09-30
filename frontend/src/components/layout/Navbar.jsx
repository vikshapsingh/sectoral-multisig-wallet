import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';
import { AddressPill } from '../common/AddressPill';

export function Navbar() {
  const { user, logout } = useAuth();
  const { address, connect, disconnect, connecting, isConnected, wrongNetwork } = useWallet();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-ink-800 bg-ink-950">
      <div className="flex items-center justify-between px-4 md:px-6 h-16">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-signal-500" />
          <span className="font-semibold tracking-tight">Sectorial Wallet</span>
        </Link>

        <div className="flex items-center gap-3">
          {wrongNetwork && (
            <span className="hidden sm:inline text-xs text-alert-500 border border-alert-600/40 bg-alert-600/10 rounded-full px-2.5 py-1">
              Wrong network
            </span>
          )}

          {isConnected ? (
            <div className="flex items-center gap-2">
              <AddressPill address={address} />
              <button onClick={disconnect} className="btn-secondary text-xs px-2.5 py-1.5">
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={connect} disabled={connecting} className="btn-primary text-sm">
              {connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          )}

          <div className="h-6 w-px bg-ink-700" />

          <Link to="/profile" className="text-sm text-ink-300 hover:text-ink-100 transition-colors">
            {user?.name}
            <span className="ml-2 text-xs text-ink-500">{user?.role.toLowerCase()}</span>
          </Link>

          <button onClick={handleLogout} className="btn-secondary text-xs px-2.5 py-1.5">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
