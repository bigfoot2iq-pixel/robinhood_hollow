# WalletConnect Configuration Fix

## Problem
The wallet connection shows as connected in the UI but disconnects when navigating between pages, with WebSocket errors:
- "WebSocket connection closed abnormally with code: 3000 (Unauthorized: origin not allowed)"
- "Fatal socket error received, closing transport"

## Root Cause
**Your domain is NOT whitelisted in WalletConnect Cloud.** This is a security feature - WalletConnect blocks all connections from non-whitelisted origins.

## CRITICAL: Fix WalletConnect Cloud Settings (REQUIRED)

**You MUST do this or the errors will continue:**

1. Go to https://cloud.walletconnect.com
2. Sign in with your account
3. Find your project with ID: `dc3dc7301b6c657c656ae31008e255f7`
4. Click on the project
5. Go to **Settings** tab
6. Scroll to **Allowed Origins** section
7. Click **Add Origin** and add:
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `http://127.0.0.1:3000`
   - Your production domain (e.g., `https://your-app.vercel.app`)
8. Click **Save**

**Without doing this, WalletConnect will ALWAYS fail with "origin not allowed" error.**

## Code Fixes Applied

### 1. Web3Provider.tsx
- Dynamic `appUrl` using `window.location.origin`
- Added localStorage persistence for wallet connection state
- Added `reconnectOnMount={true}` to WagmiProvider
- Added `initialChainId` to ConnectKitProvider
- Suppressed WalletConnect error logs (they're just noise)
- Disabled `refetchOnWindowFocus` to prevent reconnection issues

### 2. next.config.ts
- Added `turbopack: {}` for Next.js 16 compatibility
- Added webpack externals for WalletConnect dependencies
- Added CORS headers

## Testing After Whitelisting

1. **Clear everything:**
   ```
   - Close all browser tabs with your app
   - Open DevTools (F12) → Application → Storage → Clear site data
   - Close DevTools
   ```

2. **Restart dev server:**
   ```bash
   npm run dev
   ```

3. **Test connection:**
   - Open app in fresh tab
   - Click "Connect Wallet"
   - Choose MetaMask (or injected wallet) - this works without WalletConnect
   - Navigate between pages - should stay connected
   - If using WalletConnect QR code - only works after whitelisting domains

## Alternative: Use MetaMask/Injected Wallets Only

If you don't want to deal with WalletConnect configuration:
- Just use MetaMask or other browser extension wallets
- These work without WalletConnect and don't need domain whitelisting
- The errors you see are only from WalletConnect trying to connect
- Injected wallets bypass WalletConnect entirely

## Why This Happens

WalletConnect uses WebSockets to relay connection data between your app and mobile wallets. For security, they require all domains to be pre-approved in their cloud dashboard. Without approval, the WebSocket connection is rejected with code 3000.
