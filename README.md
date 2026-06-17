# Katana Raffles

A decentralized raffles platform on **Katana Network** (Chain ID: 747474).

## Features

- 🎯 **Fair Raffles** - Commit-reveal scheme prevents winner manipulation
- 🏆 **Multiple Prize Types** - ERC20, ERC721 (NFT), and ERC6220 (Composable NFT)
- ⚡ **Auto Distribution** - Winners receive prizes automatically
- 🔐 **Secure** - ReentrancyGuard, wallet signature verification, RLS policies

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS 4
- **Web3**: Wagmi, Viem
- **Database**: Supabase (PostgreSQL)
- **Smart Contracts**: Solidity 0.8.24, Hardhat
- **Watchdog**: Node.js automation service

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase account
- Wallet with funds on Katana Network

### Installation

```bash
# Install dependencies
npm install

# Copy environment files
cp .env.example .env.local

# Edit .env.local with your values
```

### Database Setup

Run the SQL migrations in your Supabase project:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_functions.sql`
3. `supabase/migrations/003_admins.sql`
4. `supabase/migrations/004_prizes.sql`

### Smart Contract Deployment

```bash
# Compile contracts
npx hardhat compile

# Deploy to Katana Network (update hardhat.config.ts with your private key)
npx hardhat run scripts/deploy.ts --network katana
```

### Development

```bash
# Start Next.js dev server
npm run dev

# Start watchdog (in separate terminal)
cd watchdog
npm install
npm run dev
```

## Project Structure

```
katana-raffles/
├── app/                    # Next.js app router
│   ├── (public)/           # Public pages (raffles, profile, buy-tokens)
│   ├── admin/              # Admin dashboard
│   └── api/                # API routes
├── components/             # React components
│   ├── layout/             # Header, Footer
│   ├── raffle/             # RaffleCard, RaffleEntryForm
│   ├── providers/          # Web3Provider
│   └── ui/                 # Button, Card, Input, etc.
├── contracts/              # Solidity smart contracts
│   ├── RaffleToken.sol     # ERC20 platform token
│   └── KatanaRaffles.sol   # Main raffle contract
├── lib/                    # Utilities and hooks
│   ├── contracts/          # ABIs and config
│   ├── hooks/              # useToken, useRaffle
│   ├── supabase/           # Database client
│   └── utils/              # cn, auth
├── supabase/migrations/    # SQL migrations
└── watchdog/               # Automation service
```

## Smart Contracts

### RaffleToken (ERC20)
- Users buy tokens with native currency
- Used as raffle entry currency
- Admin can set price and withdraw to treasury

### KatanaRaffles
- Create raffles with ERC20/NFT prizes
- Users enter by spending tokens
- Commit-reveal winner selection
- Automatic prize distribution

## Security

- **Smart Contracts**: ReentrancyGuard, Ownable, Pausable
- **Winner Selection**: Commit-reveal scheme (10 block delay)
- **API**: Wallet signature verification (SIWE pattern)
- **Database**: Row Level Security policies
- **Watchdog**: Minimal permissions wallet

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Blockchain
NEXT_PUBLIC_CHAIN_ID=747474
NEXT_PUBLIC_RPC_URL=https://rpc.katana.network
NEXT_PUBLIC_RAFFLE_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_RAFFLES_CONTRACT_ADDRESS=0x...

# Admin
# Admin wallets are stored in the hollow_raffles_admin table (case-insensitive)

# Watchdog
WATCHDOG_PRIVATE_KEY=
```

## License

MIT
