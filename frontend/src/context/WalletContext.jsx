import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import {
  MULTISIG_WALLET_ABI,
  SECTORIAL_STABLE_COIN_ABI,
  CONTRACT_ADDRESSES,
  CHAIN_CONFIG,
} from '../services/contracts';

export const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Read-only provider, always available, doesn't require a connected wallet.
  const readProvider = useMemo(() => new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl), []);

  const readWalletContract = useMemo(() => {
    if (!CONTRACT_ADDRESSES.wallet) return null;
    return new ethers.Contract(CONTRACT_ADDRESSES.wallet, MULTISIG_WALLET_ABI, readProvider);
  }, [readProvider]);

  const readTokenContract = useMemo(() => {
    if (!CONTRACT_ADDRESSES.token) return null;
    return new ethers.Contract(CONTRACT_ADDRESSES.token, SECTORIAL_STABLE_COIN_ABI, readProvider);
  }, [readProvider]);

  const [signer, setSigner] = useState(null);

  const writeWalletContract = useMemo(() => {
    if (!signer || !CONTRACT_ADDRESSES.wallet) return null;
    return new ethers.Contract(CONTRACT_ADDRESSES.wallet, MULTISIG_WALLET_ABI, signer);
  }, [signer]);

  const writeTokenContract = useMemo(() => {
    if (!signer || !CONTRACT_ADDRESSES.token) return null;
    return new ethers.Contract(CONTRACT_ADDRESSES.token, SECTORIAL_STABLE_COIN_ABI, signer);
  }, [signer]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('No browser wallet found. Install MetaMask (or another injected wallet) to approve or execute transactions.');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send('eth_requestAccounts', []);
      const network = await browserProvider.getNetwork();
      const walletSigner = await browserProvider.getSigner();
      setSigner(walletSigner);
      setAddress(await walletSigner.getAddress());
      setChainId(Number(network.chainId));
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setSigner(null);
    setAddress(null);
    setChainId(null);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        connect();
      }
    };
    const handleChainChanged = () => connect();

    window.ethereum.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum.on?.('chainChanged', handleChainChanged);
    return () => {
      window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [connect, disconnect]);

  const wrongNetwork = chainId !== null && chainId !== CHAIN_CONFIG.chainId;

  const value = {
    address,
    chainId,
    connecting,
    error,
    connect,
    disconnect,
    wrongNetwork,
    readWalletContract,
    readTokenContract,
    writeWalletContract,
    writeTokenContract,
    isConnected: Boolean(address),
    contractsConfigured: Boolean(CONTRACT_ADDRESSES.wallet && CONTRACT_ADDRESSES.token),
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
