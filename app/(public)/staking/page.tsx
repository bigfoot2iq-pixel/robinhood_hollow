"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseEther, formatEther } from "viem";
import { toast } from "sonner";
import {
  useKATBalance,
  useKATPrice,
  useAVKATBalance,
  useVKATLocks,
  useStakeAVKAT,
  useStakeVKAT,
  getVKATTotal,
  formatTokenBalance,
  useAVKATClaimInfo,
  useVKATClaimInfo,
  useClaimAVKAT,
  useClaimVKAT,
  useAVKATTiers,
  useVKATTiers,
  type TierInfo,
} from "@/lib/hooks";
import { useCountdown } from "@/lib/hooks/useCountdown";

const FREE_MINT_REQUIRED_HOLLOW = 10_000;
const FREE_MINT_MAX_SPOTS = 200;

// ─── Hollow Reward Card ───────────────────────────────────────────────────────

function ClaimCountdown({ secondsRemaining, onExpire }: { secondsRemaining: number; onExpire?: () => void }) {
  const [nextClaimDate, setNextClaimDate] = useState<Date>(new Date());

  useEffect(() => {
    setNextClaimDate(new Date(Date.now() + secondsRemaining * 1000));
  }, [secondsRemaining]);

  const { hours, minutes, seconds, isExpired } = useCountdown(nextClaimDate);
  useEffect(() => { if (isExpired) onExpire?.(); }, [isExpired, onExpire]);
  if (isExpired) return null;
  return (
    <span className="font-mono text-xs text-muted-blue">
      {hours}:{minutes}:{seconds}
    </span>
  );
}

