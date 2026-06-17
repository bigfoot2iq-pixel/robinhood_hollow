import { defineChain } from "viem";

export const katanaNetwork = defineChain({
  id: 747474,
  name: "Katana Network",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.katana.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Katana Explorer",
      url: "https://explorer.katana.network",
    },
  },
});

// Hardhat local network for development (matches hardhat.config.ts chainId)
export const hardhatLocal = defineChain({
  id: 747474,
  name: "Hardhat Local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://katana.drpc.org"],
    },
  },
  testnet: true,
});

export const contracts = {
  hollowToken: {
    address: process.env.NEXT_PUBLIC_HOLLOW_TOKEN_ADDRESS as `0x${string}`,
  },
  raffles: {
    address: process.env.NEXT_PUBLIC_RAFFLES_CONTRACT_ADDRESS as `0x${string}`,
  },
  katToken: {
    address: "0x7F1f4b4b29f5058fA32CC7a97141b8D7e5ABDC2d" as `0x${string}`,
  },
  avKAT: {
    address: "0x7231dbaCdFc968E07656D12389AB20De82FbfCeB" as `0x${string}`,
  },
  avKATVault: {
    // spender address used in KAT approve before depositing into avKAT
    address: "0x4d6fc15ca6258b168225d283262743c623c13ead" as `0x${string}`,
  },
  vKAT: {
    address: "0x4d6fc15ca6258b168225d283262743c623c13ead" as `0x${string}`,
  },
  stakingRewards: {
    address: process.env.NEXT_PUBLIC_STAKING_REWARDS_ADDRESS as `0x${string}`,
  },
} as const;

export const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET as `0x${string}`;
