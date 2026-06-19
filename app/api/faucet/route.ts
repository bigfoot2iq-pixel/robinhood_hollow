import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, isAddress, parseEther, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { litvmTestnet } from "@/lib/contracts";
import { createServiceClient } from "@/lib/supabase/server";

// Native zkLTC drip faucet for the LiteForge testnet.
//
// Funded by FAUCET_PRIVATE_KEY (falls back to the shared admin/watchdog wallet on
// this testnet). The per-address 24h cooldown is enforced in Supabase via the
// atomic litvm_faucet_try_claim() guard, so it survives redeploys and is shared
// across every serverless instance.

function getRpcUrl(): string {
  return (
    process.env.RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://liteforge.rpc.caldera.xyz/http"
  );
}

function formatWait(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.ceil(seconds / 3600);
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  if (seconds >= 60) {
    const m = Math.ceil(seconds / 60);
    return m === 1 ? "1 minute" : `${m} minutes`;
  }
  return `${seconds} seconds`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawAddress = (body?.address ?? "").toString().trim();

    if (!rawAddress || !isAddress(rawAddress)) {
      return NextResponse.json({ error: "Enter a valid wallet address." }, { status: 400 });
    }
    const address = getAddress(rawAddress);
    const walletKey = address.toLowerCase();

    // Prefer a dedicated faucet key; fall back to the shared admin/watchdog wallet
    // (deployer == watchdog == admin == one EOA on this testnet) so the faucet works
    // out of the box without copying keys.
    const privateKey = process.env.FAUCET_PRIVATE_KEY || process.env.WATCHDOG_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: "Faucet is not configured yet. Please try again later." },
        { status: 503 }
      );
    }

    const cooldownSeconds = Number(process.env.FAUCET_COOLDOWN_SECONDS || 86400);
    const dripAmount = process.env.FAUCET_DRIP_AMOUNT || "0.001";
    const value = parseEther(dripAmount);

    const rpcUrl = getRpcUrl();
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const publicClient = createPublicClient({ chain: litvmTestnet, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ chain: litvmTestnet, transport: http(rpcUrl), account });

    // Make sure the faucet wallet can cover the drip before reserving a cooldown slot.
    const balance = await publicClient.getBalance({ address: account.address });
    if (balance < value) {
      return NextResponse.json(
        { error: "Faucet is temporarily out of funds. Please try again later." },
        { status: 503 }
      );
    }

    const supabase = await createServiceClient();

    // Atomic reserve: succeeds only if this wallet's cooldown has elapsed. Race-safe,
    // so concurrent requests for the same wallet can't both drip.
    const { data, error } = await supabase.rpc("litvm_faucet_try_claim", {
      p_wallet: walletKey,
      p_cooldown_seconds: cooldownSeconds,
    });
    if (error) {
      console.error("faucet try_claim rpc error:", error);
      return NextResponse.json(
        { error: "Faucet is unavailable right now. Please try again later." },
        { status: 500 }
      );
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.allowed) {
      const retry = Number(result?.retry_after_seconds ?? cooldownSeconds);
      return NextResponse.json(
        { error: `Cooldown active — try again in ${formatWait(retry)}.` },
        { status: 429 }
      );
    }

    try {
      const txHash = await walletClient.sendTransaction({ to: address, value });
      // Record the tx for auditing (the cooldown timestamp was set by the guard).
      await supabase
        .from("litvm_faucet_claims")
        .update({ tx_hash: txHash, amount: dripAmount })
        .eq("wallet_address", walletKey);
      return NextResponse.json({ success: true, txHash, amount: dripAmount });
    } catch (err) {
      // Release the reservation so a failed send doesn't lock the user out 24h.
      await supabase.rpc("litvm_faucet_release", { p_wallet: walletKey });
      throw err;
    }
  } catch (error) {
    console.error("Error in POST /api/faucet:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 }
    );
  }
}
