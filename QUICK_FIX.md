# Quick Fix: "Invalid raffle state" Error

## The Problem

Users getting this error when trying to join an NFT raffle:
```
Transaction failed with error 'Invalid raffle state'
```

## The Cause

The raffle is in **CREATED** state instead of **ACTIVE** state on the blockchain.

## The Fix (3 Steps)

### Step 1: Find the Chain Raffle ID

```bash
npx tsx scripts/find-chain-raffle-id.ts "Raffle Title"
```

Look for the `Chain Raffle ID` in the output (e.g., `42`).

### Step 2: Verify the State

```bash
npx tsx scripts/check-raffle-state.ts 42
```

If it shows `State: 0 (CREATED)`, proceed to step 3.

### Step 3: Activate the Raffle

```bash
npx tsx scripts/activate-raffle.ts 42
```

**Done!** Users can now join the raffle.

## Requirements

Add to `.env.local`:
```bash
WATCHDOG_PRIVATE_KEY=0x...
# OR
ADMIN_PRIVATE_KEY=0x...
```

## Why This Happened

The raffle was created with a **future start date**, so it was created in CREATED state. The contract requires manual activation when the start date arrives.

## Prevention

When creating raffles that should be immediately active:
- Set `start_date` to the **current time or past**
- The system will automatically create it in ACTIVE state

## Need Help?

See `RAFFLE_STATE_DEBUG.md` for detailed explanation.
See `scripts/README.md` for full script documentation.
