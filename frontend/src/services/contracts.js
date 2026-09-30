// Minimal ABIs, kept in sync by hand with blockchain/contracts/*.sol.
// This mirrors backend/src/services/contractAbis.js intentionally — the
// frontend needs the write functions too, since approvals are signed
// client-side by the connected wallet, not by the backend.

export const MULTISIG_WALLET_ABI = [
  'function getOwners() view returns (address[])',
  'function isOwner(address) view returns (bool)',
  'function numConfirmationsRequired() view returns (uint256)',
  'function getTransactionCount() view returns (uint256)',
  'function getTransaction(uint256 txIndex) view returns (address to, uint256 value, bytes data, bool executed, uint256 numConfirmations)',
  'function isConfirmedBy(uint256 txIndex, address owner) view returns (bool)',

  'function submitTransaction(address to, uint256 value, bytes data) returns (uint256)',
  'function confirmTransaction(uint256 txIndex)',
  'function revokeConfirmation(uint256 txIndex)',
  'function executeTransaction(uint256 txIndex)',
  'function addOwner(address newOwner)',
  'function removeOwner(address owner)',
  'function changeThreshold(uint256 newThreshold)',

  'event TransactionSubmitted(uint256 indexed txIndex, address indexed owner, address indexed to, uint256 value, bytes data)',
  'event TransactionConfirmed(uint256 indexed txIndex, address indexed owner)',
  'event TransactionRevoked(uint256 indexed txIndex, address indexed owner)',
  'event TransactionExecuted(uint256 indexed txIndex, address indexed executor)',
];

export const SECTORIAL_STABLE_COIN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function sector() view returns (string)',
  'function paused() view returns (bool)',
  'function isFrozen(address) view returns (bool)',
  'function owner() view returns (address)',

  'function mint(address to, uint256 amount)',
  'function burn(address from, uint256 amount)',
  'function pause()',
  'function unpause()',
  'function freeze(address account)',
  'function unfreeze(address account)',
];

export const CONTRACT_ADDRESSES = {
  wallet: import.meta.env.VITE_MULTISIG_ADDRESS || '',
  token: import.meta.env.VITE_TOKEN_ADDRESS || '',
};

export const CHAIN_CONFIG = {
  rpcUrl: import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545',
  chainId: Number(import.meta.env.VITE_CHAIN_ID || 31337),
};
