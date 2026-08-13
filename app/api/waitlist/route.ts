import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const { data: user } = await supabase
      .from("robinhood_hollow_users")
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
    const { wallet_address } = body;

    if (!wallet_address || !/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const walletLower = wallet_address.toLowerCase();

    const { data: existing } = await supabase
      .from("robinhood_hollow_users")
      .select("id_waitlisted")
      .eq("wallet_address", walletLower)
      .maybeSingle();

    if (existing?.id_waitlisted) {
      return NextResponse.json({ success: true, alreadyJoined: true });
    }

    // Race-safe: create the row if missing, mark waitlisted either way.
    const { error: upsertError } = await supabase
      .from("robinhood_hollow_users")
      .upsert(
        { wallet_address: walletLower, id_waitlisted: true },
        { onConflict: "wallet_address" }
      );

    if (upsertError) {
      console.error("Error joining waitlist:", upsertError);
      return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Successfully joined waitlist" });
  } catch (error) {
    console.error("Error in waitlist submission:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
