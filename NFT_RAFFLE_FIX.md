# NFT Raffle Creation Fix

## Problem
The `createRaffleWithNFT` function was failing with error `0x59c896be` which decodes to `TransferCallerNotOwnerNorApproved()`. 

### Root Cause
The API was using the **watchdog wallet** to call the contract, but the **admin wallet** owned the NFTs. When the contract tried to transfer NFTs from `msg.sender` (watchdog) to the contract, it failed because:
1. The watchdog doesn't own the NFTs
2. The watchdog doesn't have approval to transfer them

## Solution
Changed the flow so the **admin wallet** creates the raffle directly:

### New Flow

#### 1. Admin Prepares Transaction (API validates)
- API endpoint: `POST /api/admin/raffles`
- Validates admin owns NFTs
- Checks if NFTs are approved for the raffle contract
- Returns transaction data for admin to sign
- Returns error if approval is missing

#### 2. Admin Signs Transaction (Frontend)
- Admin's wallet signs the `createRaffleWithNFT` transaction
- NFTs are transferred from admin → raffle contract
- Transaction is sent to blockchain

#### 3. Backend Confirms (API saves to DB)
- API endpoint: `POST /api/admin/raffles/confirm`
- Waits for transaction confirmation
- Extracts `raffleId` from event logs
- Saves raffle to database

### Key Changes

#### API Route (`app/api/admin/raffles/route.ts`)
- Removed watchdog wallet execution
- Added NFT ownership and approval validation
- Returns transaction data instead of executing it
- Validates admin wallet has sufficient balance/ownership

#### Confirm Route (`app/api/admin/raffles/confirm/route.ts`)
- New endpoint to handle post-transaction confirmation
- Waits for transaction receipt
- Extracts raffle ID from events
- Saves to database

#### Frontend (`app/admin/raffles/create/page.tsx`)
- Added `useWriteContract` hook
- Updated `onSubmit` to handle 3-step flow
- Better error handling for approval issues
- Shows clear error messages when approval is needed

### Admin Requirements

Before creating an NFT raffle, the admin must:

1. **Own the NFTs** in their connected wallet
2. **Approve the raffle contract** to transfer the NFTs:
   - Option A: Call `setApprovalForAll(raffleContract, true)` on the NFT contract
   - Option B: Call `approve(raffleContract, tokenId)` for each NFT

The API will return a clear error message if approval is missing.

### Benefits
- ✅ Admin has full control over their NFTs
- ✅ No need for watchdog to hold NFTs
- ✅ Clear error messages for missing approvals
- ✅ Validates ownership before transaction
- ✅ Works for both ERC721 and ERC6220 NFTs
