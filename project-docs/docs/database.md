# Database

MongoDB, accessed via Mongoose. Three collections, all defined in
`backend/src/models/`.

## The core rule

**MongoDB never decides whether a transaction is approved or executed.**
Every field describing approval/execution state is a cache of something
the chain already decided; it exists only so the frontend doesn't have to
make a slow chain read for every list view. Whenever that distinction
matters, use `GET /api/transactions/:id/chain-status` instead of the cache.

## `User`

| Field | Type | Notes |
|---|---|---|
| `name` | String | |
| `email` | String | Unique, lowercased |
| `passwordHash` | String | bcrypt, `select: false` by default (never returned unless explicitly selected) |
| `role` | String enum | `ADMIN` \| `APPROVER` \| `AUDITOR` |
| `walletAddress` | String | The on-chain address this user is expected to sign with in the frontend. Independent of whether that address is actually a wallet owner — the contract is the only authority on that. |
| `isActive` | Boolean | Deactivated users are rejected at auth middleware, not deleted |

Passwords are hashed with bcrypt at 12 rounds in `authController.register`;
the schema itself only ever stores the hash.

## `Transaction` (cache)

Mirrors `MultiSigWallet.transactions[txIndex]`, kept current by
`blockchainService`'s event listeners plus a full resync on backend
startup.

| Field | Type | Source |
|---|---|---|
| `txIndex` | Number, unique | Array index in the contract |
| `to`, `value`, `data` | String | Raw call data, as submitted |
| `functionName`, `decodedArgs` | String, Mixed | Best-effort ABI decode of `data` (tries the token ABI, then the wallet ABI) |
| `numConfirmations`, `numConfirmationsRequired` | Number | |
| `executed` | Boolean | |
| `status` | String enum | Derived: `EXECUTED` if executed, else `APPROVED` if confirmations ≥ threshold, else `PENDING` |
| `executedAtBlock`, `executedTxHash` | Number, String | Set only once `TransactionExecuted` fires |

## `AuditLog`

Append-only. Two kinds of entries, distinguished by which fields are set:

- **App-side events** (`LOGIN`, `USER_CREATED`, `ROLE_CHANGED`, ...) — have
  `actor` (a `User` ObjectId reference) and no `blockchainTxHash`.
- **Chain-side events** (`TX_SUBMITTED`, `TX_CONFIRMED`, `TX_EXECUTED`,
  `TOKENS_ISSUED`, `TOKEN_PAUSED`, ...) — have `actorAddress` (the on-chain
  address that triggered it) and a real `blockchainTxHash`, and no `actor`,
  since the chain doesn't know about application user accounts.

Never logs passwords, private keys, or JWTs — `details` is a free-form
object populated per action from data already safe to display (amounts,
addresses, role changes), never from request headers or credentials.

## What's deliberately not modeled

There is no `Beneficiary`, `Approval`, or `Scholarship` collection. An
earlier draft of this project had those, tied to a purpose-bound spending
layer that was removed — see `docs/smart-contracts.md` for why. The
`Transaction` cache above replaces what would have been a separate
`Approval` collection, since on-chain confirmation counts already carry
that information without needing a duplicate row per approver per
transaction.
