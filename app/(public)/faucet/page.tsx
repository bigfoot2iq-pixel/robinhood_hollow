"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { isAddress } from "viem";
import { toast } from "sonner";
import { litvmTestnet } from "@/lib/contracts";

const EXPLORER_URL =
  litvmTestnet.blockExplorers?.default.url || "https://liteforge.explorer.caldera.xyz";
const RPC_HTTP = "https://liteforge.rpc.caldera.xyz/http";
const RPC_WS = "wss://liteforge.rpc.caldera.xyz/ws";
const LITVM_ICON =
  "https://g3ucpmxwuqd1lb6x.public.blob.vercel-storage.com/production/chain-images/liteforge-LitVM%20Icon%20-%20Primary%20Light-nJI1Gfl2yfyhLmtiRlBjv5esqcHJD8.png";

const DETAIL_ROWS = [
  {
    label: "Native Token",
    icon: "toll",
    value: litvmTestnet.nativeCurrency.symbol, // zkLTC
  },
  {
    label: "Data Availability",
    icon: "cloud_queue",
    value: "Arbitrum AnyTrust",
  },
  {
    label: "Settlement Layer",
    icon: "layers",
    value: "Sepolia",
  },
  {
    label: "Rollup Stack",
    icon: "view_in_ar",
    value: "Arbitrum Nitro",
  },
] as const;

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-blue">{label}</span>
      <button
        onClick={copy}
        className="group flex items-center gap-2 text-left text-sm font-display text-white transition-colors hover:text-[#33C5D9]"
        title="Click to copy"
      >
        <span className="truncate">{value}</span>
        <span className="material-symbols-outlined text-muted-blue group-hover:text-[#33C5D9]" style={{ fontSize: 16 }}>
          {copied ? "check" : "content_copy"}
        </span>
      </button>
    </div>
  );
}

