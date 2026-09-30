// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MultiSigWallet
/// @notice Generic N-of-M multisignature wallet. Any owner can propose an
/// arbitrary call (including calls into the sectorial stablecoin it
/// controls, such as mint/burn/pause/freeze). The call only executes once
/// the configured number of owners have confirmed it. Owner and threshold
/// changes are themselves gated by the same propose -> confirm -> execute
/// flow (self-call governance), so no single account — including the
/// deployer — can alter the wallet's rules unilaterally after setup.
contract MultiSigWallet {
    // ----- Events -----
    event TransactionSubmitted(
        uint256 indexed txIndex,
        address indexed owner,
        address indexed to,
        uint256 value,
        bytes data
    );
    event TransactionConfirmed(uint256 indexed txIndex, address indexed owner);
    event TransactionRevoked(uint256 indexed txIndex, address indexed owner);
    event TransactionExecuted(uint256 indexed txIndex, address indexed executor);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ThresholdChanged(uint256 newThreshold);

    // ----- State -----
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    // ----- Modifiers -----
    modifier onlyOwner() {
        require(isOwner[msg.sender], "MultiSigWallet: not an owner");
        _;
    }

    /// @dev Restricts a function so it can only be invoked by the wallet
    /// calling itself, i.e. only via a transaction that was itself
    /// proposed, confirmed and executed through the normal multisig flow.
    modifier onlySelf() {
        require(msg.sender == address(this), "MultiSigWallet: only via wallet governance");
        _;
    }

    modifier txExists(uint256 txIndex) {
        require(txIndex < transactions.length, "MultiSigWallet: tx does not exist");
        _;
    }

    modifier notExecuted(uint256 txIndex) {
        require(!transactions[txIndex].executed, "MultiSigWallet: tx already executed");
        _;
    }

    modifier notConfirmed(uint256 txIndex) {
        require(!isConfirmed[txIndex][msg.sender], "MultiSigWallet: tx already confirmed by caller");
        _;
    }

    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        require(_owners.length > 0, "MultiSigWallet: owners required");
        require(
            _numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length,
            "MultiSigWallet: invalid threshold"
        );

        for (uint256 i = 0; i < _owners.length; i++) {
            address ownerAddr = _owners[i];
            require(ownerAddr != address(0), "MultiSigWallet: invalid owner");
            require(!isOwner[ownerAddr], "MultiSigWallet: duplicate owner");

            isOwner[ownerAddr] = true;
            owners.push(ownerAddr);
            emit OwnerAdded(ownerAddr);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
        emit ThresholdChanged(_numConfirmationsRequired);
    }

    receive() external payable {}

    // ----- Core multisig flow -----

    /// @notice Propose a new transaction (e.g. a call to mint/burn/pause/
    /// freeze on the sectorial stablecoin, or a plain value transfer).
    /// Callable by any current owner.
    function submitTransaction(address to, uint256 value, bytes calldata data)
        external
        onlyOwner
        returns (uint256 txIndex)
    {
        require(to != address(0), "MultiSigWallet: invalid recipient");

        txIndex = transactions.length;
        transactions.push(
            Transaction({to: to, value: value, data: data, executed: false, numConfirmations: 0})
        );

        emit TransactionSubmitted(txIndex, msg.sender, to, value, data);
    }

    function confirmTransaction(uint256 txIndex)
        external
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
        notConfirmed(txIndex)
    {
        Transaction storage transaction = transactions[txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[txIndex][msg.sender] = true;

        emit TransactionConfirmed(txIndex, msg.sender);
    }

    function revokeConfirmation(uint256 txIndex)
        external
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
    {
        require(isConfirmed[txIndex][msg.sender], "MultiSigWallet: tx not confirmed by caller");

        Transaction storage transaction = transactions[txIndex];
        transaction.numConfirmations -= 1;
        isConfirmed[txIndex][msg.sender] = false;

        emit TransactionRevoked(txIndex, msg.sender);
    }

    /// @notice Execute a transaction once it has reached the required
    /// number of confirmations. This is the line that actually enforces
    /// the project's core security guarantee: below-threshold execution
    /// always reverts, regardless of what any off-chain system claims.
    function executeTransaction(uint256 txIndex)
        external
        txExists(txIndex)
        notExecuted(txIndex)
    {
        Transaction storage transaction = transactions[txIndex];

        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "MultiSigWallet: not enough confirmations"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "MultiSigWallet: tx execution reverted");

        emit TransactionExecuted(txIndex, msg.sender);
    }

    // ----- Governance (self-call only: must go through submit/confirm/execute) -----

    function addOwner(address newOwner) external onlySelf {
        require(newOwner != address(0), "MultiSigWallet: invalid owner");
        require(!isOwner[newOwner], "MultiSigWallet: already an owner");

        isOwner[newOwner] = true;
        owners.push(newOwner);

        emit OwnerAdded(newOwner);
    }

    function removeOwner(address ownerToRemove) external onlySelf {
        require(isOwner[ownerToRemove], "MultiSigWallet: not an owner");
        require(
            owners.length - 1 >= numConfirmationsRequired,
            "MultiSigWallet: would break threshold"
        );

        isOwner[ownerToRemove] = false;
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == ownerToRemove) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }

        emit OwnerRemoved(ownerToRemove);
    }

    function changeThreshold(uint256 newThreshold) external onlySelf {
        require(
            newThreshold > 0 && newThreshold <= owners.length,
            "MultiSigWallet: invalid threshold"
        );
        numConfirmationsRequired = newThreshold;
        emit ThresholdChanged(newThreshold);
    }

    // ----- Views -----

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(uint256 txIndex)
        external
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations
        )
    {
        Transaction storage transaction = transactions[txIndex];
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }

    function isConfirmedBy(uint256 txIndex, address ownerAddr) external view returns (bool) {
        return isConfirmed[txIndex][ownerAddr];
    }
}
