# Game & Leaderboard Migration Complete

All necessary files have been migrated from the-hollow project to katana-raffles.

## What Was Migrated

### 1. Pages
- ✅ `/app/(public)/game/page.tsx` - Game page
- ✅ `/app/(public)/leaderboard/page.tsx` - Leaderboard page

### 2. Components (`components/game/`)
- ✅ `LastStandContainer.tsx` - Main game container with pay-to-play logic
- ✅ `LastStandGame.tsx` - Canvas-based game component
- ✅ `Leaderboard.tsx` - Leaderboard display with rankings
- ✅ `MultiWalletConnect.tsx` - Wallet connection component
- ✅ `UserRegistrationModal.tsx` - User profile registration

### 3. Game Engine (`game-v2/`)
- ✅ `types.ts` - Game type definitions
- ✅ `engine.ts` - Core game logic
- ✅ `renderer.ts` - Canvas rendering
- ✅ `index.ts` - Exports

### 4. Hooks (`lib/hooks/`)
- ✅ `usePayToPlay.ts` - Contract interaction for pay-to-play
- ✅ `useGameSession.ts` - Game session management
- ✅ `useLeaderboard.ts` - Leaderboard data fetching
- ✅ `useHighScore.ts` - High score tracking
- ✅ `useMultiUser.ts` - User management

### 5. API Routes
- ✅ `/app/api/game-score/route.ts` - Score updates
- ✅ `/app/api/leaderboard/route.ts` - Leaderboard data
- ✅ `/app/api/game-session/route.ts` - Session creation/checking
- ✅ `/app/api/game-session/complete/route.ts` - Session completion

### 6. Smart Contracts
- ✅ `contracts/TheHollowGame.sol` - Pay-to-play game contract
- ✅ `contracts/Ownable.sol` - Ownership contract
- ✅ `lib/contracts/theHollowGame.ts` - Contract ABI and config

### 7. Database Migrations (`supabase/migrations/`)
- ✅ `20241223_add_game_score.sql` - Game score tracking
- ✅ `20241226_add_game_sessions.sql` - Pay-to-play sessions

### 8. Utilities (`lib/utils/`)
- ✅ `user.ts` - User management functions
- ✅ `x-auth.ts` - X/Twitter OAuth helpers

### 9. Types
- ✅ Added game-related types to `lib/supabase/types.ts`
- ✅ Created `types/game-types.ts` for game mode types

### 10. Configuration
- ✅ Updated `.env.example` with `NEXT_PUBLIC_GAME_CONTRACT_ADDRESS`
- ✅ Created `lib/supabase/game-client.ts` for API routes
- ✅ Created `scripts/deployGameContract.ts` for deployment

## Setup Instructions

### 1. Install Dependencies
The project already has the necessary dependencies (framer-motion, wagmi, viem, etc.)

### 2. Run Database Migrations
Run these SQL migrations in your Supabase project:
```bash
# In Supabase SQL Editor, run:
# 1. supabase/migrations/20241223_add_game_score.sql
# 2. supabase/migrations/20241226_add_game_sessions.sql
```

### 3. Deploy Game Contract
```bash
# Compile contracts
npx hardhat compile

# Deploy to Katana Network
npx hardhat run scripts/deployGameContract.ts --network katana
```

### 4. Update Environment Variables
Add to your `.env.local`:
```env
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x... # From deployment
```

### 5. Copy Game Assets
Copy the game image assets from the-hollow project:
```bash
# Copy from D:\my_projects\the-hollow\public\images\
# To D:\my_projects\katana-raffles\public\images\

# Required images:
- idle.png
- run.png
- attack.png
- hurt.png
- goblin-run.png
- goblin-attack.png
- skeleton-walk.png
- skeleton-attack.png
- yellow-ninja-walk.png
- yellow-ninja-attack.png
- samurai-run.png
- samurai-attack.png
```

### 6. Test the Migration
```bash
npm run dev
```

Visit:
- http://localhost:3000/game - Game page
- http://localhost:3000/leaderboard - Leaderboard page

## Database Schema

The migrations add these tables/functions:

### Tables
- `hollow_raffles_users` - Extended with `game_score` column
- `the_hollow_game_sessions` - Pay-to-play session tracking

### Functions
- `update_game_score(user_wallet, new_score)` - Updates high score
- `get_leaderboard(limit_count, offset_count)` - Fetches leaderboard
- `create_game_session(user_wallet, payment_tx_hash)` - Creates session
- `complete_game_session(session_id, user_wallet, final_score)` - Completes session
- `get_active_session(user_wallet)` - Checks for active session

## How It Works

### Pay-to-Play Flow
1. User connects wallet
2. User pays via `TheHollowGame.payToPlay()` contract
3. Transaction hash creates a game session (24h validity)
4. User plays the game
5. On game over, session completes and score updates atomically
6. User needs to pay again for next session

### Free Play (Fallback)
- If no session exists, game still works
- Scores are tracked but no payment required
- Useful for testing

## Notes

- The game uses the same Supabase database as the raffles
- User table is shared: `hollow_raffles_users`
- Game sessions are separate: `the_hollow_game_sessions`
- All imports have been updated to use the correct paths
- The game is fully integrated with the existing wallet connection system

## Troubleshooting

### "Module not found" errors
- Make sure all dependencies are installed: `npm install`
- Check that paths use `@/` prefix correctly

### Game images not loading
- Copy all image assets from the-hollow/public/images/
- Check browser console for 404 errors

### Database errors
- Ensure migrations are run in Supabase
- Check that table names match (hollow_raffles_users vs the_hollow_users)

### Contract errors
- Deploy the game contract first
- Add contract address to .env.local
- Ensure you have test ETH on Katana network
