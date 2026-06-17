import { createServiceClient } from "@/lib/supabase/server";
import { contracts, HollowTokenABI, katanaNetwork } from "@/lib/contracts";
import { createPublicClient, http } from "viem";
import {
  MAX_RESERVED_SPOTS,
  MIN_HOLLOW_BALANCE,
  reserveFreeMintWallet as reserveFreeMintWalletCore,
} from "./core";

export { MAX_RESERVED_SPOTS, MIN_HOLLOW_BALANCE };

export async function reserveFreeMintWallet(walletAddressInput: string) {
  return reserveFreeMintWalletCore(walletAddressInput, {
    getBalance: async (wallet) => {
      const publicClient = createPublicClient({
        chain: katanaNetwork,
        transport: http(process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.katana.network"),
      });

      return publicClient.readContract({
        address: contracts.hollowToken.address,
        abi: HollowTokenABI,
        functionName: "balanceOf",
        args: [wallet],
      });
    },
    reserveSpot: async (wallet, maxSpots) => {
      const supabase = await createServiceClient();
      const { data: reserveData, error: reserveError } = await supabase.rpc(
        "hollow_raffles_reserve_free_mint_spot",
        { p_wallet: wallet, p_max_spots: maxSpots }
      );

      if (reserveError) {
        throw reserveError;
      }

      return (
        (reserveData?.[0] as
          | { success: boolean; already_reserved: boolean; reserved_count: number }
          | undefined) ?? null
      );
    },
  });
}
