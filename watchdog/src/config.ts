import * as dotenv from "dotenv";
dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
  },
  blockchain: {
    rpcUrl: process.env.RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
    chainId: parseInt(process.env.CHAIN_ID || "4441"),
    privateKey: process.env.WATCHDOG_PRIVATE_KEY!,
  },
  contracts: {
    raffleToken: process.env.RAFFLE_TOKEN_ADDRESS as `0x${string}`,
    raffles: process.env.RAFFLES_CONTRACT_ADDRESS as `0x${string}`,
  },
  pollInterval: parseInt(process.env.POLL_INTERVAL || "60") * 1000, // Convert to ms
};

export function validateConfig(): boolean {
  const required = [
    ["SUPABASE_URL", config.supabase.url],
    ["SUPABASE_SERVICE_KEY", config.supabase.serviceKey],
    ["WATCHDOG_PRIVATE_KEY", config.blockchain.privateKey],
    ["RAFFLE_TOKEN_ADDRESS", config.contracts.raffleToken],
    ["RAFFLES_CONTRACT_ADDRESS", config.contracts.raffles],
  ];

  for (const [name, value] of required) {
    if (!value) {
      console.error(`Missing required environment variable: ${name}`);
      return false;
    }
  }

  return true;
}
