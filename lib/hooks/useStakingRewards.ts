"use client";

import { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { contracts, StakingRewardsABI } from "@/lib/contracts";

// ─── Claim info (reads lastClaim + windowHours once, countdown is client-side) ─

function useClaimInfo(
  fnName: "lastClaimAVKAT" | "lastClaimVKAT",
  address: `0x${string}` | undefined
) {
  const { data: lastClaim, refetch: refetchLastClaim } = useReadContract({
    address: contracts.stakingRewards.address,
    abi: StakingRewardsABI,
    functionName: fnName,
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: windowHours } = useReadContract({
    address: contracts.stakingRewards.address,
    abi: StakingRewardsABI,
    functionName: "claimWindowHours",
    query: { enabled: !!address },
  });
  const nextClaimAt = lastClaim !== undefined && windowHours !== undefined
    ? Number(lastClaim as bigint) + Number(windowHours as bigint) * 3600
    : null;
  const nowSec = Math.floor(Date.now() / 1000);
  const eligible = nextClaimAt !== null && nowSec >= nextClaimAt;
  const secondsRemaining = nextClaimAt !== null && !eligible ? nextClaimAt - nowSec : 0;
  return { eligible, secondsRemaining, nextClaimAt, refetch: refetchLastClaim };
}

export function useAVKATClaimInfo(address: `0x${string}` | undefined) {
  return useClaimInfo("lastClaimAVKAT", address);
}

export function useVKATClaimInfo(address: `0x${string}` | undefined) {
  return useClaimInfo("lastClaimVKAT", address);
}

// ─── Tier reading ─────────────────────────────────────────────────────────────

export interface TierInfo {
  threshold: bigint;
  hollowAmount: bigint;
}

function useTiers(fnName: "avKATTiers" | "vKATTiers") {
  const t0 = useReadContract({ address: contracts.stakingRewards.address, abi: StakingRewardsABI, functionName: fnName, args: [0n] });
  const t1 = useReadContract({ address: contracts.stakingRewards.address, abi: StakingRewardsABI, functionName: fnName, args: [1n] });
  const t2 = useReadContract({ address: contracts.stakingRewards.address, abi: StakingRewardsABI, functionName: fnName, args: [2n] });

  const parse = (data: unknown): TierInfo | null => {
    const raw = data as [bigint, bigint] | undefined;
    if (!raw || raw[0] === undefined) return null;
    return { threshold: raw[0], hollowAmount: raw[1] };
  };

  const tiers = [parse(t0.data), parse(t1.data), parse(t2.data)].filter(Boolean) as TierInfo[];
  const configured = tiers.length > 0 && tiers[0].threshold > 0n;
  return { tiers, configured, isLoading: t0.isLoading };
}

export function useAVKATTiers() { return useTiers("avKATTiers"); }
export function useVKATTiers()  { return useTiers("vKATTiers");  }

// ─── Voucher types ────────────────────────────────────────────────────────────

export interface ClaimVoucher {
  amount: string;
  expiry: string;
  nonce: `0x${string}`;
  signature: `0x${string}`;
  tierAmount: string;
}

export type ClaimStatus = "idle" | "fetching" | "signing" | "confirming" | "success" | "error";

// ─── Claim hook (avKAT) ───────────────────────────────────────────────────────

export function useClaimAVKAT(address: `0x${string}` | undefined) {
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tierAmount, setTierAmount] = useState<string | null>(null);

  const { writeContract, data: hash, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirming && status === "signing") setStatus("confirming");
  }, [isConfirming]);

  useEffect(() => {
    if (isSuccess) setStatus("success");
  }, [isSuccess]);

  const claim = async () => {
    if (!address) return;
    setErrorMessage(null);
    setStatus("fetching");
    try {
      const res = await fetch(`/api/staking-rewards/voucher?address=${address}&token=avkat`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to get voucher");
        setStatus("error");
        return;
      }
      const voucher = data as ClaimVoucher;
      setTierAmount(voucher.tierAmount);
      setStatus("signing");
      writeContract({
        address: contracts.stakingRewards.address,
        abi: StakingRewardsABI,
        functionName: "claimAVKAT",
        args: [BigInt(voucher.amount), BigInt(voucher.expiry), voucher.nonce, voucher.signature],
      });
    } catch (err) {
      setErrorMessage("Unexpected error");
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setErrorMessage(null);
    setTierAmount(null);
    resetWrite();
  };

  return { claim, status, errorMessage, tierAmount, isLoading: status === "fetching" || status === "signing" || status === "confirming" };
}

// ─── Claim hook (vKAT) ────────────────────────────────────────────────────────

export function useClaimVKAT(address: `0x${string}` | undefined) {
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tierAmount, setTierAmount] = useState<string | null>(null);

  const { writeContract, data: hash, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirming && status === "signing") setStatus("confirming");
  }, [isConfirming]);

  useEffect(() => {
    if (isSuccess) setStatus("success");
  }, [isSuccess]);

  const claim = async () => {
    if (!address) return;
    setErrorMessage(null);
    setStatus("fetching");
    try {
      const res = await fetch(`/api/staking-rewards/voucher?address=${address}&token=vkat`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to get voucher");
        setStatus("error");
        return;
      }
      const voucher = data as ClaimVoucher;
      setTierAmount(voucher.tierAmount);
      setStatus("signing");
      writeContract({
        address: contracts.stakingRewards.address,
        abi: StakingRewardsABI,
        functionName: "claimVKAT",
        args: [BigInt(voucher.amount), BigInt(voucher.expiry), voucher.nonce, voucher.signature],
      });
    } catch (err) {
      setErrorMessage("Unexpected error");
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setErrorMessage(null);
    setTierAmount(null);
    resetWrite();
  };

  return { claim, status, errorMessage, tierAmount, isLoading: status === "fetching" || status === "signing" || status === "confirming" };
}
