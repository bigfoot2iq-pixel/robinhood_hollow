import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { robinhoodChain } from '@/lib/contracts/config';
import { http, cookieStorage, createStorage } from 'wagmi';

export const wagmiConfig = getDefaultConfig({
  appName: 'Robinhood Raffles',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f05ae7f1116030fde2d36508f472bfb',
  chains: [robinhoodChain],
  transports: {
    [robinhoodChain.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com'),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
