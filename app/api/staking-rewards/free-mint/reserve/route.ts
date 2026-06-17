import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { MAX_RESERVED_SPOTS, reserveFreeMintWallet } from "./service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await reserveFreeMintWallet(String(body?.wallet_address ?? ""));
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Error reserving free mint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createServiceClient();

    const { count, error } = await supabase
      .from("hollow_raffles_users")
      .select("*", { count: "exact", head: true })
      .eq("free_mint_reserved", true);

    if (error) {
      console.error("Error counting reservations:", error);
      return NextResponse.json({ error: "Failed to fetch reservation stats" }, { status: 500 });
    }

    const reservedCount = count ?? 0;
    return NextResponse.json({
      reservedCount,
      maxSpots: MAX_RESERVED_SPOTS,
      remainingSpots: Math.max(MAX_RESERVED_SPOTS - reservedCount, 0),
    });
  } catch (error) {
    console.error("Error fetching reservation stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
