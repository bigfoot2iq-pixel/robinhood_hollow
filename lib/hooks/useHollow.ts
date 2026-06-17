"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { contracts, HollowTokenABI } from "@/lib/contracts";

export function useCanClaim(address: `0x${string}` | undefined) {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "canClaim",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useGetClaimAmount(address: `0x${string}` | undefined) {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "getClaimAmount",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useClaimPrice() {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "claimPrice",
  });
}

export function useClaimCooldown() {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "claimCooldown",
  });
}

export function useClaimTokens() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claimTokens = (claimPrice: bigint) => {
    writeContract({
      address: contracts.hollowToken.address,
      abi: HollowTokenABI,
      functionName: "claimTokens",
      value: claimPrice,
      gas: 500000n,
    });
  };

  return {
    claimTokens,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

export function useHollowBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useGetLastClaimTimestamp(address: `0x${string}` | undefined) {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "getLastClaimTimestamp",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}
