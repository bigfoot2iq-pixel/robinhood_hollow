# ERC20 Token Amount Handling

## Overview
The raffle creation form now accepts human-readable token amounts instead of wei values, making it much more user-friendly for admins.

## Prize Ownership & Transfer Flow
**Important:** The system verifies that prizes exist in the **watchdog wallet**, which is the wallet that transfers prizes to the raffle contract when creating the raffle.

### Flow:
1. Admin creates raffle through UI
2. System verifies watchdog wallet has the prizes
3. Watchdog wallet transfers prizes to the raffle contract
4. Raffle is created on-chain

**Note:** Admins must ensure prizes are transferred to the watchdog wallet BEFORE creating the raffle!

## How It Works

### 1. Token Decimals Detection
When an admin enters an ERC20 token address, the system automatically:
- Fetches the token's `decimals()` value (e.g., 18 for most tokens, 6 for USDC)
- Fetches the token's `symbol()` for display purposes
- Shows this information in the UI

### 2. Human-Readable Input
Admins can now enter amounts like:
- `100` (for 100 tokens)
- `50.5` (for 50.5 tokens)
- `1000.123456` (for precise amounts)

### 3. Automatic Conversion
The system automatically converts these human-readable amounts to wei before:
- Sending to the verification API
- Creating the raffle in the database
- Interacting with the smart contract

### 4. Prize Verification
The verification checks:
- Token/NFT exists at the specified address
- Watchdog wallet has sufficient balance/ownership
- Token contract is valid and accessible

## Example

### Before (Wei Input)
```
Prize Amount: 1000000000000000000  // 1 token with 18 decimals
```

### After (Human-Readable Input)
```
Prize Amount: 1 USDC  // System converts to 1000000 (6 decimals)
Prize Amount: 100 DAI  // System converts to 100000000000000000000 (18 decimals)
```

## Technical Details

### Utility Functions
Located in `lib/utils/erc20.ts`:

- `toTokenUnits(amount: string, decimals: number)`: Converts human-readable to wei
- `fromTokenUnits(amount: string | bigint, decimals: number)`: Converts wei to human-readable
- `ERC20_DECIMALS_ABI`: Minimal ABI for fetching token info

### Frontend Changes
- `app/admin/raffles/create/page.tsx`: Updated to fetch decimals and convert amounts
- Validation now accepts decimal numbers (e.g., "100.5") instead of only integers
- UI shows token symbol and decimal count for clarity
- Verification checks watchdog wallet ownership
- Displays watchdog address during verification

### Backend Changes
- `app/api/admin/verify-prize/route.ts`: Verifies against watchdog wallet address
- Watchdog address is derived from `WATCHDOG_PRIVATE_KEY` environment variable
- Returns watchdog address in verification response for UI display

### Raffle Creation Flow
- `app/api/admin/raffles/route.ts`: Uses watchdog wallet to transfer prizes to contract
- Watchdog wallet must have sufficient balance/ownership before raffle creation
- Automatic approval handling for ERC20 tokens

## Benefits

1. **User-Friendly**: Admins work with familiar token amounts
2. **Error Prevention**: Less chance of entering wrong number of zeros
3. **Flexibility**: Supports any ERC20 token regardless of decimals
4. **Transparency**: Shows token symbol, decimal count, and watchdog address in UI
5. **Correct Verification**: Checks the actual wallet that will transfer the prizes
6. **Clear Messaging**: UI clearly indicates prizes must be in watchdog wallet

## Important Notes

⚠️ **Admins must transfer prizes to the watchdog wallet BEFORE creating a raffle!**

The watchdog wallet address can be found:
- In the verification section of the create raffle form
- By clicking "Verify Prize" button
- In the `.env` file as `WATCHDOG_PRIVATE_KEY` (derives the address)
