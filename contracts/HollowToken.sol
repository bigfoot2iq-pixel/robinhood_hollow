// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title HollowToken
 * @dev ERC20 token for the LitVM Raffles platform.
 *
 * Free claim: any account may claim `claimAmount` tokens at no cost (gas only),
 * once per `claimCooldown` seconds. The owner controls both the claim amount and
 * the cooldown duration at runtime via setClaimAmount / setClaimCooldown.
 *
 * `claimAmount` is denominated in base units (wei, 18 decimals), e.g.
 * 100 * 10**18 mints 100 HOLLOW per claim.
 */
contract HollowToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard, Pausable {
    uint256 public constant MAX_SUPPLY = 21_000_000 * 10 ** 18; // 21 million

    /// @notice Tokens minted per claim, in base units (wei). 0 disables claiming.
    uint256 public claimAmount;
    /// @notice Minimum seconds between claims for a given address.
    uint256 public claimCooldown;

    mapping(address => uint256) public lastClaimTimestamp;

    event TokensClaimed(address indexed claimer, uint256 amount);
    event ClaimAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event ClaimCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
    event OwnerWithdrawal(address indexed owner, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 claimAmount_,
        uint256 claimCooldown_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        claimAmount = claimAmount_;
        claimCooldown = claimCooldown_;
    }

    /// @notice Free claim of `claimAmount` tokens, once per `claimCooldown`.
    function claimTokens() external nonReentrant whenNotPaused {
        require(claimAmount > 0, "Claiming disabled");
        require(
            block.timestamp >= lastClaimTimestamp[msg.sender] + claimCooldown,
            "Cooldown not elapsed"
        );
        require(totalSupply() + claimAmount <= MAX_SUPPLY, "Max supply reached");

        lastClaimTimestamp[msg.sender] = block.timestamp;
        _mint(msg.sender, claimAmount);

        emit TokensClaimed(msg.sender, claimAmount);
    }

    function canClaim(address account) external view returns (bool) {
        return block.timestamp >= lastClaimTimestamp[account] + claimCooldown;
    }

    function getLastClaimTimestamp(address account) external view returns (uint256) {
        return lastClaimTimestamp[account];
    }

    function setClaimAmount(uint256 newAmount) external onlyOwner {
        uint256 old = claimAmount;
        claimAmount = newAmount;
        emit ClaimAmountUpdated(old, newAmount);
    }

    function setClaimCooldown(uint256 newCooldown) external onlyOwner {
        uint256 old = claimCooldown;
        claimCooldown = newCooldown;
        emit ClaimCooldownUpdated(old, newCooldown);
    }

    function ownerWithdraw(uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply reached");
        _mint(owner(), amount);
        emit OwnerWithdrawal(owner(), amount);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply reached");
        _mint(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
