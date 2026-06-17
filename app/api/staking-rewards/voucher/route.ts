import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, keccak256, encodePacked, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "crypto";
import { defineChain } from "viem";

const katana = defineChain({
  id: 747474,
  name: "Katana Network",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.katana.network"] } },
});

const STAKING_REWARDS_ADDRESS = process.env.NEXT_PUBLIC_STAKING_REWARDS_ADDRESS as `0x${string}`;
const AVKAT_ADDRESS = "0x7231dbaCdFc968E07656D12389AB20De82FbfCeB" as `0x${string}`;
const VKAT_ADDRESS = "0x4d6fc15ca6258b168225d283262743c623c13ead" as `0x${string}`;
const INDEXER_URL = "https://app.katana.network/api/indexer-proxy";

const erc20BalanceABI = [{
  inputs: [{ name: "account", type: "address" }],
  name: "balanceOf", outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view", type: "function",
}] as const;

const tiersABI = [{
  inputs: [{ name: "", type: "uint256" }],
  name: "avKATTiers",
  outputs: [{ name: "threshold", type: "uint256" }, { name: "hollowAmount", type: "uint256" }],
  stateMutability: "view", type: "function",
}, {
  inputs: [{ name: "", type: "uint256" }],
  name: "vKATTiers",
  outputs: [{ name: "threshold", type: "uint256" }, { name: "hollowAmount", type: "uint256" }],
  stateMutability: "view", type: "function",
}, {
  inputs: [{ name: "user", type: "address" }],
  name: "canClaimAVKAT",
  outputs: [{ name: "eligible", type: "bool" }, { name: "secondsRemaining", type: "uint256" }],
  stateMutability: "view", type: "function",
}, {
  inputs: [{ name: "user", type: "address" }],
  name: "canClaimVKAT",
  outputs: [{ name: "eligible", type: "bool" }, { name: "secondsRemaining", type: "uint256" }],
  stateMutability: "view", type: "function",
}] as const;

async function fetchVKATBalance(address: string): Promise<bigint> {
  const res = await fetch(INDEXER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
      "Origin": "https://app.katana.network",
      "Referer": "https://app.katana.network/stake",
    },
    body: JSON.stringify({
      query: `query UserLocks($user: String!, $contractAddress: String!, $chainId: String!) {
        Token(where: {
          _or: [{ currentOwner: { _ilike: $user } }, { beneficialOwner: { _ilike: $user } }],
          active: { _eq: true }, withdrawnAt: { _is_null: true },
          contract: { address: { _ilike: $contractAddress }, chainId: { _eq: $chainId } }
        }) { currentValue }
      }`,
      variables: { chainId: "747474", contractAddress: VKAT_ADDRESS, user: address },
    }),
  });
  const json = await res.json();
  const tokens: { currentValue: string }[] = json.data?.Token ?? [];
  return tokens.reduce((sum, t) => sum + BigInt(t.currentValue), 0n);
}

function getTierAmount(balance: bigint, tiers: [bigint, bigint][]): bigint {
  for (const [threshold, hollowAmount] of tiers) {
    if (threshold > 0n && balance >= threshold) return hollowAmount;
  }
  return 0n;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") as `0x${string}` | null;
    const token = searchParams.get("token"); // "avkat" | "vkat"

    if (!address || !token || !["avkat", "vkat"].includes(token)) {
      return NextResponse.json({ error: "Missing or invalid params" }, { status: 400 });
    }

    const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) return NextResponse.json({ error: "Signer not configured" }, { status: 500 });

    const client = createPublicClient({ chain: katana, transport: http() });

    // Read all 3 tiers and eligibility check in parallel
    const tiersKey = token === "avkat" ? "avKATTiers" : "vKATTiers";
    const canClaimFn = token === "avkat" ? "canClaimAVKAT" : "canClaimVKAT";

    const [tier0, tier1, tier2, canClaimResult] = await Promise.all([
      client.readContract({ address: STAKING_REWARDS_ADDRESS, abi: tiersABI, functionName: tiersKey, args: [0n] }),
      client.readContract({ address: STAKING_REWARDS_ADDRESS, abi: tiersABI, functionName: tiersKey, args: [1n] }),
      client.readContract({ address: STAKING_REWARDS_ADDRESS, abi: tiersABI, functionName: tiersKey, args: [2n] }),
      client.readContract({ address: STAKING_REWARDS_ADDRESS, abi: tiersABI, functionName: canClaimFn, args: [address] }),
    ]);

    const [eligible, secondsRemaining] = canClaimResult as [boolean, bigint];
    if (!eligible) {
      return NextResponse.json({ error: "Claim window not elapsed", secondsRemaining: Number(secondsRemaining) }, { status: 403 });
    }

    // Get user balance
    let balance: bigint;
    if (token === "avkat") {
      balance = await client.readContract({ address: AVKAT_ADDRESS, abi: erc20BalanceABI, functionName: "balanceOf", args: [address] });
    } else {
      balance = await fetchVKATBalance(address);
    }

    // Determine tier amount
    const tiers = [[tier0[0], tier0[1]], [tier1[0], tier1[1]], [tier2[0], tier2[1]]] as [bigint, bigint][];
    const amount = getTierAmount(balance, tiers);

    if (amount === 0n) {
      return NextResponse.json({ error: "Not eligible — balance below minimum tier threshold" }, { status: 403 });
    }

    // Build and sign voucher
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour
    const nonce = `0x${randomBytes(32).toString("hex")}` as `0x${string}`;
    const chainId = BigInt(katana.id);

    const hash = keccak256(encodePacked(
      ["address", "uint256", "uint256", "bytes32", "uint256"],
      [address, amount, expiry, nonce, chainId]
    ));

    const account = privateKeyToAccount(privateKey);
    const signature = await account.signMessage({ message: { raw: hash as `0x${string}` } });

    return NextResponse.json({
      amount: amount.toString(),
      expiry: expiry.toString(),
      nonce,
      signature,
      tierAmount: formatEther(amount),
    });
  } catch (err) {
    console.error("[staking-rewards/voucher]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