function TierRow({ tier, index, userBalance }: { tier: TierInfo; index: number; userBalance: bigint }) {
  const isActive = userBalance >= tier.threshold;
  const label = index === 0 ? "Tier 1" : index === 1 ? "Tier 2" : "Tier 3";
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
      isActive
        ? "bg-[#F4FF1A]/10 border border-[#F4FF1A]/20"
        : "bg-white/5 border border-white/5"
    }`}>
      <div className="flex items-center gap-2">
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#F4FF1A] shrink-0" />}
        <span className={isActive ? "text-white font-bold" : "text-muted-blue"}>{label}</span>
        <span className={isActive ? "text-white/60" : "text-white/20"}>
          ≥ {parseFloat(formatEther(tier.threshold)).toLocaleString()}
        </span>
      </div>
      <span className={`font-bold font-display ${isActive ? "text-[#F4FF1A]" : "text-white/30"}`}>
        {parseFloat(formatEther(tier.hollowAmount)).toLocaleString()} HOLLOW
      </span>
    </div>
  );
}

function FreeMintReserveCard({ address }: { address: `0x${string}` | undefined }) {
  const [reservedCount, setReservedCount] = useState<number | null>(null);
  const [isReserved, setIsReserved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/staking-rewards/free-mint/reserve");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load stats");
      setReservedCount(data.reservedCount ?? 0);
    } catch {
      setStatusMessage("Failed to load reservation stats");
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const reserveSpot = async () => {
    if (!address || isLoading) return;
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/staking-rewards/free-mint/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(data.error || "Reservation failed");
        return;
      }

      setReservedCount(data.reservedCount ?? 0);
      setIsReserved(Boolean(data.reserved));
      setStatusMessage(data.alreadyReserved ? "You already reserved your free mint spot" : "Free mint spot reserved");
      toast.success(data.alreadyReserved ? "Already reserved" : "Free mint reserved");
    } catch {
      setStatusMessage("Reservation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const count = reservedCount ?? 0;
  const remaining = Math.max(FREE_MINT_MAX_SPOTS - count, 0);
  const isSoldOut = remaining === 0;

  return (
    <div className="ui-container rounded-2xl p-5 flex flex-col gap-4">
      <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest">Free Hollow Mint Reservation</p>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="text-white font-header text-lg">Reserve Free Mint</h3>
          <p className="text-sm text-white/70">
            First{" "}
            <span className="text-[#F4FF1A] font-bold">{FREE_MINT_MAX_SPOTS} wallets</span>
            {" "}with at least{" "}
            <span className="text-[#F4FF1A] font-bold">{FREE_MINT_REQUIRED_HOLLOW.toLocaleString()} HOLLOW</span>
            {" "}can reserve one{" "}
            <span className="text-[#F4FF1A] font-bold">free mint</span>.
          </p>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">Reserved</span>
          <span className="text-[#F4FF1A] font-bold">{count}/{FREE_MINT_MAX_SPOTS}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-[#F4FF1A] transition-all"
            style={{ width: `${Math.min((count / FREE_MINT_MAX_SPOTS) * 100, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-blue">{remaining} spots left</span>
          <button
            onClick={reserveSpot}
            disabled={!address || isLoading || isReserved || isSoldOut}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
              isReserved
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-[#F4FF1A] text-dark-navy hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {isReserved ? "Reserved" : isLoading ? "Reserving..." : isSoldOut ? "Sold Out" : "Reserve Spot"}
          </button>
        </div>
        {statusMessage && <p className="text-xs text-center text-white/70">{statusMessage}</p>}
      </div>
    </div>
  );
}

function HollowRewardCard({
  token, imgSrc, stakedAmount, stakedUSD, address, stakedWei,
}: {
  token: "avKAT" | "vKAT";
  imgSrc: string;
  stakedAmount: string;
  stakedUSD: string;
  address: `0x${string}` | undefined;
  stakedWei: bigint;
}) {
  const { eligible, secondsRemaining, refetch: refetchClaimInfo } = token === "avKAT"
    ? useAVKATClaimInfo(address)
    : useVKATClaimInfo(address);
  const { tiers, configured, isLoading: tiersLoading } = token === "avKAT"
    ? useAVKATTiers()
    : useVKATTiers();
  const { claim, status, errorMessage, tierAmount } = token === "avKAT"
    ? useClaimAVKAT(address)
    : useClaimVKAT(address);

  useEffect(() => {
    if (status === "success") refetchClaimInfo();
  }, [status]);

  const isLoading = status === "fetching" || status === "signing" || status === "confirming";
  const isSuccess = status === "success";

  const buttonLabel = () => {
    if (status === "fetching") return "Checking...";
    if (status === "signing") return "Sign tx...";
    if (status === "confirming") return "Confirming...";
    if (isSuccess) return "Claimed!";
    return "Claim";
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-4">

      {/* Token header */}
      <div className="flex items-center gap-3">
        <div className="overflow-hidden rounded-full shrink-0 w-9 h-9">
          <img alt={token} width="36" height="36" className="h-full w-full object-cover" src={imgSrc} />
        </div>
        <div>
          <p className="text-white font-bold text-sm">{token}</p>
          <p className="text-muted-blue text-xs">{stakedAmount} staked</p>
        </div>
        {tierAmount && (
          <span className="ml-auto text-[#F4FF1A] text-xs font-bold">+{parseFloat(tierAmount).toLocaleString()} HOLLOW</span>
        )}
      </div>

      {/* Tiers */}
      {tiersLoading ? (
        <div className="space-y-1.5">
          {[0,1,2].map(i => <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />)}
        </div>
      ) : !configured ? (
        <div className="text-center py-3 text-muted-blue text-xs">No tiers configured yet</div>
      ) : (
        <div className="space-y-1.5">
          {tiers.map((tier, i) => (
            <TierRow key={i} tier={tier} index={i} userBalance={stakedWei} />
          ))}
        </div>
      )}

      {/* Claim button or countdown */}
      {!configured ? (
        <button disabled className="w-full py-2.5 rounded-full text-sm font-bold bg-white/5 text-white/20 cursor-not-allowed border border-white/10">
          Not Available
        </button>
      ) : eligible ? (
        <button
          onClick={claim}
          disabled={isLoading || isSuccess}
          className={`w-full py-2.5 rounded-full text-sm font-bold transition-all ${
            isSuccess
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-[#F4FF1A] hover:brightness-110 text-dark-navy disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          {buttonLabel()}
        </button>
      ) : (
        <div className="w-full py-2.5 rounded-full bg-white/5 border border-white/10 flex flex-col items-center gap-0.5">
          {secondsRemaining > 0
            ? <ClaimCountdown secondsRemaining={secondsRemaining} onExpire={refetchClaimInfo} />
            : <span className="text-xs text-muted-blue">Loading...</span>
          }
        </div>
      )}

      {errorMessage && (
        <p className="text-red-400 text-xs text-center">{errorMessage}</p>
      )}
    </div>
  );
}

type StakeOption = "avKAT" | "vKAT";

export default function StakingPage() {
  const { address, isConnected } = useAccount();
const { data: balance } = useKATBalance(address);
  const { data: avkatBalance } = useAVKATBalance(address);
  const { data: vkatTokens } = useVKATLocks(address);
  const { data: katPrice } = useKATPrice();
  const { stake: stakeAVKAT, reset: resetAVKAT, status: avkatStatus, errorMessage: avkatError } = useStakeAVKAT(address);
  const { stake: stakeVKAT, reset: resetVKAT, status: vkatStatus, errorMessage: vkatError } = useStakeVKAT(address);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"stake" | "vote" | "rewards">("stake");
  const [stakeAmount, setStakeAmount] = useState("");
  const [selectedOption, setSelectedOption] = useState<StakeOption>("avKAT");

  const stakeStatus = selectedOption === "avKAT" ? avkatStatus : vkatStatus;
  const errorMessage = selectedOption === "avKAT" ? avkatError : vkatError;
  const resetStake = selectedOption === "avKAT" ? resetAVKAT : resetVKAT;

  const formattedBalance = balance !== undefined ? formatTokenBalance(balance) : "0.00";
  const formattedAVKAT = avkatBalance !== undefined ? formatTokenBalance(avkatBalance as bigint) : "0.00";
  const vkatTotal = vkatTokens ? getVKATTotal(vkatTokens) : 0n;
  const formattedVKAT = formatTokenBalance(vkatTotal);

  console.log("[staking page] vkatTokens:", vkatTokens);
  console.log("[staking page] vkatTotal (bigint):", vkatTotal.toString());
  console.log("[staking page] formattedVKAT:", formattedVKAT);

  const katUSD = katPrice && balance !== undefined
    ? (katPrice.usd * parseFloat(formattedBalance)).toFixed(2)
    : null;
  const katChange = katPrice?.usd_24h_change ?? null;
  const katChangePositive = katChange !== null && katChange >= 0;

  const avkatUSD = (parseFloat(formattedAVKAT) * 0.01).toFixed(2);
  const vkatUSD = (parseFloat(formattedVKAT) * 0.01).toFixed(2);

  const handleMaxClick = () => {
    if (balance !== undefined) {
      setStakeAmount(formatTokenBalance(balance));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setStakeAmount(value);
    }
  };

  useEffect(() => {
    if (stakeStatus === "success") {
      toast.success(`Successfully staked ${stakeAmount} KAT as ${selectedOption}!`);
      setStakeAmount("");
      resetStake();
      if (selectedOption === "vKAT") {
        // Wait 2s for the indexer to catch up before refreshing
        setTimeout(() => queryClient.invalidateQueries(), 2000);
      } else {
        queryClient.invalidateQueries();
      }
    }
  }, [stakeStatus]);

  useEffect(() => {
    if (stakeStatus === "error" && errorMessage) {
      if (!/user rejected|user denied/i.test(errorMessage)) {
        toast.error(errorMessage);
      }
      resetStake();
    }
  }, [stakeStatus, errorMessage]);

  const handleStake = () => {
    if (!stakeAmount || parseFloat(stakeAmount) < 0.5) return;
    const amountWei = parseEther(stakeAmount);
    if (selectedOption === "avKAT") {
      stakeAVKAT(amountWei);
    } else {
      stakeVKAT(amountWei);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="ui-container p-12 rounded text-center max-w-md w-full">
          <div className="w-16 h-16 bg-[#F4FF1A]/10 flex items-center justify-center rounded-full mx-auto mb-6">
            <span className="material-symbols-outlined text-[#F4FF1A]" style={{ fontSize: 32 }}>account_balance_wallet</span>
          </div>
          <h1 className="text-3xl font-header mb-3">Connect Your Wallet</h1>
          <p className="text-muted-blue text-sm">Connect your wallet to access the KAT staking dashboard.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page Title */}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-header text-white mb-4 lg:mb-8">
        Staking
      </h2>

      {/* Tab Navigation */}
      <div className="flex justify-center sticky top-[68px] md:top-[80px] z-10">
        <div className="ui-container rounded-full p-1 inline-flex gap-1">
          <button
            onClick={() => setActiveTab("stake")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === "stake"
                ? "bg-[#F4FF1A] text-dark-navy"
                : "text-white/60 hover:text-white"
            }`}
          >
            Stake
          </button>
          <button
            onClick={() => setActiveTab("vote")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === "vote"
                ? "bg-[#F4FF1A] text-dark-navy"
                : "text-white/60 hover:text-white"
            }`}
          >
            Vote
          </button>
          <button
            onClick={() => setActiveTab("rewards")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === "rewards"
                ? "bg-[#F4FF1A] text-dark-navy"
                : "text-white/60 hover:text-white"
            }`}
          >
            Rewards
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="flex gap-x-2 w-full max-w-[840px] mx-auto overflow-x-auto scrollbar-none">
        {/* KAT Balance */}
        <div className="ui-container rounded-lg p-3 flex flex-col gap-y-2 flex-1 min-w-[140px]">
          <span className="text-sm text-muted-blue">KAT Balance</span>
          <div className="flex items-center gap-x-2.5">
            <div className="overflow-hidden rounded-full shrink-0 w-6 h-6">
              <img
                alt="KAT"
                width="24"
                height="24"
                className="h-full w-full object-cover"
                src="https://app.katana.network/cdn-cgi/image/width=48/assets%2Fv1%2Ftokens%2Fkat.png"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-x-1">
                <span className="text-white font-medium">
                  {katUSD !== null ? `$${katUSD}` : "—"}
                </span>
                {katChange !== null && (
                  <span className={`hidden text-sm md:block ${katChangePositive ? "text-green-400" : "text-red-400"}`}>
                    {katChangePositive ? "+" : ""}{katChange.toFixed(2)}%
                  </span>
                )}
              </div>
              <span className="text-sm text-white/50">{formattedBalance} KAT</span>
            </div>
          </div>
        </div>

        {/* avKAT */}
        <div className="ui-container rounded-lg p-3 flex flex-col gap-y-2 flex-1 min-w-[140px]">
          <span className="text-sm text-muted-blue">avKAT</span>
          <div className="flex items-center gap-x-2.5">
            <div className="overflow-hidden rounded-full shrink-0 w-6 h-6">
              <img
                alt="avKAT"
                width="24"
                height="24"
                className="h-full w-full object-cover"
                src="https://app.katana.network/cdn-cgi/image/width=48/assets%2Fv1%2Ftokens%2Favkat.png"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-medium">${avkatUSD}</span>
              <span className="text-sm text-white/50">{formattedAVKAT} avKAT</span>
            </div>
          </div>
        </div>

        {/* vKAT */}
        <div className="ui-container rounded-lg p-3 flex flex-col gap-y-2 flex-1 min-w-[140px]">
          <span className="text-sm text-muted-blue">vKAT</span>
          <div className="flex items-center gap-x-2.5">
            <div className="overflow-hidden rounded-full shrink-0 w-6 h-6">
              <img
                alt="vKAT"
                width="24"
                height="24"
                className="h-full w-full object-cover"
                src="https://app.katana.network/cdn-cgi/image/width=48/assets%2Fv1%2Ftokens%2Fvkat.png"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-medium">${vkatUSD}</span>
              <span className="text-sm text-white/50">{formattedVKAT} vKAT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staking Form */}
      {activeTab === "stake" && (
        <div className="max-w-[840px] mx-auto">
          <div className="ui-container rounded-2xl p-4 lg:p-6">
            <div className="flex gap-4 lg:gap-6">
              {/* Form Side */}
              <div className="flex flex-col gap-4 flex-1 min-w-0">
                {/* Amount Input */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex flex-wrap gap-4 items-start">
                    <div className="flex-1 flex flex-col gap-3 items-start">
                      <label className="text-muted-blue text-[10px] font-bold uppercase tracking-widest">
                        Stake
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={stakeAmount}
                        onChange={handleAmountChange}
                        className="p-0 bg-transparent text-xl font-display font-bold text-white w-full border-none outline-none focus:ring-0 placeholder:text-white/20"
                      />
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="flex gap-2 items-center p-1.5 pr-3 bg-white/5 rounded-full">
                        <div className="overflow-hidden rounded-full shrink-0 w-8 h-8">
                          <img alt="KAT" width="32" height="32" className="h-full w-full object-cover"
                            src="https://app.katana.network/cdn-cgi/image/width=64/assets%2Fv1%2Ftokens%2Fkat.png" />
                        </div>
                        <span className="text-white text-sm font-medium">KAT</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full">
                      {stakeAmount && parseFloat(stakeAmount) < 0.5 ? (
                        <span className="bg-red-500/10 text-red-400 text-[12px] leading-none px-2.5 py-1.5 rounded-full">
                          Amount must be at least 0.5
                        </span>
                      ) : (
                        <span></span>
                      )}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-sm text-muted-blue">{formattedBalance} KAT</span>
                        <button
                          type="button"
                          onClick={handleMaxClick}
                          className="bg-white/10 hover:bg-white/15 px-2 py-1 text-xs text-muted-blue rounded-full transition-all"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stake Option Selection: avKAT or vKAT */}
                <div className="bg-white/5 rounded-2xl p-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOption("avKAT")}
                    className={`w-full rounded-xl p-3 flex flex-col gap-2 transition-all text-left active:scale-[0.97] ${
                      selectedOption === "avKAT"
                        ? "bg-white/10 border border-white/10"
                        : "border border-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="overflow-hidden rounded-full shrink-0 w-6 h-6">
                      <img alt="avKAT" width="24" height="24" className="h-full w-full object-cover"
                        src="https://app.katana.network/cdn-cgi/image/width=48/assets%2Fv1%2Ftokens%2Favkat.png" />
                    </div>
                    <div className="flex flex-col md:flex-row gap-1.5 md:items-center">
                      <span className={`text-sm font-display font-bold ${selectedOption === "avKAT" ? "text-white" : "text-white/60"}`}>
                        avKAT
                      </span>
                      <span className="bg-white/5 rounded-lg px-1.5 py-1 text-[10px] text-muted-blue uppercase font-bold tracking-wider w-fit">
                        Auto-Vote
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOption("vKAT")}
                    className={`w-full rounded-xl p-3 flex flex-col gap-2 transition-all text-left active:scale-[0.97] ${
                      selectedOption === "vKAT"
                        ? "bg-white/10 border border-white/10"
                        : "border border-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="overflow-hidden rounded-full shrink-0 w-6 h-6">
                      <img alt="vKAT" width="24" height="24" className="h-full w-full object-cover"
                        src="https://app.katana.network/cdn-cgi/image/width=48/assets%2Fv1%2Ftokens%2Fvkat.png" />
                    </div>
                    <div className="flex flex-col md:flex-row gap-1.5 md:items-center">
                      <span className={`text-sm font-display font-bold ${selectedOption === "vKAT" ? "text-white" : "text-white/60"}`}>
                        vKAT
                      </span>
                      <span className="bg-white/5 rounded-lg px-1.5 py-1 text-[10px] text-muted-blue uppercase font-bold tracking-wider w-fit">
                        Custom Voting
                      </span>
                    </div>
                  </button>
                </div>

                {/* Exit Fees Info */}
                <div className="bg-white/5 hover:bg-white/8 rounded-lg py-3 px-4 flex items-center gap-4 transition-colors">
                  <div className="p-1.5 bg-white/5 rounded-full text-white flex-shrink-0">
                    <span className="material-symbols-outlined text-[#F4FF1A]" style={{ fontSize: 16 }}>schedule</span>
                  </div>
                  <p className="text-sm text-white/80">Exit Fees</p>
                  <span className="text-sm text-muted-blue ml-auto font-display">
                    80% fee &bull; 2.5% after 60 days
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleStake}
                  disabled={!stakeAmount || parseFloat(stakeAmount) < 0.5 || stakeStatus === "approving" || stakeStatus === "staking"}
                  className="w-full rounded-full py-3.5 px-4 text-sm font-bold text-center transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-[#F4FF1A] text-dark-navy hover:bg-[#e5f017]"
                >
                  {stakeStatus === "approving"
                    ? "1/2 Approving KAT..."
                    : stakeStatus === "staking"
                    ? "2/2 Staking..."
                    : !stakeAmount
                    ? "Enter amount to Stake"
                    : parseFloat(stakeAmount) < 0.5
                    ? "Minimum 0.5 KAT required"
                    : `Stake ${stakeAmount} KAT as ${selectedOption}`}
                </button>
              </div>

              {/* Info Panel (desktop only) */}
              <div className="flex-1 relative hidden md:block rounded-2xl overflow-hidden min-h-[340px]">
                <img
                  alt={selectedOption === "avKAT" ? "avKAT staking flow" : "vKAT staking flow"}
                  className="absolute inset-0 w-full h-full object-cover"
                  src={selectedOption === "avKAT"
                    ? "https://app.katana.network/cdn-cgi/image/width=1200/assets%2Fv1%2Fstaking%2Favkat-explainer.png"
                    : "https://app.katana.network/cdn-cgi/image/width=1200/assets%2Fv1%2Fstaking%2Fvkat-explainer.png"}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vote Tab */}
      {activeTab === "vote" && (
        <div className="max-w-[840px] mx-auto">
          <div className="ui-container rounded-2xl p-12 text-center flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-[#F4FF1A]/10 flex items-center justify-center rounded-full">
              <span className="material-symbols-outlined text-[#F4FF1A]" style={{ fontSize: 32 }}>how_to_vote</span>
            </div>
            <div>
              <h3 className="text-2xl font-header text-white mb-2">Vote on Katana</h3>
              <p className="text-muted-blue text-sm max-w-sm mx-auto">
                Use your vKAT or avKAT to vote on governance proposals and direct protocol incentives on the official Katana app.
              </p>
            </div>
            <a
              href="https://app.katana.network/stake?tab=vote"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-[#F4FF1A] hover:bg-[#e5f017] text-dark-navy font-bold rounded-full text-sm uppercase tracking-[0.15em] transition-all active:scale-[0.98]"
            >
              Go to Katana Voting
            </a>
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === "rewards" && (
        <div className="max-w-[840px] mx-auto space-y-4">

          {/* Katana Official Rewards */}
          <div className="ui-container rounded-2xl p-8 text-center flex flex-col items-center gap-5">
            <div className="w-14 h-14 bg-[#F4FF1A]/10 flex items-center justify-center rounded-full">
              <span className="material-symbols-outlined text-[#F4FF1A]" style={{ fontSize: 28 }}>redeem</span>
            </div>
            <div>
              <h3 className="text-xl font-header text-white mb-2">Katana Rewards</h3>
              <p className="text-muted-blue text-sm max-w-sm mx-auto">
                Claim your staking rewards, view emissions, and manage incentives on the official Katana app.
              </p>
            </div>
            <a
              href="https://app.katana.network/stake?tab=rewards"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-[#F4FF1A] hover:bg-[#e5f017] text-dark-navy font-bold rounded-full text-sm uppercase tracking-[0.15em] transition-all active:scale-[0.98]"
            >
              Go to Katana Rewards
            </a>
          </div>

          {/* Hollow Rewards */}
          <div className="ui-container rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest">Hollow Rewards</p>
            <div className="grid grid-cols-2 gap-3">
              <HollowRewardCard
                token="avKAT"
                imgSrc="https://app.katana.network/cdn-cgi/image/width=80/assets%2Fv1%2Ftokens%2Favkat.png"
                stakedAmount={formattedAVKAT}
                stakedUSD={avkatUSD}
                address={address}
                stakedWei={avkatBalance as bigint ?? 0n}
              />
              <HollowRewardCard
                token="vKAT"
                imgSrc="https://app.katana.network/cdn-cgi/image/width=80/assets%2Fv1%2Ftokens%2Fvkat.png"
                stakedAmount={formattedVKAT}
                stakedUSD={vkatUSD}
                address={address}
                stakedWei={vkatTotal}
              />
            </div>
          </div>

          <FreeMintReserveCard address={address} />
        </div>
      )}

      {/* Staked Positions Table */}
      {activeTab === "stake" && <div className="max-w-[840px] mx-auto">
        <div className="ui-container rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="border-b border-white/10 p-4">
            <p className="text-lg font-header text-white">Staked KAT</p>
          </div>

          {/* Column Headers (desktop) */}
          <div className="hidden md:grid grid-cols-[minmax(0,124px)_minmax(0,100px)_minmax(0,80px)_minmax(0,110px)_minmax(0,110px)_1fr] px-4 py-2 border-b border-white/10 text-muted-blue text-[10px] font-bold uppercase tracking-widest">
            <span className="p-1.5">Token</span>
            <span className="p-1.5">Amount</span>
            <span className="p-1.5">APY</span>
            <span className="p-1.5">Rewards</span>
            <span className="p-1.5">Strategy</span>
            <span className="p-1.5">Mode</span>
          </div>

          {/* Staked Positions */}
          {(!vkatTokens || vkatTokens.length === 0) && (!avkatBalance || avkatBalance === 0n) ? (
            <div className="p-8 lg:p-12 text-center">
              <p className="text-muted-blue text-sm">No staked positions yet. Stake your KAT tokens above to get started.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-3 md:p-0 md:gap-0 md:divide-y md:divide-white/10">

              {/* vKAT rows — one per position */}
              {vkatTokens && vkatTokens.map((token) => {
                const posAmount = formatTokenBalance(BigInt(token.currentValue));
                const posUSD = (parseFloat(posAmount) * 0.01).toFixed(2);
                const mode = token.inExitQueue ? "Exiting" : "Voting";
                const modeColor = token.inExitQueue ? "text-yellow-400" : "text-green-500";
                const modeBg = token.inExitQueue ? "bg-yellow-400/10" : "bg-green-500/10";
                const modeDot = token.inExitQueue ? "bg-yellow-400" : "bg-green-500";
                return (
                  <div key={token.id} className="bg-white/5 border border-white/5 rounded-2xl cursor-pointer p-4 flex flex-col gap-y-0 divide-y divide-white/5 active:scale-[0.99] md:bg-transparent md:border-0 md:rounded-none md:hover:bg-white/5 md:active:scale-100 md:divide-y-0 md:grid md:grid-cols-6 md:items-center md:gap-0 transition-all text-[15px]">
                    {/* Token */}
                    <div className="flex items-center justify-between py-3 md:py-0 md:justify-start md:gap-x-3 md:p-1.5">
                      <div className="flex items-center gap-x-3">
                        <div className="overflow-hidden rounded-full shrink-0 w-6 h-6">
                          <img alt="vKAT" width="24" height="24" className="h-full w-full object-cover"
                            src="https://app.katana.network/cdn-cgi/image/width=48/assets%2Fv1%2Ftokens%2Fvkat.png" />
                        </div>
                        <span className="text-white">vKAT</span>
                      </div>
                      <span className="md:hidden">
                        <div className={`p-1.5 pr-2 rounded-full flex gap-x-1 items-center ${modeBg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${modeDot}`}></div>
                          <span className={`text-xs uppercase ${modeColor}`}>{mode}</span>
                        </div>
                      </span>
                    </div>
                    {/* Deposits */}
                    <div className="flex items-center justify-between py-3 md:py-0 md:justify-start md:flex-col md:items-start md:p-1.5">
                      <span className="text-white/50 md:hidden">Deposits</span>
                      <div className="flex items-center gap-2 md:hidden">
                        <span className="bg-white/5 text-white/50 text-[12px] px-2 py-0.5 rounded-full">{posAmount}</span>
                        <span className="text-white">${posUSD}</span>
                      </div>
                      <div className="hidden md:flex flex-col gap-y-1 text-start">
                        <span className="text-white">${posUSD}</span>
                        <span className="text-white/50 text-sm">{posAmount}</span>
                      </div>
                    </div>
                    {/* APY */}
                    <div className="flex items-center justify-between py-4 md:py-0 md:justify-start md:p-1.5">
                      <span className="text-white/50 md:hidden">APY</span>
                      <span className="text-green-500">30.50%</span>
                    </div>
                    {/* Rewards */}
                    <div className="flex items-center justify-between py-4 md:justify-start md:p-1.5">
                      <span className="text-white/50 md:hidden">Rewards</span>
                      <span className="text-white">&lt; $0.01</span>
                    </div>
                    {/* Strategy */}
                    <div className="py-4 md:py-0">
                      <div className="flex items-center justify-between md:justify-start md:p-1.5">
                        <span className="text-white/50 md:hidden">Voting Strategy</span>
                        <span className="text-white">Auto</span>
                      </div>
                    </div>
                    {/* Mode */}
                    <div className="flex items-center justify-between py-3 md:py-0">
                      <div className="hidden md:flex flex-1 md:flex-auto items-center md:justify-start md:p-1.5">
                        <div className={`p-1.5 pr-2 rounded-full flex gap-x-1 items-center ${modeBg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${modeDot}`}></div>
                          <span className={`text-xs uppercase ${modeColor}`}>{mode}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* avKAT row */}
              {avkatBalance !== undefined && (avkatBalance as bigint) > 0n && (
                <div className="bg-white/5 border border-white/5 rounded-2xl cursor-pointer p-4 flex flex-col gap-y-0 divide-y divide-white/5 active:scale-[0.99] md:bg-transparent md:border-0 md:rounded-none md:hover:bg-white/5 md:active:scale-100 md:divide-y-0 md:grid md:grid-cols-6 md:items-center md:gap-0 transition-all text-[15px]">
                  {/* Token */}
                  <div className="flex items-center justify-between py-3 md:py-0 md:justify-start md:gap-x-3 md:p-1.5">
                    <div className="flex items-center gap-x-3">
                      <div className="overflow-hidden rounded-full shrink-0 w-6 h-6">
                        <img alt="avKAT" width="24" height="24" className="h-full w-full object-cover"
                          src="https://app.katana.network/cdn-cgi/image/width=48/assets%2Fv1%2Ftokens%2Favkat.png" />
                      </div>
                      <span className="text-white">avKAT</span>
                    </div>
                    <span className="md:hidden">
                      <div className="p-1.5 pr-2 rounded-full flex gap-x-1 items-center bg-green-500/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs uppercase text-green-500">Voting</span>
                      </div>
                    </span>
                  </div>
                  {/* Deposits */}
                  <div className="flex items-center justify-between py-3 md:py-0 md:justify-start md:flex-col md:items-start md:p-1.5">
                    <span className="text-white/50 md:hidden">Deposits</span>
                    <div className="flex items-center gap-2 md:hidden">
                      <span className="bg-white/5 text-white/50 text-[12px] px-2 py-0.5 rounded-full">{formattedAVKAT}</span>
                      <span className="text-white">${avkatUSD}</span>
                    </div>
                    <div className="hidden md:flex flex-col gap-y-1 text-start">
                      <span className="text-white">${avkatUSD}</span>
                      <span className="text-white/50 text-sm">{formattedAVKAT}</span>
                    </div>
                  </div>
                  {/* APY */}
                  <div className="flex items-center justify-between py-4 md:py-0 md:justify-start md:p-1.5">
                    <span className="text-white/50 md:hidden">APY</span>
                    <span className="text-green-500">30.50%</span>
                  </div>
                  {/* Rewards */}
                  <div className="flex items-center justify-between py-4 md:justify-start md:p-1.5">
                    <span className="text-white/50 md:hidden">Rewards</span>
                    <span className="text-white">&lt; $0.01</span>
                  </div>
                  {/* Strategy */}
                  <div className="py-4 md:py-0">
                    <div className="flex items-center justify-between md:justify-start md:p-1.5">
                      <span className="text-white/50 md:hidden">Voting Strategy</span>
                      <span className="text-white">Max Growth</span>
                    </div>
                  </div>
                  {/* Mode */}
                  <div className="flex items-center justify-between py-3 md:py-0">
                    <div className="hidden md:flex flex-1 md:flex-auto items-center md:justify-start md:p-1.5">
                      <div className="p-1.5 pr-2 rounded-full flex gap-x-1 items-center bg-green-500/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs uppercase text-green-500">Voting</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>}
    </div>
  );
}