export default function FaucetPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const [address, setAddress] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  const target = address.trim();
  const isValid = isAddress(target);

  const handleRequest = async () => {
    if (!isValid) {
      toast.warning("Enter a valid wallet address.");
      return;
    }
    setIsRequesting(true);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: target }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Faucet request failed.");
        return;
      }

      toast.success(`Sent ${data.amount} ${litvmTestnet.nativeCurrency.symbol}!`, {
        description: "Tap to view the transaction.",
        action: data.txHash
          ? {
              label: "View",
              onClick: () => window.open(`${EXPLORER_URL}/tx/${data.txHash}`, "_blank"),
            }
          : undefined,
      });
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page heading */}
      <div className="space-y-2">
        <h1 className="text-3xl font-header text-white sm:text-4xl lg:text-5xl">Faucet</h1>
        <p className="max-w-2xl text-sm text-muted-blue sm:text-base">
          Request the chain&apos;s native {litvmTestnet.nativeCurrency.symbol} token to start testing on the
          LiteForge testnet.
        </p>
      </div>

      {/* Top row: ASCII liquid accent (left) + Faucet card (right) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Animated ASCII liquid accent with centered LitVM logo */}
        <div className="relative hidden w-[240px] flex-shrink-0 self-stretch overflow-hidden rounded-3xl bg-black lg:block">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover mix-blend-screen"
          >
            <source src="https://misc-bucket.caldera.xyz/ascii-liquid.webm" type="video/webm" />
          </video>
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <img
              src={LITVM_ICON}
              alt=""
              width={106}
              height={106}
              className="aspect-square object-contain"
            />
          </div>
        </div>

        {/* Faucet request card */}
        <div className="ui-container flex flex-1 flex-col gap-6 rounded-2xl p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#33C5D9]/15">
              <span className="material-symbols-outlined text-[#33C5D9]" style={{ fontSize: 24 }}>
                water_drop
              </span>
            </div>
            <h2 className="text-2xl font-header text-white">Faucet</h2>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
            {/* Token chip — single native token, non-interactive */}
            <div className="flex h-16 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 sm:w-[150px]">
              <img src={LITVM_ICON} alt="" className="h-6 w-6 object-contain" />
              <span className="flex-1 truncate text-base font-bold text-white">
                {litvmTestnet.nativeCurrency.symbol}
              </span>
            </div>

            {/* Recipient address */}
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRequest()}
              placeholder="Recipient's wallet address"
              spellCheck={false}
              className="h-16 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 font-display text-base text-white placeholder:text-muted-blue/70 outline-none transition-colors focus:border-[#33C5D9]/60 focus:ring-1 focus:ring-[#33C5D9]/40"
            />

            {/* Request (connected) / Connect Wallet (disconnected) */}
            {isConnected ? (
              <button
                onClick={handleRequest}
                disabled={!isValid || isRequesting}
                className="flex h-16 items-center justify-center gap-2 rounded-xl bg-[#33C5D9] px-6 text-sm font-bold uppercase tracking-[0.15em] text-dark-navy transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:w-32"
              >
                {isRequesting ? (
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>
                    progress_activity
                  </span>
                ) : (
                  "Request"
                )}
              </button>
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal, openChainModal, chain, mounted }) => {
                  if (!mounted) return null;
                  if (chain?.unsupported) {
                    return (
                      <button
                        onClick={openChainModal}
                        className="flex h-16 items-center justify-center rounded-xl bg-red-500 px-6 text-sm font-bold uppercase tracking-[0.15em] text-white transition-all hover:bg-red-600 sm:w-44"
                      >
                        Wrong Network
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={openConnectModal}
                      className="flex h-16 items-center justify-center rounded-xl bg-[#33C5D9] px-6 text-sm font-bold uppercase tracking-[0.15em] text-dark-navy transition-all hover:brightness-110 sm:w-44"
                    >
                      Connect Wallet
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            )}
          </div>

          {connectedAddress && (
            <button
              onClick={() => setAddress(connectedAddress)}
              className="-mt-2 flex w-fit items-center gap-1.5 text-xs font-semibold text-[#33C5D9] transition-opacity hover:opacity-80"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                account_balance_wallet
              </span>
              Use connected wallet
            </button>
          )}

          <p className="text-xs text-muted-blue">
            Drips 0.001 {litvmTestnet.nativeCurrency.symbol} for gas — enough for hundreds of
            transactions. One request per address every 24 hours.
          </p>

          {/* Fallback: official faucet */}
          <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
            <p className="text-xs text-muted-blue">
              Can&apos;t claim here? Use the official LiteForge faucet instead.
            </p>
            <a
              href="https://liteforge.hub.caldera.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-fit items-center gap-2 rounded-xl border border-[#33C5D9]/40 bg-[#33C5D9]/10 px-5 text-sm font-bold uppercase tracking-[0.15em] text-[#33C5D9] transition-all hover:bg-[#33C5D9]/20"
            >
              Official Faucet
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                open_in_new
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Details card */}
      <div className="ui-container overflow-hidden rounded-2xl">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5 sm:px-8 lg:px-10">
          <h2 className="text-2xl font-header text-white">Details</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-blue">Chain ID</span>
            <span className="rounded-md bg-[#33C5D9]/15 px-2.5 py-1 font-display text-sm font-bold text-[#33C5D9]">
              {litvmTestnet.id}
            </span>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-1 gap-px bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
          {DETAIL_ROWS.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-2 bg-[#0E2230]/40 px-6 py-5 sm:px-8 lg:px-6"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-blue">
                {row.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#33C5D9]" style={{ fontSize: 20 }}>
                  {row.icon}
                </span>
                <span className="font-display text-base font-bold text-white">{row.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Connection details */}
        <div className="grid grid-cols-1 gap-6 border-t border-white/5 px-6 py-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-3 lg:px-10">
          <CopyRow label="RPC (HTTP)" value={RPC_HTTP} />
          <CopyRow label="RPC (WS)" value={RPC_WS} />
          <CopyRow label="Block Explorer" value={EXPLORER_URL} />
        </div>
      </div>
    </div>
  );
}
