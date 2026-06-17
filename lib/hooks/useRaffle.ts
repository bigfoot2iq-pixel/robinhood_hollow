"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { contracts, KatanaRafflesABI } from "@/lib/contracts";

export function useRaffleContract(raffleId: number) {
  return useReadContract({
    address: contracts.raffles.address,
    abi: KatanaRafflesABI,
    functionName: "raffles",
    args: [BigInt(raffleId)],
    query: {
      enabled: raffleId > 0,
    },
  });
}

export function useJoinRaffle() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const joinRaffle = async (raffleId: number, tokenAmount: bigint) => {
    writeContract({
      address: contracts.raffles.address,
      abi: KatanaRafflesABI,
      functionName: "joinRaffle",
      args: [BigInt(raffleId), tokenAmount],
    });
  };

  return {
    joinRaffle,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useRaffleCounter() {
  return useReadContract({
    address: contracts.raffles.address,
    abi: KatanaRafflesABI,
    functionName: "raffleCounter",
  });
}
