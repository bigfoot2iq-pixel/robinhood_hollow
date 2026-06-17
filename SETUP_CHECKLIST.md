# 🎮 Game & Leaderboard Setup Checklist

Use this checklist to ensure everything is properly configured.

## ✅ Pre-Migration Verification

- [x] All files copied from the-hollow project
- [x] Game components in `components/game/`
- [x] Game engine in `game-v2/`
- [x] Hooks in `lib/hooks/`
- [x] API routes in `app/api/`
- [x] Smart contracts in `contracts/`
- [x] Database migrations in `supabase/migrations/`
- [x] Game assets in `public/images/`
- [x] Types updated in `lib/supabase/types.ts`

## 📋 Setup Steps

### Step 1: Database Setup
- [ ] Open Supabase SQL Editor
- [ ] Run `supabase/migrations/20241223_add_game_score.sql`
- [ ] Run `supabase/migrations/20241226_add_game_sessions.sql`
- [ ] Verify tables created:
  - [ ] `hollow_raffles_users` has `game_score` column
  - [ ] `the_hollow_game_sessions` table exists
- [ ] Verify functions created:
  - [ ] `update_game_score()`
  - [ ] `get_leaderboard()`
  - [ ] `create_game_session()`
  - [ ] `complete_game_session()`
  - [ ] `get_active_session()`

### Step 2: Smart Contract Deployment
- [ ] Compile contracts: `npx hardhat compile`
- [ ] Deploy game contract: `npx hardhat run scripts/deployGameContract.ts --network katana`
- [ ] Copy deployed contract address
- [ ] Add to `.env.local`: `NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x...`
- [ ] Verify contract on explorer (optional)

### Step 3: Environment Configuration
Check your `.env.local` has:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_CHAIN_ID=747474`
- [ ] `NEXT_PUBLIC_RPC_URL=https://rpc.katana.network`
- [ ] `NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x...` (from Step 2)
- [ ] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### Step 4: Install Dependencies
- [ ] Run `npm install`
- [ ] Verify no errors
- [ ] Check that these packages exist:
  - [ ] `framer-motion`
  - [ ] `wagmi`
  - [ ] `viem`
  - [ ] `@supabase/supabase-js`

### Step 5: Start Development Server
- [ ] Run `npm run dev`
- [ ] Server starts without errors
- [ ] No TypeScript errors in terminal

### Step 6: Test Game Page
Visit http://localhost:3000/game
- [ ] Page loads without errors
- [ ] "Connect Wallet" button visible
- [ ] Click "Connect Wallet"
- [ ] Wallet connection modal opens
- [ ] Connect your wallet
- [ ] "Pay to Play" button appears
- [ ] Play price displays correctly
- [ ] Click "Pay to Play"
- [ ] Transaction confirmation in wallet
- [ ] After confirmation, game loads
- [ ] Game canvas displays
- [ ] Controls work (WASD, J, L)
- [ ] Enemies spawn from right
- [ ] Score increases when killing enemies
- [ ] Game over screen appears when lives = 0
- [ ] Score submits to database

### Step 7: Test Leaderboard Page
Visit http://localhost:3000/leaderboard
- [ ] Page loads without errors
- [ ] Leaderboard table displays
- [ ] Your score appears (after playing game)
- [ ] Rank numbers show correctly
- [ ] Wallet addresses display
- [ ] Usernames show (if registered)
- [ ] "Refresh Rankings" button works
- [ ] "Load More Warriors" button works (if >10 players)
- [ ] Auto-refresh works (wait 30 seconds)

### Step 8: Test API Endpoints
- [ ] `/api/game-score` - GET with walletAddress parameter
- [ ] `/api/game-score` - POST with walletAddress and score
- [ ] `/api/leaderboard` - GET with page and limit parameters
- [ ] `/api/game-session` - POST with walletAddress and txHash
- [ ] `/api/game-session` - GET with walletAddress parameter
- [ ] `/api/game-session/complete` - POST with sessionId, walletAddress, score

### Step 9: Verify Database
Check Supabase Table Editor:
- [ ] `hollow_raffles_users` table has entries
- [ ] `game_score` column populated
- [ ] `the_hollow_game_sessions` table has entries
- [ ] Session status updates correctly

### Step 10: Test Pay-to-Play Flow
- [ ] Connect wallet with test ETH
- [ ] Click "Pay to Play"
- [ ] Confirm transaction
- [ ] Wait for confirmation
- [ ] Game session created
- [ ] "Continue Playing" button appears
- [ ] Play game
- [ ] Game over
- [ ] Score submits
- [ ] Session marked as completed
- [ ] Need to pay again for next game

## 🐛 Common Issues

### Issue: "Module not found" errors
**Solution:** Run `npm install`

### Issue: Game images not loading
**Solution:** 
- Check `public/images/` folder exists
- Verify all .png files are present
- Check browser console for 404 errors

### Issue: Database errors
**Solution:**
- Ensure migrations are run
- Check table name is `hollow_raffles_users`
- Verify RLS policies exist

### Issue: Contract errors
**Solution:**
- Deploy game contract
- Add address to `.env.local`
- Ensure test ETH on Katana network

### Issue: Wallet won't connect
**Solution:**
- Check WalletConnect project ID
- Clear browser cache
- Try different wallet

### Issue: Score not updating
**Solution:**
- Check API route logs
- Verify database function exists
- Check wallet address matches

## 📊 Success Criteria

All of these should work:
- ✅ Game page loads
- ✅ Wallet connects
- ✅ Payment transaction succeeds
- ✅ Game plays smoothly
- ✅ Score submits on game over
- ✅ Leaderboard displays scores
- ✅ Rankings update correctly
- ✅ Session system works
- ✅ No console errors
- ✅ No TypeScript errors

## 🎉 You're Done!

If all checkboxes are checked, your game and leaderboard are fully functional!

---

**Need Help?**
- Check `GAME_MIGRATION_README.md` for detailed docs
- Check `MIGRATION_COMPLETE.md` for file list
- Review browser console for errors
- Check Supabase logs for database issues
