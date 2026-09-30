# API Reference

Base URL: `http://localhost:5000/api` (configurable via `PORT` in
`backend/.env`). All request/response bodies are JSON. Authenticated routes
expect `Authorization: Bearer <jwt>`.

For runnable curl examples against every endpoint below, see
`docs/testing-and-demo.md`.

## Design principle

**This API has no confirm/execute/submit endpoints for wallet transactions.**
That's intentional, not missing functionality — those actions are signed
directly by an approver's connected wallet against the contract (see
`docs/architecture.md`). The API's job is authentication, role management,
and giving the frontend a fast, cached view of chain state that it can also
double-check live via `/transactions/:id/chain-status`.

## Auth — `/api/auth`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/register` | none | `name, email, password, walletAddress?` | First registration becomes `ADMIN`, all others default to `AUDITOR` |
| POST | `/login` | none | `email, password` | Returns `{ token, user }` |
| GET | `/me` | required | — | Returns the current user |

## Users — `/api/users` (all require `ADMIN`)

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/` | — | List all users |
| GET | `/:id` | — | Single user |
| PATCH | `/:id` | `name?, walletAddress?, isActive?` | Deactivating logs `USER_DEACTIVATED` |
| PATCH | `/:id/role` | `role` (`ADMIN`\|`APPROVER`\|`AUDITOR`) | Logs `ROLE_CHANGED` |

## Wallet — `/api/wallet` (any authenticated role)

| Method | Path | Returns |
|---|---|---|
| GET | `/info` | `{ address, owners[], threshold, transactionCount }` — live from chain |
| GET | `/token` | `{ address, name, symbol, decimals, totalSupply, sector, paused, owner }` — live from chain |
| GET | `/balance/:address` | `{ address, balance }` — live from chain |

## Transactions — `/api/transactions` (any authenticated role)

| Method | Path | Returns |
|---|---|---|
| GET | `/?status=` | Cached list, optional `PENDING`\|`APPROVED`\|`EXECUTED` filter |
| GET | `/:id` | Single cached transaction by `txIndex` |
| GET | `/:id/chain-status` | Same transaction, read live from the contract — bypasses the cache entirely |

## Audit — `/api/audit` (`ADMIN` or `AUDITOR`)

| Method | Path | Returns |
|---|---|---|
| GET | `/?action=&limit=` | Audit log entries, newest first, optional action filter |

`action` is one of the values in `AuditLog.ACTIONS`
(`backend/src/models/AuditLog.js`) — covers both app-side events (`LOGIN`,
`ROLE_CHANGED`, ...) and chain-side events synced from contract logs
(`TX_SUBMITTED`, `TX_EXECUTED`, `TOKENS_ISSUED`, ...).

## Error shape

Every error response has the same shape:

```json
{ "error": { "message": "...", "details": [ /* optional, e.g. validation errors */ ] } }
```

Common status codes: `400` validation, `401` missing/invalid/expired token,
`403` wrong role or deactivated account, `404` not found, `409` duplicate
(e.g. email already registered), `500` unexpected — check the server log,
these are usually a misconfigured `.env` or an unreachable dependency
(MongoDB or the Hardhat node).
