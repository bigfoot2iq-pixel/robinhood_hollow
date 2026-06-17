"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useCanClaim,
  useClaimTokens,
  useClaimPrice,
  useClaimCooldown,
  useGetClaimAmount,
  useGetLastClaimTimestamp,
  useHollowBalance,
  formatTokenBalance
} from "@/lib/hooks";

function formatCooldownLabel(seconds: number): string {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    return days === 1 ? "day" : `${days} days`;
  }
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    return hours === 1 ? "hr" : `${hours} hrs`;
  }
  if (seconds < 60) {
    return seconds === 1 ? "1 second" : `${seconds} seconds`;
  }
  const mins = Math.floor(seconds / 60);
  return mins === 1 ? "min" : `${mins} mins`;
}

function isCooldownError(error: Error): boolean {
  const msg = (error as any).shortMessage ?? error.message ?? "";
  return /cooldown|too soon|wait|claim.*early/i.test(msg);
}

function isUserRejection(error: Error): boolean {
  const msg = (error as any).shortMessage ?? error.message ?? "";
  return /user rejected|user denied|rejected the request/i.test(msg);
}

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();

  const { data: canClaim, isLoading: isCheckingClaim } = useCanClaim(address);
  const { data: claimAmountData, isLoading: isLoadingAmount } = useGetClaimAmount(address);
  const { data: balance } = useHollowBalance(address);
  const { data: lastClaimTimestamp } = useGetLastClaimTimestamp(address);
  const { data: claimPrice } = useClaimPrice();
  const { data: claimCooldown } = useClaimCooldown();
  const { claimTokens, isPending, isConfirming, isSuccess, error, reset } = useClaimTokens();

  const claimAmount = claimAmountData?.[0];
  const tier = claimAmountData?.[1] as number | undefined;
  const cooldownSeconds = claimCooldown ? Number(claimCooldown) : 3600;
  const cooldownLabel = formatCooldownLabel(cooldownSeconds);

  const tierLabels: Record<number, string> = {
    0: "KAT Whale",
    1: "KAT Holder",
    2: "Katana community",
  };

  const handleClaim = () => {
    if (lastClaimTimestamp) {
      const lastClaimTime = Number(lastClaimTimestamp);
      if (lastClaimTime > 0) {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const remaining = (lastClaimTime + cooldownSeconds) - nowSeconds;
        if (remaining > 0) {
          const label = formatCooldownLabel(remaining);
          toast.warning(`Cooldown active — try again in ${label}.`);
          return;
        }
      }
    }
    claimTokens(claimPrice ?? 0n);
  };

  // Handle success
  useEffect(() => {
    if (isSuccess) {
      toast.success("Tokens claimed successfully!");
      queryClient.invalidateQueries();
      reset();
    }
  }, [isSuccess, queryClient, reset]);

  // Handle errors
  useEffect(() => {
    if (!error) return;

    if (isUserRejection(error)) {
      // User rejected in wallet — no toast needed
    } else if (isCooldownError(error)) {
      toast.warning("Cooldown active — please wait before claiming again.");
    } else {
      toast.error(error.message || "Something went wrong.");
    }
    reset();
  }, [error, reset]);

  const isLoading = isCheckingClaim || isLoadingAmount;
  const isProcessing = isPending || isConfirming;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 lg:gap-8 px-4 py-6 lg:py-8">
      <div className="w-full max-w-5xl">
        <div className="ui-container p-6 sm:p-8 lg:p-12 rounded w-full">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left Side - Tokens Claim */}
            <div className="flex-1 space-y-4 lg:space-y-6 flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F4FF1A] rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_30px_rgba(244,255,26,0.2)]">
                <span className="material-symbols-outlined text-dark-navy" style={{ fontSize: 40 }}>redeem</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-header mb-2 sm:mb-3 text-center">Claim Tokens</h1>
              <p className="text-muted-blue text-sm sm:text-base mb-6 sm:mb-8 text-center px-4">
                Claim your HOLLOW rewards in real time — every single second.
                <br />
                And it doesn&apos;t stop there. Your HOLLOW tokens unlock access to upcoming raffles and exclusive future drops.
                <br /><br />
                <span className="text-white font-bold">Hold. Earn. Compound. Unlock</span>
              </p>
              {/* Current Balance */}
              {isConnected && balance !== undefined && (
                <div className="p-4 bg-white/5 rounded border border-white/10 w-full text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-blue mb-1">Your Balance</p>
                  <p className="text-2xl font-display font-bold text-[#F4FF1A]">
                    {formatTokenBalance(balance)} HOLLOW
                  </p>
                </div>
              )}

              {/* Claim Amount Preview */}
              {isConnected && claimAmount !== undefined && (
                <div className="p-4 bg-[#F4FF1A]/5 rounded border border-[#F4FF1A]/20 w-full text-center">
                  <p className="text-xl font-display font-bold text-white">
                    +{claimAmount.toString()} HOLLOW
                  </p>
                  {tier !== undefined && tier < 2 && (
                    <p className="text-xs text-[#F4FF1A] mt-1">You qualify for boosted rewards!</p>
                  )}
                </div>
              )}

              {/* Claim / Connect Wallet Button */}
              {isConnected ? (
                <button
                  onClick={handleClaim}
                  disabled={isProcessing}
                  className="w-full py-4 sm:py-5 bg-[#F4FF1A] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-[0.2em] text-xs sm:text-sm transition-all shadow-[0_0_30px_rgba(244,255,26,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Confirm in Wallet..." : isConfirming ? "Claiming..." : "Claim Your Tokens"}
                </button>
              ) : (
                <ConnectButton.Custom>
                  {({ openConnectModal, openChainModal, chain, mounted }) => {
                    if (!mounted) return null;
                    if (chain?.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          className="w-full py-4 sm:py-5 bg-red-500 hover:bg-red-600 text-white font-bold rounded uppercase tracking-[0.2em] text-xs sm:text-sm transition-all"
                        >
                          Wrong Network
                        </button>
                      );
                    }
                    return (
                      <button
                        onClick={openConnectModal}
                        className="w-full py-4 sm:py-5 bg-[#F4FF1A] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-[0.2em] text-xs sm:text-sm transition-all shadow-[0_0_30px_rgba(244,255,26,0.15)]"
                      >
                        Connect Wallet
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              )}
            </div>

            {/* Vertical Separator */}
            <div className="hidden lg:block w-px bg-white/10"></div>

            {/* Right Side - Claim Tiers */}
            <div className="lg:w-80 flex-shrink-0 flex items-center">
              <div className="w-full">
                <h2 className="text-base sm:text-lg font-header mb-3 sm:mb-4 text-center">Claim Tiers</h2>
                <p className="text-muted-blue text-[10px] sm:text-xs text-center mb-4 sm:mb-5 px-4">
                  Your claim amount is determined by your KAT token holdings.
                </p>
                <div className="space-y-2 sm:space-y-3">
                  <div className={`flex items-center justify-between p-3 rounded border ${tier === 0 ? "bg-[#F4FF1A]/10 border-[#F4FF1A]/30" : "bg-white/5 border-white/10"}`}>
                    <div className="flex items-center gap-3">
                      <img src="https://katanascan.com/token/images/katanatoken_32.svg" alt="KAT" className="w-6 h-6" />
                      <div>
                        <p className={`text-sm font-bold ${tier === 0 ? "text-[#F4FF1A]" : "text-white"}`}>KAT Whale</p>
                        <p className="text-[10px] text-muted-blue">Hold ≥ 10,000 KAT</p>
                      </div>
                    </div>
                    <p className="text-sm font-display font-bold text-white">200 <span className="text-[10px] text-muted-blue">/ {cooldownLabel}</span></p>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded border ${tier === 1 ? "bg-[#F4FF1A]/10 border-[#F4FF1A]/30" : "bg-white/5 border-white/10"}`}>
                    <div className="flex items-center gap-3">
                      <img src="https://katanascan.com/token/images/katanatoken_32.svg" alt="KAT" className="w-6 h-6" />
                      <div>
                        <p className={`text-sm font-bold ${tier === 1 ? "text-[#F4FF1A]" : "text-white"}`}>KAT Holder</p>
                        <p className="text-[10px] text-muted-blue">Hold any amount of KAT</p>
                      </div>
                    </div>
                    <p className="text-sm font-display font-bold text-white">100 <span className="text-[10px] text-muted-blue">/ {cooldownLabel}</span></p>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded border ${tier === 2 ? "bg-[#F4FF1A]/10 border-[#F4FF1A]/30" : "bg-white/5 border-white/10"}`}>
                    <div className="flex items-center gap-3">
                      <img src="https://pbs.twimg.com/media/G96KV6FXkAE_0cy?format=jpg" alt="Katana community" className="w-6 h-6 opacity-50" />
                      <div>
                        <p className={`text-sm font-bold ${tier === 2 ? "text-[#F4FF1A]" : "text-white"}`}>Katana community</p>
                        <p className="text-[10px] text-muted-blue">Open to everyone</p>
                      </div>
                    </div>
                    <p className="text-sm font-display font-bold text-white">25 <span className="text-[10px] text-muted-blue">/ {cooldownLabel}</span></p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-blue text-center mt-4 uppercase tracking-widest">
                  Claim once every {cooldownLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
