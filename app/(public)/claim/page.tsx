"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LitvmHero } from "@/components/ui/LitvmHero";
import { litvmTestnet } from "@/lib/contracts";
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

const EXPLORER_URL =
  litvmTestnet.blockExplorers?.default.url || "https://liteforge.explorer.caldera.xyz";

type TierToken = { label: string; address: string; standard: "ERC-20" | "ERC-721" };

// Qualifying tokens per tier — mirrors the on-chain lists seeded at deploy
// (scripts/deploy-testnet.ts). Holding any one token in a tier earns that tier.
const TIER_TOKENS: Record<1 | 2, TierToken[]> = {
  1: [
    { label: "lsZKLTC", address: "0x308CBcd9a2b3C9a6A2A71E0A64C14E3A5cFA5951", standard: "ERC-20" },
    { label: "lsTUSD", address: "0xBc963F0Dc2A5FB9F38AA5FAB98208Cf8619EbEBa", standard: "ERC-20" },
    { label: "PEPE", address: "0x6858790e164a8761a711BAD1178220C5AebcF7eC", standard: "ERC-20" },
    { label: "Lester", address: "0xFC73cdB75F37B0da829c4e54511f410D525B76b2", standard: "ERC-20" },
    { label: "GMCards", address: "0xA0692f67ffcEd633f9c5CfAefd83FC4F21973D01", standard: "ERC-721" },
  ],
  2: [
    { label: "USDC", address: "0xd5118dEe968d1533B2A57aB66C266010AD8957fa", standard: "ERC-20" },
    { label: "INAME", address: "0x76a816EFa69e3183972ff7a231F5C8d7b065d9De", standard: "ERC-721" },
    { label: "ZNS LIT", address: "0x1c6C28403400c44D8D351dEaBcF7B1365F96EbF1", standard: "ERC-721" },
    { label: "USDC Test", address: "0xe1b51EfB42cC9748C8ecf1129705F5d27901261a", standard: "ERC-20" },
    { label: "Silver", address: "0x13FeC2AD48fcADb14fc06603675ECc46455AE3f7", standard: "ERC-20" },
  ],
};

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function TokenListModal({
  tier,
  amount,
  onClose,
}: {
  tier: 1 | 2;
  amount: bigint | undefined;
  onClose: () => void;
}) {
  const tokens = TIER_TOKENS[tier];
  const title = tier === 1 ? "Top 5 tokens" : "Next 5 tokens";
  const sub =
    tier === 1
      ? "Hold any one of these to earn Tier 1"
      : "Hold any one of these to earn Tier 2";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="ui-container w-full max-w-md overflow-hidden rounded-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-lg font-header text-white">{title}</h3>
            <p className="mt-0.5 text-xs text-muted-blue">{sub}</p>
          </div>
          <div className="flex items-center gap-2">
            {amount !== undefined && (
              <span className="whitespace-nowrap rounded-md bg-[#33C5D9]/15 px-2.5 py-1 font-display text-sm font-bold text-[#33C5D9]">
                {formatTokenBalance(amount)} HOLLOW
              </span>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-blue transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* Token list */}
        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3 sm:p-4">
          {tokens.map((t) => (
            <a
              key={t.address}
              href={`${EXPLORER_URL}/address/${t.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition-all hover:border-[#33C5D9]/40 hover:bg-[#33C5D9]/5"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#33C5D9]/15 text-sm font-bold text-[#33C5D9]">
                {t.label.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{t.label}</p>
                <p className="truncate font-display text-[11px] text-muted-blue">
                  {shortAddr(t.address)}
                </p>
              </div>
              <span className="rounded border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-blue">
                {t.standard}
              </span>
              <span
                className="material-symbols-outlined text-muted-blue transition-colors group-hover:text-[#33C5D9]"
                style={{ fontSize: 18 }}
              >
                open_in_new
              </span>
            </a>
          ))}
        </div>

        {/* Footer hint */}
        <p className="border-t border-white/10 px-5 py-3 text-center text-[10px] text-muted-blue sm:px-6">
          Tap a token to view it on the Liteforge Explorer.
        </p>
      </div>
    </div>
  );
}

function TierRow({
  icon,
  label,
  sub,
  amount,
  active,
  onClick,
  count,
}: {
  icon: string;
  label: string;
  sub: string;
  amount: bigint | undefined;
  active: boolean;
  onClick?: () => void;
  count?: number;
}) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick!();
              }
            }
          : undefined
      }
      className={`flex items-center justify-between p-3 rounded border transition-all ${
        active
          ? "bg-[#33C5D9]/10 border-[#33C5D9]/30 shadow-[0_0_20px_rgba(51,197,217,0.1)]"
          : "bg-white/5 border-white/10"
      } ${clickable ? "cursor-pointer hover:border-[#33C5D9]/40 hover:bg-[#33C5D9]/5" : ""}`}
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
          <p className="text-[10px] text-muted-blue">
            {sub}
            {clickable && (
              <span className="font-semibold text-[#33C5D9]"> · View {count} tokens</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-display font-bold text-white whitespace-nowrap">
          {amount !== undefined ? formatTokenBalance(amount) : "..."}
          <span className="text-[10px] text-muted-blue"> HOLLOW</span>
        </p>
        {clickable && (
          <span className="material-symbols-outlined text-muted-blue" style={{ fontSize: 18 }}>
            chevron_right
          </span>
        )}
      </div>
    </div>
  );
}

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [openTier, setOpenTier] = useState<1 | 2 | null>(null);

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
              <p className="text-muted-blue text-sm sm:text-base mb-6 sm:mb-8 text-center px-4 max-w-md">
                Claim free HOLLOW — hold more top tokens, earn more. HOLLOW unlocks raffles and future drops.
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
                    onClick={() => setOpenTier(1)}
                    count={TIER_TOKENS[1].length}
                  />
                  <TierRow
                    icon="military_tech"
                    label="Next 5 tokens"
                    sub="Hold any token ranked 6–10"
                    amount={tier2Amount as bigint | undefined}
                    active={isConnected && tier === 2}
                    onClick={() => setOpenTier(2)}
                    count={TIER_TOKENS[2].length}
                  />
                  <TierRow
                    icon="redeem"
                    label="Everyone else"
                    sub="Hold none of the above"
                    amount={tier3Amount as bigint | undefined}
                    active={isConnected && tier === 3}
                  />
                </div>
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-blue">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>schedule</span>
                  <span>
                    Cooldown — claim once every{" "}
                    <span className="font-bold text-white">{cooldownLabel}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {openTier && (
        <TokenListModal
          tier={openTier}
          amount={(openTier === 1 ? tier1Amount : tier2Amount) as bigint | undefined}
          onClose={() => setOpenTier(null)}
        />
      )}
    </div>
  );
}
