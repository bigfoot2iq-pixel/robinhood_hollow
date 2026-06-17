import { createPublicClient, http, type Abi } from "viem";
import { contracts, katanaNetwork, KatanaRafflesABI } from "@/lib/contracts";
import type { RaffleStatus } from "@/lib/supabase";

// On-chain RaffleState enum: CREATED=0, ACTIVE=1, COMPLETED=2, CANCELLED=3
const CHAIN_STATE_MAP: Record<number, RaffleStatus> = {
  0: "pending",
  1: "active",
  2: "ended",
  3: "ended",
};

const abi = KatanaRafflesABI as Abi;

function getPublicClient() {
  const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.katana.network";
  return createPublicClient({
    chain: katanaNetwork,
    transport: http(rpcUrl),
  });
}

/** Read on-chain state for a single raffle */
export async function getOnChainRaffleState(chainRaffleId: number): Promise<RaffleStatus> {
  const client = getPublicClient();
  const result = await client.readContract({
    address: contracts.raffles.address,
    abi,
    functionName: "raffles",
    args: [BigInt(chainRaffleId)],
  }) as [number, string, number, bigint, boolean, boolean];

  const state = Number(result[2]);
  return CHAIN_STATE_MAP[state] ?? "pending";
}

/** Batch read on-chain state for multiple raffles via parallel calls */
export async function getOnChainRaffleStates(
  chainRaffleIds: { dbId: string; chainId: number }[]
): Promise<Map<string, RaffleStatus>> {
  const result = new Map<string, RaffleStatus>();
  if (chainRaffleIds.length === 0) return result;

  const client = getPublicClient();

  const responses = await Promise.allSettled(
    chainRaffleIds.map((r) =>
      client.readContract({
        address: contracts.raffles.address,
        abi,
        functionName: "raffles",
        args: [BigInt(r.chainId)],
      })
    )
  );

  for (let i = 0; i < chainRaffleIds.length; i++) {
    const response = responses[i];
    if (response.status === "fulfilled") {
      const data = response.value as [number, string, number, bigint, boolean, boolean];
      const state = Number(data[2]);
      result.set(chainRaffleIds[i].dbId, CHAIN_STATE_MAP[state] ?? "pending");
    }
  }

  return result;
}
