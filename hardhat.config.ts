import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 747474,
      hardfork: "london",
      initialBaseFeePerGas: 0,
    },
    katana: {
      url: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.katana.network",
      chainId: 747474,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : process.env.WATCHDOG_PRIVATE_KEY
          ? [process.env.WATCHDOG_PRIVATE_KEY]
          : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "abc",
    customChains: [
      {
        network: "katana",
        chainId: 747474,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=747474",
          browserURL: "https://katanascan.com",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts/test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
