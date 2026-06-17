# Prize Verification Feature

## Overview

The raffle creation form now includes a verification step that checks if tokens and NFTs exist and are owned by the watchdog wallet before creating a raffle.

## How It Works

### 1. Verification Utilities (`lib/utils/tokenVerification.ts`)

Two main verification functions:

- **`verifyERC20Token()`**: Verifies ERC20 tokens by:
  - Checking if the address is a valid contract
  - Reading token name, symbol, and decimals
  - Checking the watchdog's balance
  - Ensuring sufficient balance for all prize amounts

- **`verifyERC721Token()`**: Verifies NFT tokens by:
  - Checking if the address is a valid contract
  - Reading token name and symbol
  - Verifying ownership of each token ID
  - Ensuring all NFTs are owned by the watchdog wallet

### 2. API Endpoint (`app/api/admin/verify-prize/route.ts`)

- **POST `/api/admin/verify-prize`**: Accepts prize details and returns verification results
- Requires admin authentication
- Validates prize type, token address, and amounts/token IDs
- Returns detailed verification results including token info and error messages

### 3. Watchdog Address Endpoint (`app/api/admin/watchdog-address/route.ts`)

- **GET `/api/admin/watchdog-address`**: Returns the watchdog wallet address
- Derives address from the `WATCHDOG_PRIVATE_KEY` environment variable
- Requires admin authentication

### 4. UI Integration (`app/admin/raffles/create/page.tsx`)

The raffle creation form now includes:

- **Verification Button**: Allows admins to verify prizes before submission
- **Status Display**: Shows verification status (idle, verifying, success, error)
- **Token Details**: Displays token name, symbol, balance, and ownership info
- **Warning Message**: Recommends verification before creating the raffle
- **Watchdog Address Display**: Shows which wallet is being checked

## Usage

1. Fill in the raffle details including prize type, token address, and amounts/token IDs
2. Click the "Verify Prize" button in the Prize section
3. Wait for verification to complete
4. Review the results:
   - ✅ **Success**: Token/NFT verified and owned by watchdog
   - ❌ **Error**: Token/NFT not found or not owned by watchdog
5. Proceed with raffle creation (verification is recommended but not required)

## Verification Checks

### For ERC20 Tokens:
- Contract exists at the specified address
- Contract implements ERC20 interface (name, symbol, decimals, balanceOf)
- Watchdog wallet has sufficient balance for all prize amounts

### For NFTs (ERC721/ERC6220):
- Contract exists at the specified address
- Contract implements ERC721 interface (name, symbol, ownerOf)
- Watchdog wallet owns all specified token IDs

## Error Messages

Common error messages you might see:

- **"Address is not a contract"**: The provided address doesn't contain a smart contract
- **"Not a valid ERC20 token contract"**: The contract doesn't implement ERC20 functions
- **"Not a valid ERC721 token contract"**: The contract doesn't implement ERC721 functions
- **"Insufficient balance"**: Watchdog doesn't have enough tokens for the prize amounts
- **"Token ID X: Owned by Y, not Z"**: The NFT is owned by a different wallet
- **"Token does not exist or error reading ownership"**: The token ID doesn't exist

## Environment Variables

Required environment variables:

```env
WATCHDOG_PRIVATE_KEY=0x...  # Private key of the watchdog wallet
NEXT_PUBLIC_RPC_URL=https://rpc.katana.network  # RPC endpoint for blockchain queries
```

## Security Notes

- The watchdog private key is only used server-side
- The watchdog address is derived from the private key and exposed via authenticated API
- All verification requests require admin authentication
- Verification is performed on-chain using read-only contract calls
