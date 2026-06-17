"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { parseEther, formatEther } from "viem";
import { contracts, HollowTokenABI } from "@/lib/contracts";

const erc20BalanceOfABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface KATPrice {
  usd: number;
  usd_24h_change: number;
}

async function fetchKATPrice(): Promise<KATPrice> {
  const res = await fetch(
    "/api/token-prices?token_addresses=0x7f1f4b4b29f5058fa32cc7a97141b8d7e5abdc2d"
  );
  if (!res.ok) throw new Error("Failed to fetch KAT price");
  const json = await res.json();
  return json.data["0x7f1f4b4b29f5058fa32cc7a97141b8d7e5abdc2d"];
}

export function useKATPrice() {
  return useQuery({
    queryKey: ["kat-price"],
    queryFn: fetchKATPrice,
    staleTime: 60_000,
  });
}

export function useKATBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: contracts.katToken.address,
    abi: erc20BalanceOfABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useAVKATBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: contracts.avKAT.address,
    abi: erc20BalanceOfABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export interface VKATToken {
  id: string;
  tokenId: string;
  currentValue: string;
  createdAt: string;
  inExitQueue: boolean;
  exitQueuedAt: string | null;
  cooldownEndsAt: string | null;
}

async function fetchVKATLocks(address: string): Promise<VKATToken[]> {
  console.log("[vKAT] fetchVKATLocks called for address:", address);
  console.log("[vKAT] contractAddress:", contracts.vKAT.address);
  const res = await fetch("/api/indexer-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
  query UserLocks(
    $user: String!,
    $contractAddress: String!,
    $chainId: String!
  ) {
    Token(
      where: {
        _or: [
          { currentOwner: { _ilike: $user } },
          { beneficialOwner: { _ilike: $user } }
        ],
        active: { _eq: true },
        withdrawnAt: { _is_null: true},
        contract: {
          address: { _ilike: $contractAddress },
          chainId: { _eq: $chainId }
        }
      }
    ) {
      id
      tokenId
      currentValue
      createdAt
      inExitQueue
      exitQueuedAt
      cooldownEndsAt
    }
  }
`,
      variables: {
        chainId: "747474",
        contractAddress: contracts.vKAT.address,
        user: address,
      },
    }),
  });

  const json = await res.json();
  console.log("[vKAT] proxy res.ok:", res.ok, "| res.status:", res.status);
  console.log("[vKAT] full response:", JSON.stringify(json));
  if (!res.ok) {
    console.error("[vKAT] indexer-proxy error:", json);
    throw new Error("Failed to fetch vKAT locks");
  }
  const tokens = json.data?.Token ?? [];
  console.log("[vKAT] tokens found:", tokens.length, tokens);
  return tokens;
}

export function useVKATLocks(address: `0x${string}` | undefined) {
  return useQuery({
    queryKey: ["vkat-locks", address],
    queryFn: () => fetchVKATLocks(address!),
    enabled: !!address,
  });
}

export function getVKATTotal(tokens: VKATToken[]): bigint {
  return tokens.reduce((sum, t) => sum + BigInt(t.currentValue), 0n);
}

export function useTokenBalance(address: `0x${string}` | undefined) {
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

export function useTokenAllowance(owner: `0x${string}` | undefined, spender: `0x${string}`) {
  return useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "allowance",
    args: owner ? [owner, spender] : undefined,
    query: {
      enabled: !!owner,
    },
  });
}

export function useApproveTokens() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = async (spender: `0x${string}`, amount: bigint) => {
    writeContract({
      address: contracts.hollowToken.address,
      abi: HollowTokenABI,
      functionName: "approve",
      args: [spender, amount],
      gas: 100000n,
    });
  };

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export { formatEther, parseEther };

export function formatTokenBalance(balance: bigint | undefined): string {
  if (balance === undefined) return "0.00";
  return parseFloat(formatEther(balance)).toFixed(2);
}

const createLockABI = [
  {
    inputs: [{ name: "_value", type: "uint256" }],
    name: "createLock",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const avKATDepositABI = [
  {
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "deposit",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const katAllowanceABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export type StakeStatus =
  | "idle"
  | "approving"
  | "approved"
  | "staking"
  | "success"
  | "error";

export function useStakeAVKAT(address: `0x${string}` | undefined) {
  const [status, setStatus] = useState<StakeStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
  } = useWriteContract();

  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositPending,
  } = useWriteContract();

  const { isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // After approve confirms → send deposit
  useEffect(() => {
    if (isApproveConfirmed && status === "approving" && pendingDepositRef.current) {
      const { amountWei, receiver } = pendingDepositRef.current;
      setStatus("staking");
      writeDeposit(
        {
          address: contracts.avKAT.address,
          abi: avKATDepositABI,
          functionName: "deposit",
          args: [amountWei, receiver],
        },
        {
          onError: (err) => {
            setStatus("error");
            setErrorMessage(err.message ?? "Deposit failed");
            pendingDepositRef.current = null;
          },
        }
      );
    }
  }, [isApproveConfirmed]);

  // After deposit confirms → success
  useEffect(() => {
    if (isDepositConfirmed && status === "staking") {
      setStatus("success");
      pendingDepositRef.current = null;
    }
  }, [isDepositConfirmed]);

  const pendingDepositRef = useRef<{ amountWei: bigint; receiver: `0x${string}` } | null>(null);

  const stake = (amountWei: bigint) => {
    if (!address) return;
    setErrorMessage(null);
    setStatus("approving");
    pendingDepositRef.current = { amountWei, receiver: address };
    writeApprove(
      {
        address: contracts.katToken.address,
        abi: katAllowanceABI,
        functionName: "approve",
        args: [contracts.avKAT.address, amountWei],
      },
      {
        onError: (err) => {
          setStatus("error");
          setErrorMessage(err.message ?? "Approval failed");
          pendingDepositRef.current = null;
        },
      }
    );
  };

  const reset = () => {
    setStatus("idle");
    setErrorMessage(null);
    pendingDepositRef.current = null;
  };

  return {
    stake,
    reset,
    status,
    errorMessage,
    isLoading: status === "approving" || status === "staking",
    approveHash,
    depositHash,
  };
}

export function useStakeVKAT(address: `0x${string}` | undefined) {
  const [status, setStatus] = useState<StakeStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingAmountRef = useRef<bigint | null>(null);

  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { writeContract: writeLock, data: lockHash } = useWriteContract();

  const { isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: isLockConfirmed } = useWaitForTransactionReceipt({ hash: lockHash });

  // After approve confirms → send createLock
  useEffect(() => {
    if (isApproveConfirmed && status === "approving" && pendingAmountRef.current) {
      const amountWei = pendingAmountRef.current;
      setStatus("staking");
      writeLock(
        {
          address: contracts.vKAT.address,
          abi: createLockABI,
          functionName: "createLock",
          args: [amountWei],
        },
        {
          onError: (err) => {
            setStatus("error");
            setErrorMessage(err.message ?? "createLock failed");
            pendingAmountRef.current = null;
          },
        }
      );
    }
  }, [isApproveConfirmed]);

  // After createLock confirms → success
  useEffect(() => {
    if (isLockConfirmed && status === "staking") {
      setStatus("success");
      pendingAmountRef.current = null;
    }
  }, [isLockConfirmed]);

  const stake = (amountWei: bigint) => {
    if (!address) return;
    setErrorMessage(null);
    setStatus("approving");
    pendingAmountRef.current = amountWei;
    writeApprove(
      {
        address: contracts.katToken.address,
        abi: katAllowanceABI,
        functionName: "approve",
        args: [contracts.vKAT.address, amountWei],
      },
      {
        onError: (err) => {
          setStatus("error");
          setErrorMessage(err.message ?? "Approval failed");
          pendingAmountRef.current = null;
        },
      }
    );
  };

  const reset = () => {
    setStatus("idle");
    setErrorMessage(null);
    pendingAmountRef.current = null;
  };

  return {
    stake,
    reset,
    status,
    errorMessage,
    isLoading: status === "approving" || status === "staking",
    approveHash,
    lockHash,
  };
}
