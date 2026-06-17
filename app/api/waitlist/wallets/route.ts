import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));

    const supabase = await createServiceClient();

    const { count, error: countError } = await supabase
      .from("hollow_raffles_users")
      .select("*", { count: "exact", head: true })
      .eq("id_waitlisted", true);

    if (countError) {
      console.error("Error counting waitlisted wallets:", countError);
      return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 });
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("hollow_raffles_users")
      .select("wallet_address")
      .eq("id_waitlisted", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching waitlisted wallets:", error);
      return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 });
    }

    return NextResponse.json({
      total,
      page,
      totalPages,
      wallets: data ?? [],
    });
  } catch (error) {
    console.error("Error in waitlist wallets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
