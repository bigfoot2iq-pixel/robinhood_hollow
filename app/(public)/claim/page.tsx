"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LitvmHero } from "@/components/ui/LitvmHero";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useCanClaim,
  useClaimTokens,
  useClaimCooldown,
  useClaimAmount,
  useGetTier,
  useTier1Amount,
  useTier2Amount,
  useTier3Amount,
  useGetLastClaimTimestamp,
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

function TierRow({
  icon,
  label,
  sub,
  amount,
  active,
}: {
  icon: string;
  label: string;
  sub: string;
  amount: bigint | undefined;
  active: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded border transition-all ${
        active
          ? "bg-[#33C5D9]/10 border-[#33C5D9]/30 shadow-[0_0_20px_rgba(51,197,217,0.1)]"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined ${active ? "text-[#33C5D9]" : "text-muted-blue"}`}>{icon}</span>
        <div>
          <p className="text-sm font-bold text-white flex items-center gap-2">
            {label}
            {active && (
              <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded bg-[#33C5D9] text-dark-navy">
                You
              </span>
            )}
          </p>
          <p className="text-[10px] text-muted-blue">{sub}</p>
        </div>
      </div>
      <p className="text-sm font-display font-bold text-white whitespace-nowrap">
        {amount !== undefined ? formatTokenBalance(amount) : "..."}
        <span className="text-[10px] text-muted-blue"> HOLLOW</span>
      </p>
    </div>
  );
}

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();

  const { data: canClaim, isLoading: isCheckingClaim } = useCanClaim(address);
  const { data: claimAmount, isLoading: isLoadingAmount } = useClaimAmount(address);
  const { data: tier } = useGetTier(address);
  const { data: tier1Amount } = useTier1Amount();
  const { data: tier2Amount } = useTier2Amount();
  const { data: tier3Amount } = useTier3Amount();
  const { data: lastClaimTimestamp } = useGetLastClaimTimestamp(address);
  const { data: claimCooldown } = useClaimCooldown();
  const { claimTokens, isPending, isConfirming, isSuccess, error, reset } = useClaimTokens();

  const cooldownSeconds = claimCooldown ? Number(claimCooldown) : 3600;
  const cooldownLabel = formatCooldownLabel(cooldownSeconds);

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
    claimTokens();
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
      <LitvmHero />
      <div className="w-full max-w-5xl">
        <div className="ui-container p-6 sm:p-8 lg:p-12 rounded w-full">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left Side - Tokens Claim */}
            <div className="flex-1 space-y-4 lg:space-y-6 flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#33C5D9] rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_30px_rgba(51,197,217,0.2)]">
                <span className="material-symbols-outlined text-dark-navy" style={{ fontSize: 40 }}>redeem</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-header mb-2 sm:mb-3 text-center">Claim Tokens</h1>
              <p className="text-muted-blue text-sm sm:text-base mb-6 sm:mb-8 text-center px-4">
                Claim your HOLLOW rewards — the more top tokens you hold, the more you earn.
                <br />
                And it doesn&apos;t stop there. Your HOLLOW tokens unlock access to upcoming raffles and exclusive future drops.
                <br /><br />
                <span className="text-white font-bold">Hold. Earn. Compound. Unlock</span>
              </p>
              {/* Claim Amount Preview */}
              {isConnected && claimAmount !== undefined && (
                <p className="text-sm text-muted-blue text-center">
                  Claim{" "}
                  <span className="font-bold text-white">
                    +{formatTokenBalance(claimAmount as bigint)} HOLLOW
                  </span>
                  {" "}— free, you only pay gas.
                </p>
              )}

              {/* Claim / Connect Wallet Button */}
              {isConnected ? (
                <button
                  onClick={handleClaim}
                  disabled={isProcessing}
                  className="w-full py-4 sm:py-5 bg-[#33C5D9] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-[0.2em] text-xs sm:text-sm transition-all shadow-[0_0_30px_rgba(51,197,217,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="w-full py-4 sm:py-5 bg-[#33C5D9] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-[0.2em] text-xs sm:text-sm transition-all shadow-[0_0_30px_rgba(51,197,217,0.15)]"
                      >
                        Connect Wallet
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              )}

              {/* Faucet link — claiming costs gas */}
              <Link
                href="/faucet"
                className="w-full flex items-center justify-center gap-2 py-3 border border-[#33C5D9]/30 hover:border-[#33C5D9]/60 hover:bg-[#33C5D9]/5 text-[#33C5D9] font-bold rounded uppercase tracking-[0.2em] text-xs sm:text-sm transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>water_drop</span>
                Need gas? Get testnet tokens
              </Link>
            </div>

            {/* Vertical Separator */}
            <div className="hidden lg:block w-px bg-white/10"></div>

            {/* Right Side - Reward tiers */}
            <div className="lg:w-80 flex-shrink-0 flex items-center">
              <div className="w-full">
                <h2 className="text-base sm:text-lg font-header mb-3 sm:mb-4 text-center">Reward Tiers</h2>
                <p className="text-muted-blue text-[10px] sm:text-xs text-center mb-4 sm:mb-5 px-4">
                  Your reward depends on the tokens you hold. Holding any qualifying
                  token earns the full tier amount — one is enough.
                </p>
                <div className="space-y-2 sm:space-y-3">
                  <TierRow
                    icon="workspace_premium"
                    label="Top 5 tokens"
                    sub="Hold any top-5 token"
                    amount={tier1Amount as bigint | undefined}
                    active={isConnected && tier === 1}
                  />
                  <TierRow
                    icon="military_tech"
                    label="Next 5 tokens"
                    sub="Hold any token ranked 6–10"
                    amount={tier2Amount as bigint | undefined}
                    active={isConnected && tier === 2}
                  />
                  <TierRow
                    icon="redeem"
                    label="Everyone else"
                    sub="Hold none of the above"
                    amount={tier3Amount as bigint | undefined}
                    active={isConnected && tier === 3}
                  />
                  <div className="flex items-center justify-between p-3 rounded border bg-white/5 border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-muted-blue">schedule</span>
                      <div>
                        <p className="text-sm font-bold text-white">Cooldown</p>
                        <p className="text-[10px] text-muted-blue">Wait between claims</p>
                      </div>
                    </div>
                    <p className="text-sm font-display font-bold text-white">{cooldownLabel}</p>
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
