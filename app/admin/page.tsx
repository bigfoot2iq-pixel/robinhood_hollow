"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useSignMessage, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { format } from "date-fns";
import type { Raffle } from "@/lib/supabase";
import { useClaimAmount, useClaimCooldown } from "@/lib/hooks";
import { contracts, HollowTokenABI, THE_HOLLOW_GAME_ADDRESS, THE_HOLLOW_GAME_ABI } from "@/lib/contracts";

interface AdminData {
  raffles: Array<Raffle & { participants_count?: number; prize_types?: string[]; status: string }>;
  total: number;
  stats: {
    total_raffles: number;
    active_raffles: number;
    total_entries: number;
    total_users: number;
  } | null;
}

export default function AdminDashboard() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const authRef = useRef<{ wallet: string; signature: string; timestamp: string } | null>(null);
  const authPromiseRef = useRef<Promise<{ wallet: string; signature: string; timestamp: string }> | null>(null);
  const walletLower = address?.toLowerCase();

  const getAdminAuth = useCallback(async () => {
    if (!walletLower) {
      throw new Error("Wallet not connected");
    }

    const now = Date.now();
    const cached = authRef.current;
    if (cached && cached.wallet === walletLower && now - Number(cached.timestamp) < 5 * 60 * 1000) {
      return cached;
    }

    if (authPromiseRef.current) {
      return authPromiseRef.current;
    }

    const timestamp = now.toString();
    const message = `Katana Raffles Admin\nTimestamp: ${timestamp}`;

    authPromiseRef.current = signMessageAsync({ message })
      .then((signature) => {
        const auth = { wallet: walletLower, signature, timestamp };
        authRef.current = auth;
        authPromiseRef.current = null;
        return auth;
      })
      .catch((error) => {
        authPromiseRef.current = null;
        throw error;
      });

    return authPromiseRef.current;
  }, [walletLower, signMessageAsync]);

  useEffect(() => {
    async function fetchData() {
      if (!walletLower) return;
      setLoading(true);

      try {
        const auth = await getAdminAuth();

        const response = await fetch("/api/admin/raffles", {
          headers: {
            "x-admin-wallet": auth.wallet,
            "x-admin-signature": auth.signature,
            "x-admin-timestamp": auth.timestamp,
          },
        });

        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [walletLower, getAdminAuth]);

  const handleActivateRaffle = async (raffleId: string) => {
    if (!walletLower) return;
    
    setActionLoading((prev) => ({ ...prev, [`activate-${raffleId}`]: true }));
    
    try {
      const auth = await getAdminAuth();
      
      const response = await fetch(`/api/admin/raffles/${raffleId}/activate`, {
        method: "POST",
        headers: {
          "x-admin-wallet": auth.wallet,
          "x-admin-signature": auth.signature,
          "x-admin-timestamp": auth.timestamp,
        },
      });

      if (response.ok) {
        alert("Raffle activated successfully!");
        // Refresh data
        const dataResponse = await fetch("/api/admin/raffles", {
          headers: {
            "x-admin-wallet": auth.wallet,
            "x-admin-signature": auth.signature,
            "x-admin-timestamp": auth.timestamp,
          },
        });
        if (dataResponse.ok) {
          const result = await dataResponse.json();
          setData(result);
        }
      } else {
        const error = await response.json();
        alert(`Failed to activate raffle: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error activating raffle:", error);
      alert("Failed to activate raffle");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`activate-${raffleId}`]: false }));
    }
  };

  const handleEndRaffle = async (raffleId: string) => {
    if (!walletLower) return;
    
    if (!confirm("Are you sure you want to end this raffle? This will select winners and cannot be undone.")) {
      return;
    }
    
    setActionLoading((prev) => ({ ...prev, [`end-${raffleId}`]: true }));
    
    try {
      const auth = await getAdminAuth();
      
      const response = await fetch(`/api/admin/raffles/${raffleId}/end`, {
        method: "POST",
        headers: {
          "x-admin-wallet": auth.wallet,
          "x-admin-signature": auth.signature,
          "x-admin-timestamp": auth.timestamp,
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Raffle ended successfully! ${result.winners.length} winner(s) selected from ${result.participantCount} participant(s).`);
        // Refresh data
        const dataResponse = await fetch("/api/admin/raffles", {
          headers: {
            "x-admin-wallet": auth.wallet,
            "x-admin-signature": auth.signature,
            "x-admin-timestamp": auth.timestamp,
          },
        });
        if (dataResponse.ok) {
          const result = await dataResponse.json();
          setData(result);
        }
      } else {
        const error = await response.json();
        alert(`Failed to end raffle: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error ending raffle:", error);
      alert("Failed to end raffle");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`end-${raffleId}`]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="ui-container rounded h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-5xl font-header text-white">Admin Dashboard</h2>
        <div className="flex items-center gap-3">
          <Link href="/admin/raffles/create">
            <button className="px-6 py-3 bg-[#33C5D9] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(51,197,217,0.15)] flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">add</span>
              Create Raffle
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="ui-container p-6 rounded border-l-4 border-[#33C5D9]">
          <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-2">Total Raffles</p>
          <p className="text-3xl font-display font-bold text-white">{data?.stats?.total_raffles || 0}</p>
        </div>
        <div className="ui-container p-6 rounded">
          <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-2">Active Raffles</p>
          <p className="text-3xl font-display font-bold text-white">{data?.stats?.active_raffles || 0}</p>
        </div>
        <div className="ui-container p-6 rounded">
          <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-2">Total Entries</p>
          <p className="text-3xl font-display font-bold text-white">{data?.stats?.total_entries || 0}</p>
        </div>
        <div className="ui-container p-6 rounded">
          <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-2">Total Users</p>
          <p className="text-3xl font-display font-bold text-white">{data?.stats?.total_users || 0}</p>
        </div>
      </div>

      {/* HOLLOW Token Config */}
      <HollowTokenConfig />

      {/* Game Play Fee Config */}
      <GameConfig />

      {/* Raffles Table */}
      <div className="ui-container rounded overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-xl font-header text-white">Recent Raffles</h3>
        </div>
        {data?.raffles && data.raffles.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-blue">Title</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-blue">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-blue">Type</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-blue">Participants</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-blue">End Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-blue text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.raffles.map((raffle) => (
                <tr key={raffle.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-bold text-white">{raffle.title}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${
                      raffle.status === "active"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : raffle.status === "pending"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-white/5 text-muted-blue border-white/10"
                    }`}>
                      {raffle.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm text-white capitalize">
                      {raffle.prize_types && raffle.prize_types.length > 0
                        ? raffle.prize_types.length === 1
                          ? raffle.prize_types[0]
                          : "multiple"
                        : "unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-display font-bold text-white">
                      {(raffle.participants_count || 0)}/{raffle.max_participants}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm text-white">{format(new Date(raffle.end_date), "MMM d, yyyy")}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {raffle.status === "pending" && (
                        <button
                          onClick={() => handleActivateRaffle(raffle.id)}
                          disabled={actionLoading[`activate-${raffle.id}`]}
                          className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 text-xs font-bold rounded uppercase tracking-widest transition-all border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading[`activate-${raffle.id}`] ? "..." : "Activate"}
                        </button>
                      )}
                      {raffle.status === "active" && (
                        <button
                          onClick={() => handleEndRaffle(raffle.id)}
                          disabled={actionLoading[`end-${raffle.id}`]}
                          className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 text-xs font-bold rounded uppercase tracking-widest transition-all border border-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading[`end-${raffle.id}`] ? "..." : "End"}
                        </button>
                      )}
                      <Link href={`/admin/raffles/${raffle.slug || raffle.id}`}>
                        <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded uppercase tracking-widest transition-all border border-white/10">
                          Manage
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-muted-blue text-4xl mb-2 block">confirmation_number</span>
            <p className="text-muted-blue">No raffles created yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HollowTokenConfig() {
  const { data: currentAmount } = useClaimAmount();
  const { data: currentCooldown } = useClaimCooldown();

  const [priceInput, setPriceInput] = useState("");
  const [cooldownInput, setCooldownInput] = useState("");

  const {
    writeContract: writePrice,
    data: priceHash,
    isPending: pricePending,
    error: priceError,
    reset: resetPrice,
  } = useWriteContract();
  const { isLoading: priceConfirming, isSuccess: priceSuccess } = useWaitForTransactionReceipt({ hash: priceHash });

  const {
    writeContract: writeCooldown,
    data: cooldownHash,
    isPending: cooldownPending,
    error: cooldownError,
    reset: resetCooldown,
  } = useWriteContract();
  const { isLoading: cooldownConfirming, isSuccess: cooldownSuccess } = useWaitForTransactionReceipt({ hash: cooldownHash });

  // Pre-fill inputs with current values
  useEffect(() => {
    if (currentAmount !== undefined && !priceInput) {
      setPriceInput(formatEther(currentAmount as bigint));
    }
  }, [currentAmount, priceInput]);

  useEffect(() => {
    if (currentCooldown !== undefined && !cooldownInput) {
      setCooldownInput(Number(currentCooldown).toString());
    }
  }, [currentCooldown, cooldownInput]);

  const handleSetPrice = () => {
    resetPrice();
    try {
      const wei = parseEther(priceInput);
      writePrice({
        address: contracts.hollowToken.address,
        abi: HollowTokenABI,
        functionName: "setClaimAmount",
        args: [wei],
      });
    } catch {
      alert("Invalid amount value");
    }
  };

  const handleSetCooldown = () => {
    resetCooldown();
    const seconds = parseInt(cooldownInput, 10);
    if (isNaN(seconds) || seconds < 0) {
      alert("Invalid cooldown value");
      return;
    }
    writeCooldown({
      address: contracts.hollowToken.address,
      abi: HollowTokenABI,
      functionName: "setClaimCooldown",
      args: [BigInt(seconds)],
    });
  };

  const formatCooldownDisplay = (seconds: number): string => {
    if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div className="ui-container rounded overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h3 className="text-xl font-header text-white">HOLLOW Token Config</h3>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Claim Amount */}
        <div className="space-y-3">
          <div>
            <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-1">Claim Amount (HOLLOW)</p>
            <p className="text-sm text-white/60">
              Current: <span className="text-[#33C5D9] font-bold">{currentAmount !== undefined ? formatEther(currentAmount as bigint) : "..."} HOLLOW</span>
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0.0"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#33C5D9]/50 placeholder-white/20"
            />
            <button
              onClick={handleSetPrice}
              disabled={pricePending || priceConfirming}
              className="px-4 py-3 bg-[#33C5D9] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pricePending ? "Sign..." : priceConfirming ? "Confirming..." : "Update"}
            </button>
          </div>
          {priceSuccess && <p className="text-green-400 text-xs">Amount updated successfully!</p>}
          {priceError && <p className="text-red-400 text-xs">{priceError.message.split('\n')[0]}</p>}
        </div>

        {/* Claim Cooldown */}
        <div className="space-y-3">
          <div>
            <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-1">Claim Cooldown (seconds)</p>
            <p className="text-sm text-white/60">
              Current: <span className="text-[#33C5D9] font-bold">{currentCooldown !== undefined ? `${Number(currentCooldown)}s (${formatCooldownDisplay(Number(currentCooldown))})` : "..."}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={cooldownInput}
              onChange={(e) => setCooldownInput(e.target.value)}
              placeholder="3600"
              min="0"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#33C5D9]/50 placeholder-white/20"
            />
            <button
              onClick={handleSetCooldown}
              disabled={cooldownPending || cooldownConfirming}
              className="px-4 py-3 bg-[#33C5D9] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cooldownPending ? "Sign..." : cooldownConfirming ? "Confirming..." : "Update"}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "5m", value: "300" },
              { label: "30m", value: "1800" },
              { label: "1h", value: "3600" },
              { label: "6h", value: "21600" },
              { label: "12h", value: "43200" },
              { label: "24h", value: "86400" },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setCooldownInput(preset.value)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border transition-all ${
                  cooldownInput === preset.value
                    ? "bg-[#33C5D9]/10 text-[#33C5D9] border-[#33C5D9]/30"
                    : "bg-white/5 text-muted-blue border-white/10 hover:bg-white/10"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {cooldownSuccess && <p className="text-green-400 text-xs">Cooldown updated successfully!</p>}
          {cooldownError && <p className="text-red-400 text-xs">{cooldownError.message.split('\n')[0]}</p>}
        </div>
      </div>
    </div>
  );
}

function GameConfig() {
  const { data: currentFee } = useReadContract({
    address: THE_HOLLOW_GAME_ADDRESS,
    abi: THE_HOLLOW_GAME_ABI,
    functionName: "getPlayPrice",
  });

  const [feeInput, setFeeInput] = useState("");

  const {
    writeContract: writeFee,
    data: feeHash,
    isPending: feePending,
    error: feeError,
    reset: resetFee,
  } = useWriteContract();
  const { isLoading: feeConfirming, isSuccess: feeSuccess } = useWaitForTransactionReceipt({ hash: feeHash });

  // Pre-fill input with the current on-chain fee
  useEffect(() => {
    if (currentFee !== undefined && !feeInput) {
      setFeeInput(formatEther(currentFee as bigint));
    }
  }, [currentFee, feeInput]);

  const handleSetFee = () => {
    resetFee();
    try {
      const wei = parseEther(feeInput);
      if (wei <= 0n) {
        alert("Fee must be greater than 0");
        return;
      }
      writeFee({
        address: THE_HOLLOW_GAME_ADDRESS,
        abi: THE_HOLLOW_GAME_ABI,
        functionName: "setPlayPrice",
        args: [wei],
      });
    } catch {
      alert("Invalid fee value");
    }
  };

  return (
    <div className="ui-container rounded overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h3 className="text-xl font-header text-white">Game Config</h3>
      </div>
      <div className="p-6">
        <div className="space-y-3 max-w-md">
          <div>
            <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-1">Play Fee (zkLTC)</p>
            <p className="text-sm text-white/60">
              Current: <span className="text-[#33C5D9] font-bold">{currentFee !== undefined ? formatEther(currentFee as bigint) : "..."} zkLTC</span>
            </p>
            <p className="text-[10px] text-muted-blue mt-1">Amount each player pays to play. Must be greater than 0.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
              placeholder="0.0001"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#33C5D9]/50 placeholder-white/20"
            />
            <button
              onClick={handleSetFee}
              disabled={feePending || feeConfirming}
              className="px-4 py-3 bg-[#33C5D9] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {feePending ? "Sign..." : feeConfirming ? "Confirming..." : "Update"}
            </button>
          </div>
          {feeSuccess && <p className="text-green-400 text-xs">Play fee updated successfully!</p>}
          {feeError && <p className="text-red-400 text-xs">{feeError.message.split('\n')[0]}</p>}
        </div>
      </div>
    </div>
  );
}
