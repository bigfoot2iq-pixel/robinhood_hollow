import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { litvmTestnet } from '@/lib/contracts/config';
import { http, cookieStorage, createStorage } from 'wagmi';

export const wagmiConfig = getDefaultConfig({
  appName: 'LitVM Raffles',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f05ae7f1116030fde2d36508f472bfb',
  chains: [litvmTestnet],
  transports: {
    [litvmTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://liteforge.rpc.caldera.xyz/http'),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
