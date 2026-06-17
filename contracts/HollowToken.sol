// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title HollowToken
 * @dev ERC20 token for the Katana Raffles platform.
 * Claim-only: 3 tiers based on KAT balance.
 *   Tier 0: KAT whale  (>= 10k KAT)   → 200 HOLLOW
 *   Tier 1: KAT holder (> 0 KAT)       → 100 HOLLOW
 *   Tier 2: Base (everyone else)        →  25 HOLLOW
 * Claim cooldown and price are configurable by the owner.
 */
contract HollowToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard, Pausable {
    uint256 public constant TIER_KAT_WHALE_AMOUNT = 200;
    uint256 public constant TIER_KAT_HOLDER_AMOUNT = 100;
    uint256 public constant TIER_BASE_AMOUNT = 25;
    uint256 public constant KAT_WHALE_THRESHOLD = 10_000 * 10 ** 18;
    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 10 ** 18; // 100 billion

    address public katToken;
    uint256 public claimPrice;
    uint256 public claimCooldown;

    mapping(address => uint256) public lastClaimTimestamp;

    event TokensClaimed(address indexed claimer, uint256 amount, uint8 tier);
    event KatTokenUpdated(address oldKat, address newKat);
    event OwnerWithdrawal(address indexed owner, uint256 amount);
    event ClaimPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event ClaimCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
    event ETHWithdrawn(address indexed owner, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        address katToken_,
        uint256 claimPrice_,
        uint256 claimCooldown_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        katToken = katToken_;
        claimPrice = claimPrice_;
        claimCooldown = claimCooldown_;
    }

    function claimTokens() external payable nonReentrant whenNotPaused {
        require(msg.value >= claimPrice, "Insufficient payment");
        require(block.timestamp >= lastClaimTimestamp[msg.sender] + claimCooldown, "Cooldown not elapsed");
        lastClaimTimestamp[msg.sender] = block.timestamp;

        (uint256 claimAmount, uint8 tier) = _getClaimInfo(msg.sender);
        uint256 mintAmount = claimAmount * 10 ** decimals();
        require(totalSupply() + mintAmount <= MAX_SUPPLY, "Max supply reached");
        _mint(msg.sender, mintAmount);

        emit TokensClaimed(msg.sender, claimAmount, tier);
    }

    function canClaim(address account) external view returns (bool) {
        return block.timestamp >= lastClaimTimestamp[account] + claimCooldown;
    }

    function getClaimAmount(address account) external view returns (uint256 amount, uint8 tier) {
        return _getClaimInfo(account);
    }

    function getLastClaimTimestamp(address account) external view returns (uint256) {
        return lastClaimTimestamp[account];
    }

    function _getClaimInfo(address account) internal view returns (uint256 amount, uint8 tier) {
        // Tier 0: KAT whale (>= 10k KAT)
        if (katToken != address(0)) {
            try IERC20(katToken).balanceOf(account) returns (uint256 katBalance) {
                if (katBalance >= KAT_WHALE_THRESHOLD) {
                    return (TIER_KAT_WHALE_AMOUNT, 0);
                }
                if (katBalance > 0) {
                    return (TIER_KAT_HOLDER_AMOUNT, 1);
                }
            } catch {}
        }

        // Tier 2: Base
        return (TIER_BASE_AMOUNT, 2);
    }

    function setKatToken(address katToken_) external onlyOwner {
        address old = katToken;
        katToken = katToken_;
        emit KatTokenUpdated(old, katToken_);
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

    function setClaimPrice(uint256 newPrice) external onlyOwner {
        uint256 old = claimPrice;
        claimPrice = newPrice;
        emit ClaimPriceUpdated(old, newPrice);
    }

    function setClaimCooldown(uint256 newCooldown) external onlyOwner {
        uint256 old = claimCooldown;
        claimCooldown = newCooldown;
        emit ClaimCooldownUpdated(old, newCooldown);
    }

    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        emit ETHWithdrawn(owner(), balance);
        payable(owner()).transfer(balance);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
