# Project Report

## Abstract

Conventional cryptocurrency wallets typically depend on a single private
key, creating a single point of failure: whoever holds that key has
unilateral control over the funds it guards, and losing it means losing
the funds outright. This project implements a blockchain-based
multi-signature wallet that removes that single point of failure for a
sectorial stable cryptocurrency. Multiple independent, authorized
participants must each cryptographically confirm a transaction before it
is allowed to execute, and that requirement is enforced inside a Solidity
smart contract rather than by any backend or frontend code that could be
bypassed. The system also provides role-based access control at the
application layer and a transparent, tamper-resistant transaction history
derived directly from the blockchain.

## Introduction

Digital asset custody built around a single signing key is fragile: theft,
loss, or coercion of that one key compromises everything it controls.
Multi-signature ("multisig") schemes address this by requiring several
independent approvals — commonly expressed as "M of N," meaning M
approvals out of N authorized signers — before a transaction is valid.
This project applies that pattern to a sector-scoped stable token,
building both the on-chain enforcement mechanism and the supporting
application (backend API and frontend) needed to operate it day to day.

## Problem statement

A wallet controlled by one key cannot support collaborative custody,
cannot express "no single person should be able to move these funds," and
offers no separation between initiating, reviewing, and authorizing a
transaction. For any asset held on behalf of a group — an organization
treasury, a sector-specific fund, a jointly-controlled token supply — this
is a structural weakness rather than an implementation detail.

## Existing system

Most wallet software (browser extension wallets, mobile wallets, simple
custodial services) is built around exactly one private key per account.
Some exchanges offer "multi-approval" as an off-chain feature of their own
backend, but that only moves the single point of trust from a private key
to that backend operator — the underlying blockchain transaction is still
signed and broadcast by one party.

### Problems in the existing system

- A single compromised or lost key is catastrophic and irreversible.
- No native way to require independent agreement from several people.
- Off-chain "multi-approval" features (where they exist) still terminate
  in one signer, so they don't actually remove the single point of failure
  — they just add a policy layer in front of it.
- No transparent, independently verifiable record of who approved what.

## Proposed system

A `MultiSigWallet` smart contract holding ownership of a
`SectorialStableCoin` ERC-20 token. Every privileged token action (mint,
burn, pause, freeze) is restricted to the wallet's own address, so none of
them can happen without going through the wallet's propose → confirm →
execute flow first. A Node.js/Express backend and React frontend provide
day-to-day usability — registration, roles, a dashboard, a transaction
history — without ever becoming a second path to move funds. Approvers
sign confirmations and executions with their own wallet, directly against
the contract, so the guarantee holds even if the backend is fully
compromised.

## Objectives

1. Implement a multi-signature wallet with no single-key control over funds.
2. Enforce approval conditions inside the smart contract, not the backend.
3. Support a configurable number of owners and a configurable approval
   threshold.
4. Provide role-based access control at the application layer
   (`ADMIN`/`APPROVER`/`AUDITOR`).
5. Provide a transparent, on-chain-derived transaction history.

## Scope

In scope: the multisig wallet contract, the sectorial stablecoin contract,
a backend for auth/roles/caching, a frontend for day-to-day use, and a
local Hardhat deployment for demonstration and testing. Out of scope:
real-money settlement, production financial infrastructure, purpose-bound
or category-restricted spending (present in an earlier draft, removed by
request — see `docs/smart-contracts.md`), deployment to a public network,
and formal third-party security audit.

## Methodology

The system was built in four layers, each depending only on the one below it:

1. **Smart contract layer** — `MultiSigWallet.sol` and
   `SectorialStableCoin.sol`, developed and unit-tested with Hardhat before
   anything else was built on top of them. This is the layer that actually
   carries the project's core claim, so it was verified first, in
   isolation, against its own test suite.
2. **Blockchain integration layer** — a backend service
   (`blockchainService.js`) that reads contract state and listens for
   contract events using ethers.js, keeping a MongoDB cache in sync without
   ever being able to write authoritative state back to the chain.
3. **Application layer** — Express API for authentication, role
   management, and serving cached/live chain data; MongoDB models for
   users, the transaction cache, and an audit log.
4. **Presentation layer** — a React frontend where role-gated pages consume
   the API for everything read-only, and call the contract directly
   (through the user's connected wallet) for anything that changes wallet
   state.

## Functional requirements

| ID | Requirement |
|---|---|
| FR1 | The system shall authenticate users via email/password with hashed storage |
| FR2 | The system shall support role assignment (`ADMIN`/`APPROVER`/`AUDITOR`) |
| FR3 | The system shall display live multisig wallet state (owners, threshold, transaction count) |
| FR4 | Any wallet owner shall be able to propose a transaction |
| FR5 | A transaction shall require multi-signature approval before execution |
| FR6 | The smart contract shall validate the approval threshold, not the backend |
| FR7 | The system shall execute a transaction only once threshold is met, and never twice |
| FR8 | The system shall support mint/burn/pause/freeze on the token, all multisig-gated |
| FR9 | The system shall provide a transaction history derived from chain state |
| FR10 | The system shall provide read-only audit access for `ADMIN`/`AUDITOR` roles |

## Non-functional requirements

- **Security** — no application-layer path can move funds; all mutating
  wallet actions are wallet-signed and contract-enforced.
- **Transparency** — every transaction and audit entry is traceable to a
  real on-chain transaction hash.
- **Reliability** — the backend cache is disposable and rebuildable via
  full resync from chain at any time; it is never a single point of truth.
- **Availability** — the frontend degrades to live chain reads
  (`/chain-status`) if the cache is stale or the backend is behind.
- **Maintainability** — contracts, backend, and frontend are separate
  packages with their own dependencies and test suites.
- **Usability** — role-based navigation hides irrelevant actions rather
  than showing disabled buttons everywhere.
- **Auditability** — the `AUDITOR` role has full read access to the
  transaction and audit history with no write capability at all.
