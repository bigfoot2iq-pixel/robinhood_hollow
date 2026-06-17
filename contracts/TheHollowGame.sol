// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TheHollowGame
 * @notice Pay-to-play contract for The Hollow game
 * @dev Players pay ETH to play, owner can set price and withdraw funds
 */
contract TheHollowGame is Ownable, ReentrancyGuard {
    // Play price in wei (default ~0.001 USD worth of ETH)
    // At $2,747.87/ETH: 0.001 USD ÷ 2747.87 = 0.000000364 ETH ≈ 364000000000 wei
    // Using a round number for simplicity
    uint256 public playPrice = 364000000000; // ~$0.001 at $2,747.87/ETH

    // Events
    event PlayPurchased(address indexed player, uint256 amount, uint256 timestamp);
    event PlayPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Pay to play the game
     * @dev Emits PlayPurchased event on success
     */
    function payToPlay() external payable nonReentrant {
        require(msg.value >= playPrice, "Insufficient payment");
        
        // Refund excess payment
        uint256 excess = msg.value - playPrice;
        if (excess > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excess}("");
            require(refundSuccess, "Refund failed");
        }

        emit PlayPurchased(msg.sender, playPrice, block.timestamp);
    }

    /**
     * @notice Set the play price (owner only)
     * @param _newPrice New price in wei
     */
    function setPlayPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Price must be greater than 0");
        
        uint256 oldPrice = playPrice;
        playPrice = _newPrice;
        
        emit PlayPriceUpdated(oldPrice, _newPrice);
    }

    /**
     * @notice Get the current play price
     * @return Current price in wei
     */
    function getPlayPrice() external view returns (uint256) {
        return playPrice;
    }

    /**
     * @notice Withdraw all funds to owner (owner only)
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(owner(), balance);
    }

    /**
     * @notice Get contract balance
     * @return Contract balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Allow contract to receive ETH directly
    receive() external payable {}
}
