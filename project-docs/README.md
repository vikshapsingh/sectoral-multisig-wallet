# Sectorial Wallet

A blockchain-based multi-signature wallet for managing a sectorial stable
cryptocurrency. Instead of relying on a single private key, multiple
authorized owners must independently confirm a transaction before it
executes — enforced by the smart contract itself, not by any application
layer sitting in front of it.

Academic prototype. Runs entirely on a local Hardhat blockchain with test
accounts. No real funds, no production financial infrastructure.

---

## Features

- **N-of-M multisig wallet** — configurable owners and approval threshold;
  a transaction only executes once enough owners confirm it, and that check
  happens inside the contract, not in the backend or frontend.
- **Sectorial stablecoin (SSC)** — an ERC-20 token with a `sector` label,
  owned entirely by the multisig wallet. Mint, burn, pause, and freeze are
  all owner-only, meaning all of them are multisig-gated.
- **Self-governed wallet** — adding/removing an owner or changing the
  threshold happens only via the same propose → confirm → execute flow as
  any other transaction. No admin backdoor.
- **Role-based access in the app** — `ADMIN` manages users, `APPROVER`
  proposes/confirms/executes (signing with their own connected wallet),
  `AUDITOR` has read-only access to the full history.
- **Wallet-signed approvals** — the backend never signs a transaction on
  anyone's behalf. Confirm/execute calls go straight from the approver's
  browser wallet to the contract.
- **Live chain verification** — every cached transaction can be re-read
  directly from the contract via a dedicated endpoint, so the cache is
  never the only source of truth.

## Architecture

```
React (Vite)  ──HTTP──>  Express/Node  ──ethers.js──>  Hardhat local chain
     │                        │                              │
  MetaMask ethers          MongoDB                   MultiSigWallet.sol
 (signs approvals)     (users, cache, audit)        SectorialStableCoin.sol
```

State-changing wallet actions (submit, confirm, revoke, execute) are signed
client-side by the connected wallet and sent directly to the contract. The
backend only reads chain state and keeps a cache in sync via contract
events — see `docs/architecture.md` for the full breakdown.

## Technology stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity 0.8.24, OpenZeppelin Contracts 5 |
| Blockchain | Hardhat (local network) |
| Blockchain integration | ethers.js v6 |
| Backend | Node.js, Express, MongoDB + Mongoose |
| Auth | JWT, bcryptjs |
| Frontend | React 18, Vite, Tailwind CSS, react-router-dom |

## Folder structure

```
sectorial-wallet/
├── README.md
├── blockchain/          Solidity contracts, Hardhat config, tests, deploy script
├── backend/             Express API, MongoDB models, blockchain sync service
├── frontend/            React app
└── docs/                Architecture, API, contract, database, and report docs
```

## Prerequisites

- Node.js 20 LTS
- MongoDB running locally (or a connection string to one)
- Git
- A browser with an injected wallet (MetaMask or similar) for the Approvals page

## Installation & setup

Run these in order, each in its own terminal.

### 1. Blockchain

```bash
cd blockchain
npm install
npx hardhat node
```

Leave this running. It prints 20 test accounts with known private keys —
these are public and must never be used with real funds.

### 2. Deploy the contracts

In a second terminal:

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

This deploys `MultiSigWallet` (3-of-4 threshold by default, using Hardhat
accounts #0–#3 as owners) and `SectorialStableCoin` (owned by the wallet),
mints a demo supply through a real propose-confirm-execute cycle, and writes
`blockchain/deployments/localhost.json` with both addresses.

### 3. Configure environment variables

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to
`frontend/.env`, then fill in the two contract addresses from step 2:

| `deployments/localhost.json` key | backend `.env` | frontend `.env` |
|---|---|---|
| `contracts.MultiSigWallet` | `MULTISIG_CONTRACT_ADDRESS` | `VITE_MULTISIG_ADDRESS` |
| `contracts.SectorialStableCoin` | `TOKEN_CONTRACT_ADDRESS` | `VITE_TOKEN_ADDRESS` |

Also set a real `JWT_SECRET` in `backend/.env` (any long random string).

### 4. MongoDB

Make sure `mongod` is running locally, or point `MONGO_URI` in `backend/.env`
at a remote instance.

### 5. Backend

In a third terminal:

```bash
cd backend
npm install
npm run dev
```

On startup it connects to MongoDB, resyncs the transaction cache from the
chain, and starts listening for new contract events.

### 6. Frontend

In a fourth terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Register an account — the first one becomes
`ADMIN` automatically.

### 7. MetaMask setup

Add a custom network pointing at `http://127.0.0.1:8545`, chain ID `31337`.
Import one or more of the private keys Hardhat printed in step 1 (these are
the wallet's owners) so you can act as an approver in the app.

## Test commands

```bash
cd blockchain && npx hardhat test        # 26 contract tests
```

See `docs/testing-and-demo.md` (Phase 6 deliverable) for API curl examples,
a manual frontend checklist, and the full demo script.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Backend logs "MULTISIG_CONTRACT_ADDRESS... not set" | `.env` wasn't filled in after deployment, or the server wasn't restarted after editing it |
| `ECONNREFUSED 127.0.0.1:8545` anywhere | Hardhat node (terminal 1) isn't running |
| MongoDB connection failed on backend startup | `mongod` isn't running, or `MONGO_URI` is wrong |
| Approvals page shows "Contract addresses not configured" | `frontend/.env` wasn't filled in, or dev server wasn't restarted |
| Confirm/Execute button does nothing | Wallet not connected, or connected address isn't a wallet owner — check the Wallet page |
| Cached transaction list looks stale right after an action | The event listener polls every ~1s; wait a moment or use "Verify on chain" |
| `npx hardhat compile` tries to download and fails | No internet access to `binaries.soliditylang.org` — needs a normal internet connection, not usable from a fully sandboxed environment |

## Security notes

- Hardhat's default accounts and private keys are public knowledge. Never
  send real funds to them, on any network.
- The backend never holds a private key that can move funds. If the backend
  is compromised, an attacker still cannot execute a wallet transaction
  without the required number of real owner signatures.
- `JWT_SECRET` must be a real secret in any deployment beyond your own
  machine — the example value in `.env.example` is not one.

## Limitations

- Local Hardhat prototype only — not deployed to any public testnet or mainnet.
- No real collateral or peg mechanism backing the stablecoin; "sectorial"
  here refers only to the `sector` label field, not an enforced restriction
  on how tokens are spent.
- Application-level roles (`ADMIN`/`APPROVER`/`AUDITOR`) are independent of
  on-chain ownership — an `APPROVER` whose wallet address isn't an actual
  contract owner can see the UI but every write call will revert.
- No hardware wallet support, no multi-chain support, no formal audit.

## Future scope

- Deployment to a public testnet (Sepolia, etc.) with real wallet UX testing.
- A timelock on sensitive actions (e.g. a mandatory delay between threshold
  being met and execution being allowed).
- Formal verification of `MultiSigWallet.sol`.
- Hardware wallet (Ledger/Trezor) support for approvers.
- A real collateral/peg mechanism if the "stable" part of the stablecoin is
  meant to be taken literally beyond this prototype.
