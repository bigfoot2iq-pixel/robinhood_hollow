# Raffle State Debug Guide

## Problem

Transaction failed with error: **"Invalid raffle state"**

```
Transaction Hash: 0xd885adab1b9791d2359ada65a49ad9438232076da8dd7429a4de37f8a4096763
Status: Fail with error 'Invalid raffle state'
Contract: 0xEa4072a2D9961983E8FaFc3165D06BDcE6093DC5
```

## Root Cause

The raffle is in **CREATED** state (0) instead of **ACTIVE** state (1).

The `joinRaffle` function requires the raffle to be in ACTIVE state:

```solidity
function joinRaffle(uint256 raffleId_, uint256 tokenAmount_)
    external
    raffleExists(raffleId_)
    raffleInState(raffleId_, RaffleState.ACTIVE)  // ← This check is failing
    whenNotPaused
    nonReentrant
```

## Why This Happens

When creating a raffle, there are two possible functions:

1. **`createRaffleWithNFT`** - Creates raffle in **CREATED** state (requires manual activation)
2. **`createAndActivateNFTRaffle`** - Creates raffle in **ACTIVE** state (ready immediately)

The API automatically chooses based on the start date:

```typescript
const shouldActivate = startDate <= new Date();
```

- If `start_date <= now` → calls `createAndActivateNFTRaffle` (ACTIVE)
- If `start_date > now` → calls `createRaffleWithNFT` (CREATED)

**The production raffle was created with a future start date**, so it's in CREATED state.

## Solution

### Option 1: Activate the Raffle (Recommended)

Use the activation script to change the raffle from CREATED → ACTIVE:

```bash
# Check current state
npx tsx scripts/check-raffle-state.ts <chainRaffleId>

# Activate the raffle
npx tsx scripts/activate-raffle.ts <chainRaffleId>
```

**Requirements:**
- `WATCHDOG_PRIVATE_KEY` or `ADMIN_PRIVATE_KEY` in `.env.local`
- The wallet must be the owner or watchdog of the contract

### Option 2: Wait for Start Date

If the raffle has a specific start date in the future, wait until that date passes. The frontend will show it as "active" based on the date, but users still can't join until the contract state is ACTIVE.

### Option 3: Recreate the Raffle

If the raffle hasn't had any entries yet, you can:
1. Cancel the current raffle using `emergencyWithdraw`
2. Create a new raffle with `start_date` set to the past or present

## Contract State Flow

```
CREATED (0)  →  [activateRaffle()]  →  ACTIVE (1)  →  [endRaffle()]  →  COMPLETED (2)
                                                                              ↓
                                                                        CANCELLED (3)
```

## Diagnostic Scripts

### Check Raffle State

```bash
npx tsx scripts/check-raffle-state.ts <chainRaffleId>
```

Output:
```
📊 Raffle Details:
─────────────────────────────────────
Prize Type:    1 (NFT)
Prize Token:   0x...
Prize Count:   1
State:         0 (CREATED)
Has Winners:   false
─────────────────────────────────────

⚠️  WARNING: Raffle is in CREATED state!
   Users cannot join until it's activated.

   To fix: Call activateRaffle(<chainRaffleId>) from owner/watchdog wallet
```

### Activate Raffle

```bash
npx tsx scripts/activate-raffle.ts <chainRaffleId>
```

Output:
```
🔧 Activating raffle #<chainRaffleId>
   Contract: 0xEa4072a2D9961983E8FaFc3165D06BDcE6093DC5
   From: 0x...

📝 Sending activateRaffle transaction...
   Transaction hash: 0x...
   Waiting for confirmation...

✅ Raffle activated successfully!
   Block: 23936123
   Gas used: 45123

   New state: 1 (ACTIVE)
```

## Prevention

To prevent this in the future:

1. **Set start_date to the past or present** when creating raffles that should be immediately active
2. **Check the raffle state** after creation using the diagnostic script
3. **Monitor the frontend** - if users report they can't join, check the on-chain state

## Local vs Production Difference

Your local environment works because:
- You're likely setting `start_date` to the current time or past
- The API calls `createAndActivateNFTRaffle` which creates in ACTIVE state

Production failed because:
- The raffle was created with a future `start_date`
- The API called `createRaffleWithNFT` which creates in CREATED state
- No one called `activateRaffle()` when the start date arrived

## Contract Functions Reference

```solidity
// Create in CREATED state (requires activation)
function createRaffleWithNFT(
    PrizeType prizeType_,
    address prizeToken_,
    uint256[] calldata prizeTokenIds_
) external returns (uint256)

// Create in ACTIVE state (ready immediately)
function createAndActivateNFTRaffle(
    PrizeType prizeType_,
    address prizeToken_,
    uint256[] calldata prizeTokenIds_
) external returns (uint256)

// Activate a raffle in CREATED state
function activateRaffle(uint256 raffleId_) external

// Check if raffle is active
function isRaffleActive(uint256 raffleId_) external view returns (bool)

// Get raffle state
function getRaffleState(uint256 raffleId_) external view returns (RaffleState)
```

## Quick Fix Command

If you know the chain raffle ID and have the watchdog/admin key:

```bash
# One-liner to activate
npx tsx scripts/activate-raffle.ts <chainRaffleId>
```

Replace `<chainRaffleId>` with the actual on-chain raffle ID (not the database ID).
