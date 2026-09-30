# Testing & Demo Guide

This covers three layers of testing — smart contracts, API, frontend — plus the
exact sequence to run for a live demonstration, including the failure case
that proves the threshold is enforced on-chain rather than trusted from the UI.

Assumes the startup sequence from Phase 5 (Hardhat node → deploy → backend →
frontend) and that you've registered at least one user (the first registration
becomes `ADMIN`).

---

## 1. Smart contract tests

Already provided in `blockchain/test/`. Run them with:

```bash
cd blockchain
npm install
npx hardhat test
```

Expected: **26 passing**, covering:

| File | What it proves |
|---|---|
| `MultiSigWallet.test.js` | Owner/threshold setup, submit/confirm/revoke, execution blocked below threshold, execution succeeds at threshold, double-execution blocked, duplicate confirmation blocked, governance (add owner / change threshold) only works via the propose-confirm-execute flow, never by direct call |
| `SectorialStableCoin.test.js` | Name/symbol/decimals/sector, mint/burn access control, pause blocks mint+transfer, freeze blocks transfer, normal transfers work |
| `MultiSigWallet.integration.test.js` | The core claim of the whole project: a direct `mint()` call from any single address (including a wallet owner acting alone) is rejected; minting only succeeds once the wallet's threshold is met |

If any test fails after you've made changes, treat that as a blocker — the
frontend and backend are built assuming these exact revert messages and event
signatures.

---

## 2. API testing

Base URL: `http://localhost:5000/api`. Replace `<TOKEN>` with the JWT from
login. All examples use `curl`; the same requests work directly in Postman.

### 2.1 Register (first user becomes ADMIN)

