import { defineChain } from "viem";

// LitVM LiteForge testnet — Litecoin's Virtual Machine (https://www.litvm.com/)
export const litvmTestnet = defineChain({
  id: 4441,
  name: "LitVM LiteForge",
  nativeCurrency: {
    decimals: 18,
    name: "zkLTC",
    symbol: "zkLTC",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://liteforge.rpc.caldera.xyz/http"],
      webSocket: ["wss://liteforge.rpc.caldera.xyz/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Liteforge Explorer",
      url: "https://liteforge.explorer.caldera.xyz",
    },
  },
  testnet: true,
});

// Backwards-compatible alias (legacy imports referencing the old name)
export const katanaNetwork = litvmTestnet;

// Hardhat local network for development (matches hardhat.config.ts chainId)
export const hardhatLocal = defineChain({
  id: 4441,
  name: "Hardhat Local",
  nativeCurrency: {
    decimals: 18,
    name: "zkLTC",
    symbol: "zkLTC",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
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
} as const;

export const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET as `0x${string}`;
