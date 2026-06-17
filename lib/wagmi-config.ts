import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { katanaNetwork } from '@/lib/contracts/config';
import { http, cookieStorage, createStorage } from 'wagmi';

export const wagmiConfig = getDefaultConfig({
  appName: 'The Hollow',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f05ae7f1116030fde2d36508f472bfb',
  chains: [katanaNetwork],
  transports: {
    [katanaNetwork.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.katana.network'),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
