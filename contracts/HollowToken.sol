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
 * Tiered free claim: any account may claim once per `claimCooldown` seconds.
 * The amount minted depends on which "top token" tier the claimer holds:
 *
 *   Tier 1 — holds >= 1 of any address in `tier1Tokens` (the top-5 tokens)
 *            -> mints `tier1Amount`
 *   Tier 2 — holds >= 1 of any address in `tier2Tokens` (the next-5 tokens)
 *            -> mints `tier2Amount`
 *   Tier 3 — holds none of the above
 *            -> mints `tier3Amount`
 *
 * Tier 1 takes precedence over Tier 2. Holding multiple qualifying tokens (or
 * multiple units of one) does NOT increase the reward — eligibility is binary
 * per tier: hold at least one, get the tier amount.
 *
 * The owner configures, at runtime: the two token lists, the three tier
 * amounts (independently), and the single global `claimCooldown` window that
 * applies to every tier. Amounts are in base units (wei, 18 decimals), e.g.
 * 200 * 10**18 mints 200 HOLLOW.
 */
contract HollowToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard, Pausable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000_000 * 10 ** 18; // 1 trillion

    /// @notice Reward for holding a top-5 token (tier 1), in base units. 0 disables tier-1 claims.
    uint256 public tier1Amount;
    /// @notice Reward for holding a next-5 token (tier 2), in base units. 0 disables tier-2 claims.
    uint256 public tier2Amount;
    /// @notice Reward for holding none of the listed tokens (tier 3), in base units. 0 disables tier-3 claims.
    uint256 public tier3Amount;

    /// @notice Top-5 token contract addresses (ERC-20 / ERC-721). Holding any one qualifies for tier 1.
    address[] public tier1Tokens;
    /// @notice Next-5 token contract addresses (ERC-20 / ERC-721). Holding any one qualifies for tier 2.
    address[] public tier2Tokens;

    /// @notice Minimum seconds between claims for a given address. Global across all tiers.
    uint256 public claimCooldown;

    /// @dev ERC-165 interface id for ERC-1155. Used to reject multi-id token contracts,
    ///      which have no single-arg balanceOf(address) and cannot be tier-checked.
    bytes4 private constant _ERC1155_INTERFACE_ID = 0xd9b67a26;

    mapping(address => uint256) public lastClaimTimestamp;

    event TokensClaimed(address indexed claimer, uint8 indexed tier, uint256 amount);
    event Tier1AmountUpdated(uint256 oldAmount, uint256 newAmount);
    event Tier2AmountUpdated(uint256 oldAmount, uint256 newAmount);
    event Tier3AmountUpdated(uint256 oldAmount, uint256 newAmount);
    event Tier1TokensUpdated(address[] tokens);
    event Tier2TokensUpdated(address[] tokens);
    event ClaimCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
    event OwnerWithdrawal(address indexed owner, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 tier1Amount_,
        uint256 tier2Amount_,
        uint256 tier3Amount_,
        uint256 claimCooldown_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        tier1Amount = tier1Amount_;
        tier2Amount = tier2Amount_;
        tier3Amount = tier3Amount_;
        claimCooldown = claimCooldown_;
    }

    // ─── Claiming ──────────────────────────────────────────────────────

    /// @notice Free claim of the caller's tier amount, once per `claimCooldown`.
    function claimTokens() external nonReentrant whenNotPaused {
        require(
            block.timestamp >= lastClaimTimestamp[msg.sender] + claimCooldown,
            "Cooldown not elapsed"
        );

        uint8 tier = getTier(msg.sender);
        uint256 amount = _amountForTier(tier);
        require(amount > 0, "Claiming disabled");
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply reached");

        lastClaimTimestamp[msg.sender] = block.timestamp;
        _mint(msg.sender, amount);

        emit TokensClaimed(msg.sender, tier, amount);
    }

    function canClaim(address account) external view returns (bool) {
        return block.timestamp >= lastClaimTimestamp[account] + claimCooldown;
    }

    function getLastClaimTimestamp(address account) external view returns (uint256) {
        return lastClaimTimestamp[account];
    }

    // ─── Tier resolution ───────────────────────────────────────────────

    /// @notice Tier the account currently qualifies for: 1 (top-5), 2 (next-5), or 3 (none).
    function getTier(address account) public view returns (uint8) {
        if (_holdsAny(account, tier1Tokens)) return 1;
        if (_holdsAny(account, tier2Tokens)) return 2;
        return 3;
    }

    /// @notice HOLLOW the account would receive on its next claim (its tier amount), in base units.
    function getClaimAmount(address account) public view returns (uint256) {
        return _amountForTier(getTier(account));
    }

    function _amountForTier(uint8 tier) private view returns (uint256) {
        if (tier == 1) return tier1Amount;
        if (tier == 2) return tier2Amount;
        return tier3Amount;
    }

    /// @dev True if `account` holds >= 1 unit of any token in `tokens`.
    function _holdsAny(address account, address[] storage tokens) private view returns (bool) {
        uint256 len = tokens.length;
        for (uint256 i = 0; i < len; i++) {
            if (_balanceOf(tokens[i], account) > 0) return true;
        }
        return false;
    }

    /// @dev Low-level `balanceOf(address)` read. Works for ERC-20 and ERC-721.
    ///      Non-conforming targets (e.g. ERC-1155, EOAs) safely return 0 instead of reverting.
    function _balanceOf(address token, address account) private view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", account)
        );
        if (ok && data.length >= 32) {
            return abi.decode(data, (uint256));
        }
        return 0;
    }

    // ─── Admin: tier amounts (configurable per category) ───────────────

    function setTier1Amount(uint256 newAmount) external onlyOwner {
        emit Tier1AmountUpdated(tier1Amount, newAmount);
        tier1Amount = newAmount;
    }

    function setTier2Amount(uint256 newAmount) external onlyOwner {
        emit Tier2AmountUpdated(tier2Amount, newAmount);
        tier2Amount = newAmount;
    }

    function setTier3Amount(uint256 newAmount) external onlyOwner {
        emit Tier3AmountUpdated(tier3Amount, newAmount);
        tier3Amount = newAmount;
    }

    // ─── Admin: token lists ────────────────────────────────────────────

    /// @notice Overwrite the top-5 token list (tier 1). Reverts if any address is an ERC-1155.
    function setTier1Tokens(address[] calldata tokens) external onlyOwner {
        _assertNoERC1155(tokens);
        tier1Tokens = tokens;
        emit Tier1TokensUpdated(tokens);
    }

    /// @notice Overwrite the next-5 token list (tier 2). Reverts if any address is an ERC-1155.
    function setTier2Tokens(address[] calldata tokens) external onlyOwner {
        _assertNoERC1155(tokens);
        tier2Tokens = tokens;
        emit Tier2TokensUpdated(tokens);
    }

    /// @dev Reverts if any token in `tokens` reports ERC-1155 support via ERC-165.
    ///      Non-ERC-165 contracts (e.g. plain ERC-20) are allowed.
    function _assertNoERC1155(address[] calldata tokens) private view {
        uint256 len = tokens.length;
        for (uint256 i = 0; i < len; i++) {
            (bool ok, bytes memory data) = tokens[i].staticcall(
                abi.encodeWithSignature("supportsInterface(bytes4)", _ERC1155_INTERFACE_ID)
            );
            if (ok && data.length >= 32 && abi.decode(data, (bool))) {
                revert("ERC-1155 not supported");
            }
        }
    }

    function getTier1Tokens() external view returns (address[] memory) {
        return tier1Tokens;
    }

    function getTier2Tokens() external view returns (address[] memory) {
        return tier2Tokens;
    }

    // ─── Admin: global cooldown window ─────────────────────────────────

    function setClaimCooldown(uint256 newCooldown) external onlyOwner {
        emit ClaimCooldownUpdated(claimCooldown, newCooldown);
        claimCooldown = newCooldown;
    }

    // ─── Admin: supply ─────────────────────────────────────────────────

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
