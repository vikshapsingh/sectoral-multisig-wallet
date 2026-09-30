# Architecture

## Component responsibilities

| Layer | Owns | Never does |
|---|---|---|
| Smart contracts | Owner list, threshold, approval counts, execution, token balances/supply | Trust any off-chain claim of "approved" |
| Backend | Auth (JWT/bcrypt), role management, MongoDB metadata, event-driven cache sync, input validation | Sign a transaction on a user's behalf; mark a tx approved/executed without reading it from chain |
| Frontend | UI/UX, wallet connection, calling contract methods directly for state-changing actions, calling the backend for metadata/roles | Fabricate approval counts instead of reading contract state |
| MongoDB | Users, transaction cache, audit log | Be authoritative for balances or approval state |

The wallet-signed design is deliberate: an `APPROVER`'s confirmation is only
meaningful if it's a real signature from their own key. If the backend
signed on their behalf, "multiple independent approvers" would collapse
into "one backend with everyone's trust."

## System diagram

```mermaid
flowchart LR
    subgraph Browser
        UI[React app]
        MM[Injected wallet<br/>MetaMask]
    end
    subgraph Server
        API[Express API]
        DB[(MongoDB)]
        SVC[blockchainService.js]
    end
    subgraph Chain
        MSW[MultiSigWallet.sol]
        TOKEN[SectorialStableCoin.sol]
    end

    UI -- "reads: /wallet, /transactions, /audit, /users" --> API
    API --> DB
    API -- "read-only ethers.js" --> SVC
    SVC -- "reads + event subscriptions" --> MSW
    SVC -- "reads + event subscriptions" --> TOKEN
    SVC -- "writes cache/audit from events" --> DB

    UI -- "submit / confirm / revoke / execute<br/>(signed by the connected wallet)" --> MM
    MM -- "signed transactions" --> MSW
    MSW -- "onlyOwner calls" --> TOKEN
```

## Multi-signature approval sequence

```mermaid
sequenceDiagram
    actor Approver1 as Approver (Owner 1)
    actor Approver2 as Approver (Owner 2)
    participant MSW as MultiSigWallet
    participant Token as SectorialStableCoin

    Approver1->>MSW: submitTransaction(token, 0, mintData)
    MSW-->>MSW: store Transaction, numConfirmations = 0
    Approver1->>MSW: confirmTransaction(txIndex)
    MSW-->>MSW: numConfirmations = 1
    Note over MSW: 1 of 2 required — executeTransaction would revert here
    Approver2->>MSW: confirmTransaction(txIndex)
    MSW-->>MSW: numConfirmations = 2 (threshold met)
    Approver1->>MSW: executeTransaction(txIndex)
    MSW->>Token: mint(recipient, amount)
    Token-->>MSW: success
    MSW-->>Approver1: TransactionExecuted event
```

## Activity diagram: proposing and resolving a transaction

```mermaid
flowchart TD
    A[Owner submits transaction] --> B{Enough confirmations?}
    B -- No --> C[Owner confirms]
    C --> B
    B -- No, owner changes mind --> D[Owner revokes confirmation]
    D --> B
    B -- Yes --> E[Anyone calls executeTransaction]
    E --> F{Contract call succeeds?}
    F -- Yes --> G[Marked executed, event emitted]
    F -- No --> H[Whole execution reverts,<br/>transaction stays unexecuted]
```

## Use case diagram

```mermaid
flowchart LR
    Admin((Admin))
    Approver((Approver))
    Auditor((Auditor))

    Admin --> UC1[Manage users & roles]
    Admin --> UC2[View wallet & transactions]
    Admin --> UC3[View audit log]

    Approver --> UC4[Connect wallet]
    Approver --> UC5[Propose transaction]
    Approver --> UC6[Confirm / revoke confirmation]
    Approver --> UC7[Execute transaction]
    Approver --> UC2

    Auditor --> UC2
    Auditor --> UC3
```

## ER diagram (MongoDB — application metadata only)

```mermaid
erDiagram
    USER {
        ObjectId id
        string name
        string email
        string passwordHash
        string role
        string walletAddress
        boolean isActive
    }
    TRANSACTION_CACHE {
        ObjectId id
        number txIndex
        string to
        string functionName
        number numConfirmations
        number numConfirmationsRequired
        boolean executed
        string status
    }
    AUDIT_LOG {
        ObjectId id
        string action
        ObjectId actor
        string actorAddress
        object details
        string blockchainTxHash
    }

    USER ||--o{ AUDIT_LOG : "acts (app-side events)"
```

Note there is no foreign key from `TRANSACTION_CACHE` to `USER` — the chain
identifies actors by address, not by application user ID. A cached
transaction's `submitter`/confirmer addresses may or may not correspond to
a registered user.

## Folder structure

```
sectorial-wallet/
├── blockchain/
│   ├── contracts/{MultiSigWallet,SectorialStableCoin}.sol
│   ├── scripts/deploy.js
│   └── test/*.test.js
├── backend/
│   └── src/{config,controllers,middleware,models,routes,services,utils}
├── frontend/
│   └── src/{components,context,hooks,pages,services,utils}
└── docs/
```

## Key implementation decisions

1. **Wallet-signed approvals**, not backend-custodied keys — see rationale above.
2. **Purpose enforcement was deliberately removed.** An earlier draft
   included a `ScholarshipController` restricting spending to categories
   like tuition/books. That layer was dropped; `SectorialStableCoin` is
   a general-purpose token whose only sector-specific feature is the
   `sector` label, not an enforced spending restriction.
3. **`MultiSigWallet` is generic call-forwarding**, not token-specific —
   it can propose a call to any address with any data, which is what lets
   it also govern itself (owner/threshold changes) and the token (mint,
   burn, pause, freeze) through the same mechanism.
4. **No `submitter` role** — only wallet owners can propose transactions.
   An earlier draft had a separate submitter role so a non-owner contract
   could propose on a beneficiary's behalf; removed along with the
   scholarship layer.
