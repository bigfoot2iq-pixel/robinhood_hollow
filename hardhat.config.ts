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
      chainId: 4441,
      hardfork: "london",
      initialBaseFeePerGas: 0,
    },
    litvm: {
      url: process.env.NEXT_PUBLIC_RPC_URL || "https://liteforge.rpc.caldera.xyz/http",
      chainId: 4441,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : process.env.WATCHDOG_PRIVATE_KEY
          ? [process.env.WATCHDOG_PRIVATE_KEY]
          : [],
    },
  },
  etherscan: {
    // Keyed by network name so hardhat-verify uses the custom Caldera explorer
    // below instead of falling back to api.etherscan.io.
    apiKey: {
      litvm: process.env.ETHERSCAN_API_KEY || "abc",
    },
    customChains: [
      {
        network: "litvm",
        chainId: 4441,
        urls: {
          apiURL: "https://liteforge.explorer.caldera.xyz/api",
          browserURL: "https://liteforge.explorer.caldera.xyz",
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
