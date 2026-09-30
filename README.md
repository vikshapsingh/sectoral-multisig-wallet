# Sectorial Multi-Signature Wallet

Academic/demo project: blockchain-based multi-signature wallet for a sectorial stable cryptocurrency (SSC).

## Structure

- `blockchain/` — Hardhat + Solidity smart contracts and tests
- `backend/` — Node.js/Express API + MongoDB + blockchain synchronization
- `frontend/` — React/Vite UI + MetaMask/ethers.js integration
- `project-docs/` — project report, architecture, database, smart-contract and viva material

## Local requirements

- Node.js + npm
- MongoDB running locally at `mongodb://127.0.0.1:27017`
- MetaMask browser extension (for wallet demos)

## First-time setup

Open this root folder in VS Code. Use four terminals.

### Terminal 1 — Hardhat
```powershell
cd blockchain
npm install
npm run node
```
Keep it running.

### Terminal 2 — Deploy contracts
```powershell
cd blockchain
npm run deploy:localhost
```
The deployment creates `blockchain/deployments/localhost.json`. For a fresh Hardhat node, the demo deployment uses 4 owners and a 3-of-4 threshold.

### Terminal 3 — Backend
Create `backend/.env` from `backend/.env.example` and set the deployed addresses:

```env
MULTISIG_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
TOKEN_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

Then:
```powershell
cd backend
npm install
npm run dev
```
Expected: `Listening on http://localhost:5000`.

### Terminal 4 — Frontend
Create `frontend/.env` from `frontend/.env.example` and set:

```env
VITE_API_URL=http://localhost:5000/api
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_ID=31337
VITE_MULTISIG_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_TOKEN_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

Then:
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

## MetaMask

Add a custom network:
- Network name: Hardhat Local
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Import only the Hardhat test accounts printed by `npm run node`; never use those private keys with real funds. The deployed demo multisig has 4 owners and requires 3 approvals.

## Important

This is a local academic/demo system. SSC is not a real currency. If you restart the Hardhat node, deploy the contracts again and refresh the addresses in the backend/frontend `.env` files.

## Tests

From `blockchain/`:
```powershell
npm test
```
