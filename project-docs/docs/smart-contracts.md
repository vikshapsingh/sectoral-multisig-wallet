# Smart Contracts

Two contracts, both in `blockchain/contracts/`. Solidity 0.8.24, OpenZeppelin
Contracts 5.

## MultiSigWallet.sol

Generic N-of-M multisignature wallet. Any owner can propose a call to any
address with any data; it only executes once the configured number of
owners have confirmed it. Owner and threshold changes are gated by the same
flow — there is no direct-call path to change them.

### State

| Variable | Type | Meaning |
|---|---|---|
| `owners` | `address[]` | Current wallet owners |
| `isOwner` | `mapping(address => bool)` | Fast owner lookup |
| `numConfirmationsRequired` | `uint256` | Approval threshold |
| `transactions` | `Transaction[]` | Every proposed transaction, ever |
| `isConfirmed` | `mapping(uint256 => mapping(address => bool))` | Who confirmed which tx |

`Transaction` struct: `to`, `value`, `data`, `executed`, `numConfirmations`.

### Functions

| Function | Access | Effect |
|---|---|---|
| `submitTransaction(to, value, data)` | any owner | Appends a new pending transaction, returns its index |
| `confirmTransaction(txIndex)` | any owner, once per tx | Increments confirmations; reverts if already confirmed by caller or already executed |
| `revokeConfirmation(txIndex)` | any owner who confirmed | Decrements confirmations |
| `executeTransaction(txIndex)` | anyone | Reverts if confirmations < threshold or already executed; otherwise performs the low-level call and marks executed |
| `addOwner(newOwner)` | **only the wallet itself** | Called via `submitTransaction(walletAddress, 0, encodedCall)` |
| `removeOwner(owner)` | only the wallet itself | Also enforces that the remaining owner count stays ≥ threshold |
| `changeThreshold(newThreshold)` | only the wallet itself | Must stay between 1 and current owner count |
| `getOwners()`, `getTransactionCount()`, `getTransaction(i)`, `isConfirmedBy(i, addr)` | view | Read helpers used by both backend and frontend |

The `onlySelf` modifier (`msg.sender == address(this)`) is what makes
governance changes self-hosted: the only way to reach `addOwner` etc. is for
the wallet to call itself, which only happens inside `executeTransaction`
after a normal propose-confirm-execute cycle targeting the wallet's own
address.

### Events

`TransactionSubmitted`, `TransactionConfirmed`, `TransactionRevoked`,
`TransactionExecuted`, `OwnerAdded`, `OwnerRemoved`, `ThresholdChanged` — all
indexed appropriately for efficient filtering, and all consumed by
`backend/src/services/blockchainService.js`.

### Security properties (and their tests)

| Property | Enforced by | Tested in |
|---|---|---|
| Can't execute below threshold | `require` in `executeTransaction` | `MultiSigWallet.test.js`, `MultiSigWallet.integration.test.js` |
| Can't execute twice | `notExecuted` modifier | `MultiSigWallet.test.js` |
| Can't confirm twice | `notConfirmed` modifier | `MultiSigWallet.test.js` |
| Can't change owners/threshold except via governance flow | `onlySelf` modifier | `MultiSigWallet.test.js` |
| Removing an owner can't drop below threshold | `require` in `removeOwner` | (not currently covered by an explicit test — see Limitations) |

## SectorialStableCoin.sol

An ERC-20 token (`ERC20`, `ERC20Pausable`, `Ownable` from OpenZeppelin) with
one extra field and two extra controls beyond the standard.

### State beyond ERC20

| Variable | Meaning |
|---|---|
| `sector` | Free-text label (e.g. "Agriculture") — informational only, not enforced |
| `isFrozen[address]` | Blocks an address from sending or receiving, independent of pause |

### Functions

| Function | Access | Effect |
|---|---|---|
| `mint(to, amount)` | `onlyOwner`, `whenNotPaused` | Reverts if `to` is frozen |
| `burn(from, amount)` | `onlyOwner` | No pause check — burning is allowed even while paused |
| `pause()` / `unpause()` | `onlyOwner` | Blocks all transfers and minting while paused |
| `freeze(account)` / `unfreeze(account)` | `onlyOwner` | Blocks transfers to/from that one address |
| `updateSector(newSector)` | `onlyOwner` | Updates the label; emits `SectorUpdated` |

`_update` is overridden (the OpenZeppelin v5 hook that replaced
`_beforeTokenTransfer`) to check both `isFrozen[from]` and `isFrozen[to]`
before delegating to `ERC20Pausable`'s own override, which enforces the
pause check.

`owner` — inherited from `Ownable` — is set to the `MultiSigWallet`'s
address at construction and never changes in this project. Every one of the
functions above is therefore multisig-gated by construction: to call any of
them, you must first get a transaction through the wallet's own
propose-confirm-execute flow.

### Events

Standard ERC20 `Transfer`, plus `TokensIssued`, `TokensBurned`,
`AddressFrozen`, `AddressUnfrozen`, `SectorUpdated`, and the inherited
`Paused`/`Unpaused` from `ERC20Pausable`.

## What was removed

An earlier draft included `ScholarshipController.sol`: a third contract
validating spending purposes (tuition, books, etc.) against a
per-beneficiary allocation before proposing a mint through the wallet. It
was removed at the user's request to keep the system a general-purpose
multisig-governed token rather than a purpose-bound one. If you're grading
or reviewing this against an earlier project brief that specified
purpose-bound scholarship spending, note that this is a deliberate,
requested scope change — not an oversight.
