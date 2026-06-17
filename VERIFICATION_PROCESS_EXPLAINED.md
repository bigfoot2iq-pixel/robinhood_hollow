# Prize Verification Process - Step by Step

## Overview
The verification checks if the **WATCHDOG WALLET** has the prizes, NOT the admin wallet. This is because the watchdog wallet is the one that transfers prizes to the contract.

---

## Complete Flow

### 1️⃣ Frontend: User Clicks "Verify Prize"
**File:** `app/admin/raffles/create/page.tsx`

```typescript
handleVerifyPrize() {
  // 1. Check wallet is connected
  if (!address) return;
  
  // 2. Request admin signature for authentication
  const signature = await signMessageAsync({ message });
  
  // 3. Convert human-readable amounts to wei
  // Example: "100" USDC (6 decimals) → "100000000"
  const prizeAmounts = humanAmounts.map(amount => 
    toTokenUnits(amount, tokenDecimals)
  );
  
  // 4. Send request to API
  fetch("/api/admin/verify-prize", {
    headers: {
      "x-admin-wallet": address,        // Admin's wallet (for auth)
      "x-admin-signature": signature,   // Signature (for auth)
      "x-admin-timestamp": timestamp,   // Timestamp (for auth)
    },
    body: {
      prize_type: "erc20",
      prize_token_address: "0x5aAb...",
      prize_amounts: ["100000000000000000000"], // In wei
    }
  });
}
```

---

### 2️⃣ Backend: Verify Admin Authentication
**File:** `app/api/admin/verify-prize/route.ts`

```typescript
// Step 1: Verify admin signature
const isAdmin = await verifyAdminSignature(request);
if (!isAdmin) {
  return { error: "Unauthorized" };
}

// Step 2: Get watchdog wallet address from environment
const watchdogPrivateKey = process.env.WATCHDOG_PRIVATE_KEY;
const watchdogAccount = privateKeyToAccount(watchdogPrivateKey);
const watchdogAddress = watchdogAccount.address;
// Example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```

---

### 3️⃣ Backend: Call Verification Function
**File:** `app/api/admin/verify-prize/route.ts`

```typescript
// For ERC20 tokens:
const totalAmount = prize_amounts.reduce((sum, amount) => sum + BigInt(amount), 0n);

const result = await verifyERC20Token(
  tokenAddress,      // "0x5aAb9099280Eaa5Da559f92d4DA0D73148957Bb4"
  totalAmount,       // 100000000000000000000n (100 tokens in wei)
  watchdogAddress    // "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
);
```

---

### 4️⃣ Blockchain: Check Token Contract
**File:** `lib/utils/tokenVerification.ts`

#### Step 4.1: Verify Contract Exists
```typescript
const publicClient = createPublicClient({
  chain: katanaNetwork,
  transport: http("https://rpc.katana.network"),
});

// Check if address has bytecode (is a contract)
const bytecode = await publicClient.getBytecode({ 
  address: tokenAddress 
});

if (!bytecode || bytecode === "0x") {
  return { error: "Address is not a contract" };
}
```

#### Step 4.2: Read Token Information
```typescript
// Call ERC20 contract functions
const [name, symbol, decimals, balance] = await Promise.all([
  publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "name",
    // Returns: "Hollow Token"
  }),
  publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "symbol",
    // Returns: "HOLLOW"
  }),
  publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "decimals",
    // Returns: 18
  }),
  publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [watchdogAddress], // ← CHECKING WATCHDOG WALLET!
    // Returns: 500000000000000000000n (500 tokens)
  }),
]);
```

#### Step 4.3: Compare Balance
```typescript
// Check if watchdog has enough tokens
if (balance < requiredAmount) {
  return {
    isValid: false,
    error: `Insufficient balance. Required: ${requiredAmount}, Available: ${balance}`,
    details: { name, symbol, decimals, balance }
  };
}

// Success!
return {
  isValid: true,
  details: { name, symbol, decimals, balance }
};
```

---

### 5️⃣ Backend: Return Result to Frontend
**File:** `app/api/admin/verify-prize/route.ts`

```typescript
return NextResponse.json({
  isValid: true,
  message: "ERC20 token verified successfully",
  details: {
    name: "Hollow Token",
    symbol: "HOLLOW",
    decimals: 18,
    balance: "500000000000000000000",
    ownerAddress: watchdogAddress, // Show which wallet was checked
  },
});
```

---

### 6️⃣ Frontend: Display Result
**File:** `app/admin/raffles/create/page.tsx`

```typescript
if (data.isValid) {
  setVerificationStatus("success");
  setVerificationDetails(data.details);
  setWatchdogAddress(data.details.ownerAddress);
  
  // UI shows:
  // ✅ Prize verified successfully!
  // Token: Hollow Token (HOLLOW)
  // Available Balance: 500
  // Owner: 0x742d...bEb
}
```

---

## For NFTs (ERC721)

The process is similar but checks ownership instead of balance:

```typescript
// For each NFT token ID
const owner = await publicClient.readContract({
  address: tokenAddress,
  abi: erc721Abi,
  functionName: "ownerOf",
  args: [tokenId], // e.g., 123
  // Returns: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
});

// Check if watchdog owns it
const isOwned = owner.toLowerCase() === watchdogAddress.toLowerCase();

if (!isOwned) {
  return {
    error: `Token ID ${tokenId}: Owned by ${owner}, not ${watchdogAddress}`
  };
}
```

---

## Key Points

### ✅ What Gets Verified:
1. Token contract exists and is valid
2. Token contract implements ERC20/ERC721 interface
3. **WATCHDOG WALLET** has sufficient balance/ownership
4. Token amounts are valid numbers

### ❌ What Does NOT Get Verified:
- Admin wallet balance (admin doesn't transfer prizes)
- Allowances (handled during raffle creation)
- Gas fees
- Network connectivity (will fail if RPC is down)

### 🔑 Important:
**The watchdog wallet MUST have the prizes BEFORE verification!**

Admin workflow:
1. Transfer prizes → Watchdog wallet (manual)
2. Click "Verify Prize" → Checks watchdog wallet
3. Create raffle → Watchdog transfers to contract

---

## Environment Variables Used

```env
# Watchdog wallet private key (derives address)
WATCHDOG_PRIVATE_KEY=0xf6e1b013a0539ea8ef4675cfb19ae4a16b2a5f6ff1f2b144327491cdec35a91d

# RPC endpoint for blockchain queries
NEXT_PUBLIC_RPC_URL=https://rpc.katana.network
```

---

## Blockchain Calls Made

For ERC20 verification:
1. `eth_getCode` - Check if contract exists
2. `name()` - Get token name
3. `symbol()` - Get token symbol
4. `decimals()` - Get token decimals
5. `balanceOf(watchdogAddress)` - Get watchdog's balance

For ERC721 verification:
1. `eth_getCode` - Check if contract exists
2. `name()` - Get NFT collection name
3. `symbol()` - Get NFT collection symbol
4. `ownerOf(tokenId)` - Check who owns each NFT

All calls are READ-ONLY (no gas fees, no transactions).
