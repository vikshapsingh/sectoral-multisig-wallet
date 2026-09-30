# Viva Preparation

Simple, direct answers. If asked to go deeper, point to the specific file
or test named in parentheses.

## Blockchain basics

**1. What is blockchain?**
A shared, append-only ledger replicated across many participants, where
each new block cryptographically references the previous one, making
past entries effectively tamper-resistant.

**2. Why use blockchain for this project instead of a normal database?**
Because the core requirement is that no single party — including whoever
runs the backend — can unilaterally decide a transaction is approved. A
normal database is trivially editable by whoever administers it; a smart
contract's rules are enforced by every node running the network.

**3. Why Ethereum/EVM specifically?**
It's the most mature smart contract platform, with mature tooling
(Hardhat, ethers.js, OpenZeppelin) and a well-understood security model.
Nothing in the design is Ethereum-specific beyond that — it would port to
any EVM-compatible chain.

**4. What is a smart contract?**
Code deployed to the blockchain that runs deterministically and whose
state changes are enforced by network consensus, not by any single server.

**5. What is Solidity?**
The smart contract programming language used to write
`MultiSigWallet.sol` and `SectorialStableCoin.sol`.

**6. What is ethers.js, and where is it used?**
A JavaScript library for talking to an Ethereum-like blockchain. Used in
the backend (read-only, to sync a cache and listen for events) and in the
frontend (read-write, since approvers sign transactions with their
connected wallet through it).

**7. What is Hardhat?**
The local development blockchain and tooling used to compile, test, and
deploy the contracts (`blockchain/hardhat.config.js`).

## Multi-signature specifics

**8. What is a multi-signature wallet?**
A wallet that requires more than one authorized party to approve a
transaction before it executes, removing any single key's unilateral
control.

**9. What does "M-of-N" mean here?**
N is the total number of owners; M is `numConfirmationsRequired` — how
many of those owners must confirm before a transaction can execute. The
demo deployment uses 3-of-4.

**10. How is the threshold actually implemented?**
`executeTransaction` has `require(transaction.numConfirmations >=
numConfirmationsRequired, ...)` before it performs the underlying call.
(`MultiSigWallet.sol`)

**11. What happens if the threshold isn't reached?**
The `require` reverts the entire transaction — nothing happens, no partial
state change, and the transaction stays pending. (Tested explicitly in
`MultiSigWallet.test.js`, "prevents execution before the threshold is
reached.")

**12. Can an owner confirm twice to fake two approvals?**
No — `isConfirmed[txIndex][msg.sender]` is checked before incrementing, so
a second confirmation from the same owner reverts.

**13. Can a transaction be executed twice?**
No — `executed` is set to `true` before the external call, and every
entry point checks `notExecuted`.

**14. How are owners and the threshold changed?**
Only via the wallet calling itself (`onlySelf` modifier: `msg.sender ==
address(this)`), which only happens inside `executeTransaction` when the
proposed call's target is the wallet's own address. There is no direct
"admin" function to change these.

## Smart contract design

**15. Why enforce approval on-chain instead of in the backend?**
Because a backend can be compromised, buggy, or simply lied to. If
approval logic lived in the backend, "requires 3 signatures" would really
mean "requires the backend to say so" — which is exactly the single point
of failure this project exists to remove.

**16. Can the backend bypass the threshold?**
No. The backend has no function that calls `confirmTransaction` or
`executeTransaction` on anyone's behalf — those calls only happen as
direct, wallet-signed transactions from the frontend. There is no
credential the backend could hold that would let it forge a confirmation.

**17. What does the MultiSigWallet contract actually store per transaction?**
`to`, `value`, `data`, `executed`, and `numConfirmations` — see the
`Transaction` struct in `MultiSigWallet.sol`.

**18. Why is `MultiSigWallet` generic (any `to`/`data`) rather than
token-specific?**
So it can also govern itself (owner/threshold changes) and the token
(mint/burn/pause/freeze) through the exact same mechanism, rather than
needing separate approval logic for each.

**19. How does the wallet actually control the token?**
`SectorialStableCoin`'s `owner` (from OpenZeppelin's `Ownable`) is set to
the wallet's address at deployment. Every privileged token function has
`onlyOwner`, so calling any of them requires being the wallet — which
means going through the wallet's own approval flow first.

**20. What's the `sector` field for?**
A label identifying which sector/industry this token instance represents
(e.g. "Agriculture"). It's informational only in this version — it does
not restrict who can hold or spend the token. (An earlier draft had
purpose-bound spending restrictions; that layer was removed — see
`docs/smart-contracts.md`.)

## Backend & integration

**21. Why Node.js/Express?**
Lightweight, widely understood, and pairs naturally with ethers.js for the
blockchain integration layer.

**22. Why MongoDB, given the chain is authoritative?**
For everything the chain doesn't model at all: user accounts, passwords,
application roles, and a fast-to-query cache of chain state so the
frontend doesn't need a live chain read for every list view.

**23. Why JWT?**
Stateless session tokens — the server doesn't need to store sessions, and
the same token works across the API without a shared session store.

**24. Why bcrypt for passwords?**
A slow, salted hash designed specifically to resist brute-force attacks
even if the password database leaks.

**25. How does the backend know what a cached transaction actually does?**
It best-effort decodes the raw `data` field using the contract ABIs (tries
the token's ABI, then the wallet's) — see `decodeTransactionData` in
`blockchainService.js`.

**26. What happens if the backend goes down and comes back up?**
On startup it runs a full resync — reading every transaction currently on
the wallet — before starting live event listeners, so the cache is
correct even after downtime.

**27. How would you prove the cache isn't lying about a transaction?**
Call `GET /api/transactions/:id/chain-status`, which bypasses MongoDB
entirely and reads `getTransaction(txIndex)` straight from the contract.

## Security

**28. What happens if one signer's key is compromised?**
An attacker with one key can propose and confirm transactions, but cannot
execute anything alone unless the threshold is 1 — which it isn't in this
deployment (3-of-4). They'd need to compromise enough additional keys to
reach the threshold.

**29. What's the single point of failure now?**
There isn't one key that controls funds anymore. The closest remaining
concentration of risk is if enough individual owner keys were compromised
simultaneously to reach the threshold — which is the entire point of
choosing a threshold above 1.

**30. Why OpenZeppelin instead of writing ERC20/Ownable/Pausable from
scratch?**
It's a widely audited, battle-tested implementation. Writing token
mechanics from scratch adds risk for no benefit when a standard,
well-reviewed implementation already exists.

**31. How are private keys protected?**
The backend never holds one belonging to a user. Approvers sign directly
in their browser wallet; their key never leaves that wallet.

## Project-level

**32. What is the existing problem, in one sentence?**
Single-key wallets have no way to require independent agreement from
multiple people before funds move.

**33. What is your proposed solution, in one sentence?**
An on-chain multisig wallet that owns the token outright, so every
privileged action requires a configurable threshold of independent
approvals enforced by the contract itself.

**34. What are the main limitations?**
Local prototype only (not on a public network), no real collateral/peg
mechanism, application roles are independent of on-chain ownership (an
`APPROVER` without owner status just gets contract reverts), and no formal
audit.

**35. What's the future scope?**
Testnet deployment, a timelock on sensitive actions, formal verification,
and hardware wallet support for approvers — see the README's Future Scope
section.
