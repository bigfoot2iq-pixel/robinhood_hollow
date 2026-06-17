"use client";

import { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { useAccount } from "wagmi";
import { contracts, StakingRewardsABI, HollowTokenABI } from "@/lib/contracts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function useTier(token: "avKATTiers" | "vKATTiers", index: number) {
  return useReadContract({
    address: contracts.stakingRewards.address,
    abi: StakingRewardsABI,
    functionName: token,
    args: [BigInt(index)],
  });
}

function useClaimWindow() {
  return useReadContract({
    address: contracts.stakingRewards.address,
    abi: StakingRewardsABI,
    functionName: "claimWindowHours",
  });
}

function useTrustedSigner() {
  return useReadContract({
    address: contracts.stakingRewards.address,
    abi: StakingRewardsABI,
    functionName: "trustedSigner",
  });
}

function useTreasuryBalance() {
  return useReadContract({
    address: contracts.stakingRewards.address,
    abi: StakingRewardsABI,
    functionName: "treasuryBalance",
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TierInputs {
  threshold: string;
  hollowAmount: string;
}

const DEFAULT_TIERS: TierInputs[] = [
  { threshold: "", hollowAmount: "" },
  { threshold: "", hollowAmount: "" },
  { threshold: "", hollowAmount: "" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function TiersConfig({ token }: { token: "avKAT" | "vKAT" }) {
  const abiKey = token === "avKAT" ? "avKATTiers" : "vKATTiers";
  const setFn = token === "avKAT" ? "setAVKATTiers" : "setVKATTiers";

  const { data: tier0, refetch: refetch0 } = useTier(abiKey, 0);
  const { data: tier1, refetch: refetch1 } = useTier(abiKey, 1);
  const { data: tier2, refetch: refetch2 } = useTier(abiKey, 2);

  const [inputs, setInputs] = useState<TierInputs[]>(DEFAULT_TIERS);
  const [prefilled, setPrefilled] = useState(false);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Pre-fill inputs from on-chain values
  useEffect(() => {
    if (prefilled || !tier0 || !tier1 || !tier2) return;
    const tiers = [tier0, tier1, tier2] as unknown as [bigint, bigint][];
    const [th0, ha0] = tiers[0];
    const [th1, ha1] = tiers[1];
    const [th2, ha2] = tiers[2];
    if (th0 === 0n && th1 === 0n) return; // not set yet
    setInputs([
      { threshold: formatEther(th0), hollowAmount: formatEther(ha0) },
      { threshold: formatEther(th1), hollowAmount: formatEther(ha1) },
      { threshold: formatEther(th2), hollowAmount: formatEther(ha2) },
    ]);
    setPrefilled(true);
  }, [tier0, tier1, tier2, prefilled]);

  useEffect(() => {
    if (isSuccess) { setPrefilled(false); refetch0(); refetch1(); refetch2(); }
  }, [isSuccess]);

  const updateInput = (index: number, field: keyof TierInputs, value: string) => {
    setInputs((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const allFilled = inputs.every((t) => t.threshold !== "" && t.hollowAmount !== "");

  const handleUpdate = () => {
    reset();
    try {
      const thresholds = inputs.map((t) => parseEther(t.threshold)) as [bigint, bigint, bigint];
      const amounts = inputs.map((t) => parseEther(t.hollowAmount)) as [bigint, bigint, bigint];
      if (!(thresholds[0] > thresholds[1] && thresholds[1] > thresholds[2])) {
        alert("Thresholds must be strictly descending:\nTier 1 > Tier 2 > Tier 3");
        return;
      }
      writeContract({
        address: contracts.stakingRewards.address,
        abi: StakingRewardsABI,
        functionName: setFn,
        args: [thresholds, amounts],
      });
    } catch {
      alert("Invalid tier values — check all fields are valid numbers");
    }
  };

  const tierLabels = ["Tier 1 (Highest)", "Tier 2 (Mid)", "Tier 3 (Base)"];

  return (
    <div className="ui-container rounded overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-header text-white">{token} Reward Tiers</h3>
          <p className="text-muted-blue text-xs mt-0.5">Thresholds must be strictly descending — Tier 1 is highest</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-blue">
          <span className="material-symbols-outlined text-sm">info</span>
          Values in token units (not wei)
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-[140px_1fr_1fr] gap-4 px-1">
          <span />
          <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest">Min Staked ({token})</p>
          <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest">Hollow Reward</p>
        </div>

        {inputs.map((tier, i) => (
          <div key={i} className="grid grid-cols-[140px_1fr_1fr] gap-4 items-center">
            <p className="text-white text-sm font-bold">{tierLabels[i]}</p>
            <input
              type="text"
              value={tier.threshold}
              onChange={(e) => updateInput(i, "threshold", e.target.value)}
              placeholder={i === 0 ? "e.g. 1000 (highest)" : i === 1 ? "e.g. 100" : "e.g. 10 (lowest)"}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#F4FF1A]/50 placeholder-white/20"
            />
            <input
              type="text"
              value={tier.hollowAmount}
              onChange={(e) => updateInput(i, "hollowAmount", e.target.value)}
              placeholder="e.g. 500"
              className="px-4 py-3 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#F4FF1A]/50 placeholder-white/20"
            />
          </div>
        ))}

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleUpdate}
            disabled={isPending || confirming || !allFilled}
            className="px-6 py-3 bg-[#F4FF1A] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Sign..." : confirming ? "Confirming..." : `Save ${token} Tiers`}
          </button>
          {isSuccess && <p className="text-green-400 text-xs">Tiers updated successfully!</p>}
          {error && <p className="text-red-400 text-xs">{error.message.split("\n")[0]}</p>}
        </div>
      </div>
    </div>
  );
}

function GlobalConfig() {
  const { data: currentWindow, refetch: refetchWindow } = useClaimWindow();
  const { data: currentSigner, refetch: refetchSigner } = useTrustedSigner();

  const [windowInput, setWindowInput] = useState("");
  const [signerInput, setSignerInput] = useState("");

  useEffect(() => {
    if (currentWindow !== undefined && !windowInput) {
      setWindowInput(Number(currentWindow).toString());
    }
  }, [currentWindow]);

  useEffect(() => {
    if (currentSigner && !signerInput) {
      setSignerInput(currentSigner as string);
    }
  }, [currentSigner]);

  const {
    writeContract: writeWindow,
    data: windowHash,
    isPending: windowPending,
    error: windowError,
    reset: resetWindow,
  } = useWriteContract();
  const { isLoading: windowConfirming, isSuccess: windowSuccess } = useWaitForTransactionReceipt({ hash: windowHash });

  const {
    writeContract: writeSigner,
    data: signerHash,
    isPending: signerPending,
    error: signerError,
    reset: resetSigner,
  } = useWriteContract();
  const { isLoading: signerConfirming, isSuccess: signerSuccess } = useWaitForTransactionReceipt({ hash: signerHash });

  useEffect(() => { if (windowSuccess) refetchWindow(); }, [windowSuccess]);
  useEffect(() => { if (signerSuccess) refetchSigner(); }, [signerSuccess]);

  const handleSetWindow = () => {
    resetWindow();
    const hours = parseInt(windowInput, 10);
    if (isNaN(hours) || hours <= 0) { alert("Claim window must be > 0 hours"); return; }
    writeWindow({
      address: contracts.stakingRewards.address,
      abi: StakingRewardsABI,
      functionName: "setClaimWindow",
      args: [BigInt(hours)],
    });
  };

  const handleSetSigner = () => {
    resetSigner();
    if (!signerInput.startsWith("0x") || signerInput.length !== 42) {
      alert("Invalid address");
      return;
    }
    writeSigner({
      address: contracts.stakingRewards.address,
      abi: StakingRewardsABI,
      functionName: "setTrustedSigner",
      args: [signerInput as `0x${string}`],
    });
  };

  return (
    <div className="ui-container rounded overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h3 className="text-xl font-header text-white">Global Config</h3>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Claim Window */}
        <div className="space-y-3">
          <div>
            <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-1">Claim Window (hours)</p>
            <p className="text-sm text-white/60">
              Current: <span className="text-[#F4FF1A] font-bold">{currentWindow !== undefined ? `${Number(currentWindow)}h` : "..."}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={windowInput}
              onChange={(e) => setWindowInput(e.target.value)}
              placeholder="24"
              min="1"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#F4FF1A]/50 placeholder-white/20"
            />
            <button
              onClick={handleSetWindow}
              disabled={windowPending || windowConfirming}
              className="px-4 py-3 bg-[#F4FF1A] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {windowPending ? "Sign..." : windowConfirming ? "Confirming..." : "Update"}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[{ label: "1h", value: "1" }, { label: "6h", value: "6" }, { label: "12h", value: "12" }, { label: "24h", value: "24" }, { label: "48h", value: "48" }, { label: "7d", value: "168" }].map((p) => (
              <button
                key={p.value}
                onClick={() => setWindowInput(p.value)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border transition-all ${
                  windowInput === p.value
                    ? "bg-[#F4FF1A]/10 text-[#F4FF1A] border-[#F4FF1A]/30"
                    : "bg-white/5 text-muted-blue border-white/10 hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {windowSuccess && <p className="text-green-400 text-xs">Claim window updated!</p>}
          {windowError && <p className="text-red-400 text-xs">{windowError.message.split("\n")[0]}</p>}
        </div>

        {/* Trusted Signer */}
        <div className="space-y-3">
          <div>
            <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-1">Trusted Signer</p>
            <p className="text-sm text-white/60 font-mono break-all">
              Current: <span className="text-[#F4FF1A] font-bold">{currentSigner ? `${(currentSigner as string).slice(0, 6)}...${(currentSigner as string).slice(-4)}` : "..."}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={signerInput}
              onChange={(e) => setSignerInput(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded text-white text-sm font-mono focus:outline-none focus:border-[#F4FF1A]/50 placeholder-white/20"
            />
            <button
              onClick={handleSetSigner}
              disabled={signerPending || signerConfirming}
              className="px-4 py-3 bg-[#F4FF1A] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signerPending ? "Sign..." : signerConfirming ? "Confirming..." : "Update"}
            </button>
          </div>
          {signerSuccess && <p className="text-green-400 text-xs">Trusted signer updated!</p>}
          {signerError && <p className="text-red-400 text-xs">{signerError.message.split("\n")[0]}</p>}
        </div>
      </div>
    </div>
  );
}

function FundTreasury() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"mint" | "transfer">("mint");

  // Admin's own Hollow balance (for transfer mode)
  const { data: adminBalance } = useReadContract({
    address: contracts.hollowToken.address,
    abi: HollowTokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: balance, refetch } = useTreasuryBalance();

  // Mint
  const {
    writeContract: writeMint,
    data: mintHash,
    isPending: mintPending,
    error: mintError,
    reset: resetMint,
  } = useWriteContract();
  const { isLoading: mintConfirming, isSuccess: mintSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  // Transfer
  const {
    writeContract: writeTransfer,
    data: transferHash,
    isPending: transferPending,
    error: transferError,
    reset: resetTransfer,
  } = useWriteContract();
  const { isLoading: transferConfirming, isSuccess: transferSuccess } = useWaitForTransactionReceipt({ hash: transferHash });

  useEffect(() => {
    if (mintSuccess || transferSuccess) {
      refetch();
      setAmount("");
    }
  }, [mintSuccess, transferSuccess]);

  const handleFund = () => {
    resetMint();
    resetTransfer();
    try {
      const parsed = parseEther(amount);
      if (parsed <= 0n) { alert("Amount must be > 0"); return; }
      if (mode === "mint") {
        writeMint({
          address: contracts.hollowToken.address,
          abi: HollowTokenABI,
          functionName: "mint",
          args: [contracts.stakingRewards.address, parsed],
        });
      } else {
        writeTransfer({
          address: contracts.hollowToken.address,
          abi: HollowTokenABI,
          functionName: "transfer",
          args: [contracts.stakingRewards.address, parsed],
        });
      }
    } catch {
      alert("Invalid amount");
    }
  };

  const handleMax = () => {
    if (mode === "transfer" && adminBalance) {
      setAmount(formatEther(adminBalance as bigint));
    }
  };

  const isPending = mintPending || transferPending;
  const isConfirming = mintConfirming || transferConfirming;
  const isSuccess = mintSuccess || transferSuccess;
  const error = mintError || transferError;

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const { writeContract: writeWithdraw, data: withdrawHash, isPending: withdrawPending, error: withdrawError, reset: resetWithdraw } = useWriteContract();
  const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

  useEffect(() => { if (withdrawSuccess) { refetch(); setWithdrawAmount(""); } }, [withdrawSuccess]);

  const handleWithdraw = () => {
    resetWithdraw();
    try {
      const parsed = parseEther(withdrawAmount);
      if (parsed <= 0n) { alert("Amount must be > 0"); return; }
      writeWithdraw({
        address: contracts.stakingRewards.address,
        abi: StakingRewardsABI,
        functionName: "withdrawTreasury",
        args: [parsed],
      });
    } catch { alert("Invalid amount"); }
  };

  return (
    <div className="ui-container rounded overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h3 className="text-xl font-header text-white">Treasury</h3>
        <p className="text-muted-blue text-xs mt-0.5">Fund or withdraw Hollow tokens from the staking rewards contract</p>
      </div>
      <div className="p-6 space-y-5">

        {/* Balance + Withdraw row */}
        <div className="flex flex-col md:flex-row gap-6 items-start pb-5 border-b border-white/10">
          <div className="flex-1 space-y-1">
            <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest">Contract Balance</p>
            <p className="text-4xl font-display font-bold text-white">
              {balance !== undefined ? parseFloat(formatEther(balance as bigint)).toLocaleString() : "..."}
            </p>
            <p className="text-muted-blue text-sm">HOLLOW held by contract</p>
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest">Withdraw to Owner</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#F4FF1A]/50 placeholder-white/20 pr-16"
                />
                <button
                  onClick={() => balance && setWithdrawAmount(formatEther(balance as bigint))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#F4FF1A] hover:text-white transition-colors uppercase tracking-widest"
                >
                  Max
                </button>
              </div>
              <button
                onClick={handleWithdraw}
                disabled={withdrawPending || withdrawConfirming}
                className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded uppercase tracking-widest text-xs transition-all border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {withdrawPending ? "Sign..." : withdrawConfirming ? "Confirming..." : "Withdraw"}
              </button>
            </div>
            {withdrawSuccess && <p className="text-green-400 text-xs">Withdrawal successful!</p>}
            {withdrawError && <p className="text-red-400 text-xs">{withdrawError.message.split("\n")[0]}</p>}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode("mint"); setAmount(""); }}
            className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest border transition-all ${
              mode === "mint"
                ? "bg-[#F4FF1A]/10 text-[#F4FF1A] border-[#F4FF1A]/30"
                : "bg-white/5 text-muted-blue border-white/10 hover:bg-white/10"
            }`}
          >
            Mint to Contract
          </button>
          <button
            onClick={() => { setMode("transfer"); setAmount(""); }}
            className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest border transition-all ${
              mode === "transfer"
                ? "bg-[#F4FF1A]/10 text-[#F4FF1A] border-[#F4FF1A]/30"
                : "bg-white/5 text-muted-blue border-white/10 hover:bg-white/10"
            }`}
          >
            Transfer from Wallet
          </button>
        </div>

        {/* Mode description */}
        <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-muted-blue">
          {mode === "mint" ? (
            <>Calls <span className="text-white font-mono">HollowToken.mint(stakingRewardsAddress, amount)</span> — mints new tokens directly into the contract. Requires owner wallet.</>
          ) : (
            <>Calls <span className="text-white font-mono">HollowToken.transfer(stakingRewardsAddress, amount)</span> — sends tokens from your wallet. Your balance: <span className="text-white font-bold">{adminBalance !== undefined ? parseFloat(formatEther(adminBalance as bigint)).toLocaleString() : "..."} HOLLOW</span></>
          )}
        </div>

        {/* Amount input */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount of HOLLOW"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#F4FF1A]/50 placeholder-white/20 pr-16"
            />
            {mode === "transfer" && (
              <button
                onClick={handleMax}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#F4FF1A] hover:text-white transition-colors uppercase tracking-widest"
              >
                Max
              </button>
            )}
          </div>
          <button
            onClick={handleFund}
            disabled={isPending || isConfirming || !amount}
            className="px-6 py-3 bg-[#F4FF1A] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Sign..." : isConfirming ? "Confirming..." : mode === "mint" ? "Mint to Contract" : "Transfer to Contract"}
          </button>
        </div>

        {/* Result */}
        {isSuccess && (
          <p className="text-green-400 text-xs">
            Treasury funded! New balance: {balance !== undefined ? parseFloat(formatEther(balance as bigint)).toLocaleString() : "..."} HOLLOW
          </p>
        )}
        {error && <p className="text-red-400 text-xs">{error.message.split("\n")[0]}</p>}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StakingAdminPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-5xl font-header text-white">Staking Rewards Config</h2>
      <TiersConfig token="avKAT" />
      <TiersConfig token="vKAT" />
      <GlobalConfig />
      <FundTreasury />
    </div>
  );
}
