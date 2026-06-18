import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { http } from "viem";
import { createPublicClient } from "viem";
import { contracts, HollowTokenABI } from "@/lib/contracts";

const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "747474");
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.katana.network";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const { data: user } = await supabase
      .from("litvm_raffle_users")
      .select("id_waitlisted")
      .eq("wallet_address", wallet.toLowerCase())
      .single();

    return NextResponse.json({ isWaitlisted: user?.id_waitlisted ?? false });
  } catch (error) {
    console.error("Error checking waitlist status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, x_username, x_user_id, x_auth_session } = body;

    if (!wallet_address || !/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    if (!x_username || !x_user_id) {
      return NextResponse.json({ error: "X authentication required" }, { status: 400 });
    }

    if (!x_auth_session) {
      return NextResponse.json({ error: "X session verification failed" }, { status: 400 });
    }

    let sessionData: { username: string; id: string } | null = null;
    try {
      sessionData = JSON.parse(Buffer.from(x_auth_session, 'base64').toString());
    } catch {
      return NextResponse.json({ error: "Invalid X session format" }, { status: 400 });
    }

    if (!sessionData || sessionData.username !== x_username || sessionData.id !== x_user_id) {
      return NextResponse.json({ error: "X session mismatch - please re-authenticate" }, { status: 400 });
    }

    const publicClient = createPublicClient({
      chain: {
        id: chainId,
        name: "Katana",
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
      },
      transport: http(rpcUrl),
    });

    const balance = await publicClient.readContract({
      address: contracts.hollowToken.address,
      abi: HollowTokenABI,
      functionName: "balanceOf",
      args: [wallet_address as `0x${string}`],
    });

    const oneToken = BigInt(1e18);
    if (balance < oneToken) {
      return NextResponse.json(
        { error: "Wallet must hold at least 1 HOLLOW token" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    const walletLower = wallet_address.toLowerCase();

    let { data: user } = await supabase
      .from("litvm_raffle_users")
      .select("*")
      .eq("wallet_address", walletLower)
      .single();

    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from("litvm_raffle_users")
        .insert({ wallet_address: walletLower })
        .select()
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }
      user = newUser;
    }

    if (user?.id_waitlisted) {
      return NextResponse.json({ success: true, alreadyJoined: true });
    }

    const { error: updateError } = await supabase
      .from("litvm_raffle_users")
      .update({ id_waitlisted: true })
      .eq("wallet_address", walletLower);

    if (updateError) {
      console.error("Error updating waitlist status:", updateError);
      return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Successfully joined waitlist" });
  } catch (error) {
    console.error("Error in waitlist submission:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
