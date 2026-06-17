# Prize Transfer Flow - Explained

## The Correct Flow

You were absolutely right to question this! Here's what actually happens:

### Who Transfers Prizes?
**The WATCHDOG wallet** transfers prizes to the raffle contract, NOT the admin wallet.

### Why?
Looking at the code in `app/api/admin/raffles/route.ts`:

```typescript
const privateKey = process.env.WATCHDOG_PRIVATE_KEY;
const account = privateKeyToAccount(privateKey as `0x${string}`);

// Check watchdog balance
balance = await publicClient.readContract({
  address: prizeTokenAddress,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [account.address], // <- WATCHDOG address
});

// Watchdog approves and transfers
const approveHash = await walletClient.writeContract({
  address: prizeTokenAddress,
  abi: erc20Abi,
  functionName: "approve",
  args: [raffleContract, totalPrizeAmount],
});
```

## The Complete Flow

### Step 1: Preparation (Before Creating Raffle)
```
Admin → Transfers prizes → Watchdog Wallet
```
The admin must send the prize tokens/NFTs to the watchdog wallet first!

### Step 2: Raffle Creation (Admin UI)
```
Admin → Creates raffle via UI → Backend API
```
Admin fills out the form with human-readable amounts (e.g., "100 USDC")

### Step 3: Verification
```
Backend → Checks watchdog wallet → Has prizes?
```
System verifies the watchdog wallet has sufficient balance

### Step 4: Contract Interaction
```
Watchdog Wallet → Approves & Transfers → Raffle Contract
```
The watchdog wallet transfers prizes to the raffle contract

### Step 5: Raffle Active
```
Raffle Contract → Holds prizes → Distributes to winners
```
Contract now holds the prizes and will distribute them when raffle ends

## Why Use Watchdog Wallet?

1. **Security**: Admin wallet doesn't need to be exposed for contract interactions
2. **Automation**: Watchdog can automatically handle raffle operations
3. **Separation**: Admin UI operations separate from blockchain operations
4. **Gas Management**: Watchdog wallet can be funded specifically for gas fees

## What We Fixed

### Before (Incorrect):
- ❌ Verified admin wallet
- ❌ But watchdog wallet transferred prizes
- ❌ Mismatch caused confusion

### After (Correct):
- ✅ Verify watchdog wallet
- ✅ Watchdog wallet transfers prizes
- ✅ Everything matches!

## Admin Checklist

When creating a raffle:

1. ✅ Transfer prizes to watchdog wallet FIRST
2. ✅ Connect admin wallet to UI
3. ✅ Fill out raffle form
4. ✅ Click "Verify Prize" (checks watchdog wallet)
5. ✅ Submit form (watchdog transfers to contract)

## Watchdog Wallet Address

The watchdog address is derived from `WATCHDOG_PRIVATE_KEY` in `.env`:
```
WATCHDOG_PRIVATE_KEY=0xf6e1b013a0539ea8ef4675cfb19ae4a16b2a5f6ff1f2b144327491cdec35a91d
```

This derives to address: (shown in UI during verification)
