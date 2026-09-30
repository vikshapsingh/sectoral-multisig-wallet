// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SectorialStableCoin
/// @notice Prototype sectorial stablecoin (SSC): an ERC20 token scoped to a
/// specific sector/industry via its `sector` field, for academic/demo use.
/// It is NOT redeemable legal tender and is not backed by any real
/// collateral in this prototype. All privileged actions (mint, burn,
/// pause, freeze) are restricted to `owner`. In this project `owner` is
/// set to the MultiSigWallet's address at deployment, so no single key can
/// move supply or freeze funds unilaterally — every mint, burn, pause or
/// freeze only happens once the configured number of wallet owners have
/// approved the underlying transaction.
contract SectorialStableCoin is ERC20, ERC20Pausable, Ownable {
    /// @notice Free-text label identifying which sector/industry this
    /// token instance is scoped to (e.g. "Agriculture", "Healthcare").
    string public sector;

    mapping(address => bool) public isFrozen;

    event TokensIssued(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event AddressFrozen(address indexed account);
    event AddressUnfrozen(address indexed account);
    event SectorUpdated(string newSector);

    constructor(string memory name_, string memory symbol_, string memory sector_, address initialOwner)
        ERC20(name_, symbol_)
        Ownable(initialOwner)
    {
        sector = sector_;
    }

    /// @notice Mint new tokens. Restricted to `owner` (the MultiSigWallet),
    /// so minting only ever happens after the configured number of wallet
    /// owners have approved the underlying transaction.
    function mint(address to, uint256 amount) external onlyOwner whenNotPaused {
        require(!isFrozen[to], "SectorialStableCoin: recipient frozen");
        _mint(to, amount);
        emit TokensIssued(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }

    /// @notice Emergency-stop switch: blocks minting and all transfers.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Compliance control: blocks a specific address from sending
    /// or receiving the token without affecting the rest of the supply.
    function freeze(address account) external onlyOwner {
        isFrozen[account] = true;
        emit AddressFrozen(account);
    }

    function unfreeze(address account) external onlyOwner {
        isFrozen[account] = false;
        emit AddressUnfrozen(account);
    }

    function updateSector(string calldata newSector) external onlyOwner {
        sector = newSector;
        emit SectorUpdated(newSector);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        if (from != address(0)) {
            require(!isFrozen[from], "SectorialStableCoin: sender frozen");
        }
        if (to != address(0)) {
            require(!isFrozen[to], "SectorialStableCoin: recipient frozen");
        }
        super._update(from, to, value);
    }
}
