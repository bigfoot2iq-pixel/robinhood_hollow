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

/** HOLLOW the connected account would receive on its next claim (its tier amount). */
export function useClaimAmount(address: `0x${string}` | undefined) {
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

/** Tier the account qualifies for: 1 (top-5), 2 (next-5), 3 (none). */
export function useGetTier(address: `0x${string}` | undefined) {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "getTier",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useTier1Amount() {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "tier1Amount",
  });
}

export function useTier2Amount() {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "tier2Amount",
  });
}

export function useTier3Amount() {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "tier3Amount",
  });
}

export function useTier1Tokens() {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "getTier1Tokens",
  });
}

export function useTier2Tokens() {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "getTier2Tokens",
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

  const claimTokens = () => {
    writeContract({
      address: contracts.hollowToken.address,
      abi: HollowTokenABI,
      functionName: "claimTokens",
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
