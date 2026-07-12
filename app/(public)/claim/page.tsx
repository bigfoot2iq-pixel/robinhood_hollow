"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useCanClaim,
  useClaimTokens,
  useClaimCooldown,
  useGetLastClaimTimestamp,
  useCategoryAmount,
  useCategoryFee,
  useCategoryName,
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

function CategoryCard({
  categoryId,
  selected,
  onSelect,
  disabled,
}: {
  categoryId: number;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const { data: name } = useCategoryName(categoryId);
  const { data: amount } = useCategoryAmount(categoryId);
  const { data: fee } = useCategoryFee(categoryId);

  const amountValue = amount as bigint | undefined;
  const feeValue = fee as bigint | undefined;
  const isEnabled = amountValue !== undefined && amountValue > 0n;

  return (
    <button
      onClick={onSelect}
      disabled={disabled || !isEnabled}
      className={`w-full text-left p-4 sm:p-5 rounded-xl border transition-all ${
        selected
          ? "bg-[#ccff00]/10 border-[#ccff00]/40 shadow-[0_0_25px_rgba(204,255,0,0.15)]"
          : "bg-white/5 border-white/10 hover:border-[#ccff00]/30 hover:bg-[#ccff00]/5"
      } ${!isEnabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm sm:text-base font-bold text-text-primary truncate">
          {name || `Category ${categoryId + 1}`}
        </h3>
        {selected && (
          <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded bg-[#ccff00] text-[#1a160d]">
            Selected
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-blue uppercase tracking-widest">Mint Amount</span>
          <span className="text-sm font-display font-bold text-text-primary">
            {amountValue !== undefined ? formatTokenBalance(amountValue) : "..."}
            <span className="text-[10px] text-muted-blue ml-1">HOLLOW</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-blue uppercase tracking-widest">Fee</span>
          <span className="text-sm font-display font-bold text-[#ccff00]">
            {feeValue !== undefined ? formatEther(feeValue) : "..."}
            <span className="text-[10px] text-muted-blue ml-1">ETH</span>
          </span>
        </div>
      </div>
    </button>
  );
}

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const { data: canClaim, isLoading: isCheckingClaim } = useCanClaim(address);
  const { data: lastClaimTimestamp } = useGetLastClaimTimestamp(address);
  const { data: claimCooldown } = useClaimCooldown();
  const { claimTokens, isPending, isConfirming, isSuccess, error, reset } = useClaimTokens();

  const { data: selectedFee } = useCategoryFee(selectedCategory ?? 0);

  const cooldownSeconds = claimCooldown ? Number(claimCooldown) : 3600;
  const cooldownLabel = formatCooldownLabel(cooldownSeconds);

  const handleClaim = () => {
    if (selectedCategory === null) {
      toast.warning("Please select a category first.");
      return;
    }

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

    const fee = selectedFee as bigint | undefined;
    if (fee === undefined) {
      toast.error("Fee not loaded yet.");
      return;
    }

    claimTokens(selectedCategory, fee);
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Tokens claimed successfully!");
      queryClient.invalidateQueries();
      reset();
    }
  }, [isSuccess, queryClient, reset]);

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

  const isProcessing = isPending || isConfirming;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 lg:gap-8 px-4 py-6 lg:py-8">
      <div className="w-full max-w-5xl">
        <div className="ui-container p-6 sm:p-8 lg:p-12 rounded w-full">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left Side - Category Selection */}
            <div className="flex-1 space-y-4 lg:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1a160d] rounded-xl flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(26,22,13,0.2)]">
                <span className="material-symbols-outlined text-[#ccff00]" style={{ fontSize: 40 }}>redeem</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-header mb-2 text-text-primary">Claim HOLLOW Tokens</h1>
              <p className="text-muted-blue text-sm sm:text-base mb-6 max-w-md">
                Choose a category, pay the fee, and mint HOLLOW tokens. Tokens are transferable and unlock raffles and future drops.
              </p>

              {/* Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {[0, 1, 2, 3].map((id) => (
                  <CategoryCard
                    key={id}
                    categoryId={id}
                    selected={selectedCategory === id}
                    onSelect={() => setSelectedCategory(id)}
                    disabled={isProcessing}
                  />
                ))}
              </div>

              {/* Claim / Connect Wallet Button */}
              {isConnected ? (
                <button
                  onClick={handleClaim}
                  disabled={isProcessing || selectedCategory === null}
                  className="w-full py-4 sm:py-5 bg-[#1a160d] hover:brightness-125 text-text-primary font-bold rounded uppercase tracking-[0.2em] text-xs sm:text-sm transition-all shadow-[0_0_30px_rgba(26,22,13,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Confirm in Wallet..." : isConfirming ? "Claiming..." : "Claim Tokens"}
                </button>
              ) : (
                <ConnectButton.Custom>
                  {({ openConnectModal, openChainModal, chain, mounted }) => {
                    if (!mounted) return null;
                    if (chain?.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          className="w-full py-4 sm:py-5 bg-red-500 hover:bg-red-600 text-text-primary font-bold rounded uppercase tracking-[0.2em] text-xs sm:text-sm transition-all"
                        >
                          Wrong Network
                        </button>
                      );
                    }
                    return (
                      <button
                        onClick={openConnectModal}
                        className="w-full py-4 sm:py-5 bg-[#ccff00] hover:brightness-110 text-[#1a160d] font-bold rounded uppercase tracking-[0.2em] text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                        Connect Wallet
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              )}

              {/* Faucet link */}
              <Link
                href="/faucet"
                className="w-full flex items-center justify-center gap-2 py-3 border border-[#ccff00]/30 hover:border-[#ccff00]/60 hover:bg-[#ccff00]/5 text-[#ccff00] font-bold rounded uppercase tracking-[0.2em] text-xs sm:text-sm transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>water_drop</span>
                Need gas? Get tokens
              </Link>
            </div>

            {/* Vertical Separator */}
            <div className="hidden lg:block w-px bg-white/10"></div>

            {/* Right Side - Utility */}
            <div className="lg:w-72 flex-shrink-0 flex items-center">
              <div className="w-full space-y-4">
                <h2 className="text-base sm:text-lg font-header text-center text-text-primary">HOLLOW Utility</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#ccff00]/15 text-[#ccff00]">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>swap_horiz</span>
                    </span>
                    <p className="text-xs text-muted-blue">HOLLOW is fully tradable — transfer and exchange freely.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#ccff00]/15 text-[#ccff00]">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>confirmation_number</span>
                    </span>
                    <p className="text-xs text-muted-blue">Create and join raffles using HOLLOW tokens.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#ccff00]/15 text-[#ccff00]">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>redeem</span>
                    </span>
                    <p className="text-xs text-muted-blue">Unlock free mints and exclusive drops.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#ccff00]/15 text-[#ccff00]">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sports_esports</span>
                    </span>
                    <p className="text-xs text-muted-blue">Play games and compete on the leaderboard.</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-blue">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>schedule</span>
                  <span>
                    Claim once every{" "}
                    <span className="font-bold text-text-primary">{cooldownLabel}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
