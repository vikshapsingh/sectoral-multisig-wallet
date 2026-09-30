// Minimal ABIs, kept in sync by hand with blockchain/contracts/*.sol.
// Only the functions/events the backend actually needs are listed.

const MULTISIG_WALLET_ABI = [
  'function owners(uint256) view returns (address)',
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
  'event OwnerAdded(address indexed owner)',
  'event OwnerRemoved(address indexed owner)',
  'event ThresholdChanged(uint256 newThreshold)',
];

const SECTORIAL_STABLE_COIN_ABI = [
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
  'function updateSector(string newSector)',

  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event TokensIssued(address indexed to, uint256 amount)',
  'event TokensBurned(address indexed from, uint256 amount)',
  'event AddressFrozen(address indexed account)',
  'event AddressUnfrozen(address indexed account)',
  'event Paused(address account)',
  'event Unpaused(address account)',
  'event SectorUpdated(string newSector)',
];

module.exports = { MULTISIG_WALLET_ABI, SECTORIAL_STABLE_COIN_ABI };