```
Method:  POST
URL:     /auth/register
Auth:    none
Body:    { "name": "Alice Admin", "email": "alice@example.com", "password": "changeme123" }
```

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Admin","email":"alice@example.com","password":"changeme123"}'
```

Response `201`:
```json
{ "token": "eyJhbGciOi...", "user": { "id": "...", "role": "ADMIN", ... } }
```

Errors: `400` (validation — see `error.details` for the specific field),
`409` (email already registered).

### 2.2 Login

```
Method: POST
URL:    /auth/login
Auth:   none
Body:   { "email": "alice@example.com", "password": "changeme123" }
```

Response `200`: same shape as register. Errors: `401` invalid credentials,
`403` account deactivated.

### 2.3 Current user

```
Method: GET
URL:    /auth/me
Auth:   Bearer <TOKEN>
```

```bash
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer <TOKEN>"
```

Errors: `401` missing/invalid/expired token.

### 2.4 Wallet info (any authenticated role)

```
Method: GET
URL:    /wallet/info
Auth:   Bearer <TOKEN>
```

Response `200`:
```json
{ "address": "0x5Fb...", "owners": ["0xf39...", "0x709..."], "threshold": 2, "transactionCount": 3 }
```

Errors: `500` if `MULTISIG_CONTRACT_ADDRESS` isn't set in `backend/.env`, or
if the Hardhat node isn't reachable at `BLOCKCHAIN_RPC_URL`.

### 2.5 Token info

```
Method: GET
URL:    /wallet/token
Auth:   Bearer <TOKEN>
```

Response `200`: `{ address, name, symbol, decimals, totalSupply, sector, paused, owner }`.

### 2.6 Token balance for an address

```
Method: GET
URL:    /wallet/balance/:address
Auth:   Bearer <TOKEN>
```

```bash
curl http://localhost:5000/api/wallet/balance/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  -H "Authorization: Bearer <TOKEN>"
```

Errors: `400` invalid address format.

### 2.7 List transactions (cached)

```
Method: GET
URL:    /transactions?status=PENDING     (status is optional: PENDING | APPROVED | EXECUTED)
Auth:   Bearer <TOKEN>
```

Response `200`: `{ "transactions": [ { txIndex, to, functionName, decodedArgs, numConfirmations, numConfirmationsRequired, executed, status, createdAt, ... } ] }`

### 2.8 Verify a transaction directly on-chain (bypasses the cache)

```
Method: GET
URL:    /transactions/:id/chain-status
Auth:   Bearer <TOKEN>
```

```bash
curl http://localhost:5000/api/transactions/0/chain-status -H "Authorization: Bearer <TOKEN>"
```

This is the endpoint to reach for if you ever suspect the cache is stale or
wrong — it reads `getTransaction(txIndex)` straight from the contract.
Errors: `404` if the index doesn't exist on-chain.

### 2.9 List users (ADMIN only)

```
Method: GET
URL:    /users
Auth:   Bearer <ADMIN_TOKEN>
```

Errors: `403` if the caller isn't ADMIN.

### 2.10 Change a user's role (ADMIN only)

```
Method: PATCH
URL:    /users/:id/role
Auth:   Bearer <ADMIN_TOKEN>
Body:   { "role": "APPROVER" }
```

```bash
curl -X PATCH http://localhost:5000/api/users/<userId>/role \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"role":"APPROVER"}'
```

Errors: `400` invalid role, `404` user not found.

### 2.11 Update a user (ADMIN only — wallet address, active status)

```
Method: PATCH
URL:    /users/:id
Auth:   Bearer <ADMIN_TOKEN>
Body:   { "walletAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "isActive": true }
```

### 2.12 Audit log

```
Method: GET
URL:    /audit?action=TX_EXECUTED&limit=50     (both params optional)
Auth:   Bearer <TOKEN>       (ADMIN or AUDITOR)
```

Errors: `403` if caller is APPROVER (audit is ADMIN/AUDITOR only).

---

## 3. Manual frontend test checklist

Run through this once per role after any significant change. Use separate
browser profiles (or incognito windows) for different roles/wallets so
sessions and MetaMask accounts don't collide.

### As ADMIN
- [ ] Register the first account → confirm role shows as `ADMIN` on Profile
- [ ] Go to **Users**, promote 2–3 more registered accounts to `APPROVER`
- [ ] Set each approver's `walletAddress` to match one of the Hardhat owner
      addresses from `deployments/localhost.json`
- [ ] Go to **Audit log**, confirm `USER_CREATED` and `ROLE_CHANGED` entries appear

### As APPROVER
- [ ] Log in, connect MetaMask (or another injected wallet) to the same
      address registered on your profile
- [ ] Go to **Wallet** — confirm "Wallet owner?" shows **Yes**
- [ ] Go to **Approvals**, submit a `Mint tokens` transaction to your own address
- [ ] Confirm it appears in the list with `1 / 2` (or your configured threshold)
- [ ] Log in as a second approver, confirm the same transaction
- [ ] Confirm the "Execute" button becomes enabled once the threshold is met,
      and that executing it succeeds
- [ ] Go to **Wallet**, confirm your token balance increased

### As AUDITOR
- [ ] Log in, confirm **Approvals** and **Users** are not in the sidebar
- [ ] Go to **Audit log**, confirm the mint's `TX_SUBMITTED` → `TX_CONFIRMED` →
      `TX_EXECUTED` → `TOKENS_ISSUED` sequence is all visible with tx hashes

### Cross-cutting
- [ ] Log out and confirm protected routes redirect to `/login`
- [ ] Try opening `/users` or `/approvals` directly as a non-ADMIN/APPROVER —
      confirm it redirects rather than showing a broken page
- [ ] On **Transactions**, click "Verify on chain" on an executed transaction
      and confirm the raw response matches what's shown in the cached row

---

## 4. End-to-end demo script

This is the sequence to run in front of an audience. Timings assume a local
Hardhat network, so everything is near-instant.

### Setup (before the audience arrives)

```
Terminal 1 (blockchain/):  npx hardhat node
Terminal 2 (blockchain/):  npx hardhat run scripts/deploy.js --network localhost
                            → copy the two addresses into backend/.env and frontend/.env
Terminal 3 (backend/):     npm run dev
Terminal 4 (frontend/):    npm run dev
```

Import three of the Hardhat private keys the deploy script printed as owners
into MetaMask (accounts #0, #1, #2 by default), and connect MetaMask's
network to `http://127.0.0.1:8545`, chain ID `31337`.

### Live walkthrough

1. **Register three accounts** in the app (one becomes ADMIN automatically;
   register two more). As ADMIN, promote the other two to `APPROVER` and set
   their `walletAddress` fields to Hardhat accounts #1 and #2. Set your own
   admin account's address to account #0 if you also want to act as an
   approver — an ADMIN account can be promoted to APPROVER for this purpose.

2. **Show the Wallet page**: point out the threshold (e.g. "3 of 4 owners"),
   the live-read owner list, and the token's zero total supply.

3. **Propose a mint** from the Approvals page while connected as owner #0:
   mint 1,000 SSC to owner #0's own address. Narrate: *"This is now a
   pending transaction. Nobody can move tokens yet — watch."*

4. **Attempt to execute immediately** — the Execute button is disabled
   (`0 of 3` / `1 of 3` confirmations, whichever your threshold requires).
   This is the failure case from the brief: *"If I could execute this right
   now, the whole project would be pointless. The button is disabled because
   the contract itself won't allow it — not because the UI is hiding it."*
   For the API version of this proof, call `GET
   /transactions/0/chain-status` and point out `numConfirmations` is below
   `numConfirmationsRequired`.

5. **Switch MetaMask to owner #1**, log in as that approver, confirm the
   transaction. Confirmations now `2 of 3` (still short if your threshold is 3).

6. **Switch to owner #2**, confirm again. Confirmations now `3 of 3` —
   Execute is now enabled.

7. **Execute** the transaction. Show the Wallet page again: total supply is
   now 1,000 SSC, owner #0's balance reflects the mint.

8. **Show the Audit log** as ADMIN or AUDITOR: the full
   `TX_SUBMITTED → TX_CONFIRMED → TX_CONFIRMED → TX_EXECUTED → TOKENS_ISSUED`
   sequence, each with a real transaction hash.

9. **Close with the failure demonstration explicitly**, if not already shown
   at step 4: submit a second transaction, get only one confirmation, and
   try to execute via the UI — Execute stays disabled. If asked "what if you
   forced it through the API," point out the backend has no
   confirm/execute endpoints at all; those calls only exist as direct,
   wallet-signed contract calls from the frontend, so there is no backend
   path that could skip the threshold even if someone tried.

### What this demonstrates

```
Multiple owners  →  each signs independently with their own key
       ↓
Smart contract   →  counts confirmations, enforces the threshold itself
       ↓
Below threshold  →  execution reverts (proven both in the UI and via a raw chain read)
       ↓
At threshold     →  execution succeeds, token supply changes on-chain
       ↓
Audit log        →  every step traceable to a real transaction hash
```

---

## 5. Note on scope

Earlier drafts of this project included a purpose-bound scholarship layer
(`ScholarshipController`, beneficiary allocations, spending purposes). That
was removed at your request — this system is a general-purpose multisig
wallet governing a sectorial stablecoin, with no purpose restrictions baked
into the contracts. If your viva panel expects purpose-bound spending based
on an earlier version of your proposal, say so explicitly rather than
improvising — it's a deliberate scope decision, not an omission.
