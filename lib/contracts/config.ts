import { defineChain } from "viem";

// Robinhood Chain (Arbitrum L2) — mainnet, chain ID 4663
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
  testnet: false,
});

// Hardhat local network for development (matches hardhat.config.ts chainId)
export const hardhatLocal = defineChain({
  id: 4663,
  name: "Hardhat Local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
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
