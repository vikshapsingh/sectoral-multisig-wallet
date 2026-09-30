import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { AppLayout } from '../components/layout/AppLayout';
import { AddressPill } from '../components/common/AddressPill';

export default function Profile() {
  const { user } = useAuth();
  const { address, isConnected, connect } = useWallet();

  return (
    <AppLayout>
      <h1 className="text-xl font-semibold mb-6">Profile</h1>

      <div className="card p-5 max-w-md space-y-4 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-400">Name</span>
          <span>{user.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-400">Email</span>
          <span>{user.email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-400">Role</span>
          <span>{user.role}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ink-400">Registered wallet address</span>
          <AddressPill address={user.walletAddress} />
        </div>
        <p className="text-xs text-ink-500">
          This is the address your admin has associated with your account. To be effective as an
          approver, it must also be a wallet owner on-chain — check the Wallet page.
        </p>

        <div className="pt-4 border-t border-ink-800">
          <div className="flex justify-between items-center">
            <span className="text-ink-400">Connected wallet (this browser)</span>
            {isConnected ? <AddressPill address={address} /> : <span className="text-ink-500">Not connected</span>}
          </div>
          {!isConnected && (
            <button onClick={connect} className="btn-secondary text-xs mt-3">
              Connect wallet
            </button>
          )}
          {isConnected && address?.toLowerCase() !== user.walletAddress?.toLowerCase() && (
            <p className="text-xs text-alert-500 mt-3">
              This doesn't match your registered wallet address. Ask an admin to update it if this is
              intentional.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
