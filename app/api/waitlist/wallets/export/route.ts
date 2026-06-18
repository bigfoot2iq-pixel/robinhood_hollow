import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from("litvm_raffle_users")
      .select("wallet_address")
      .eq("id_waitlisted", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error exporting waitlisted wallets:", error);
      return NextResponse.json({ error: "Failed to export wallets" }, { status: 500 });
    }

    const csv = ["wallet_address", ...(data ?? []).map((w) => w.wallet_address)].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=waitlisted_wallets.csv",
      },
    });
  } catch (error) {
    console.error("Error in waitlist export:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
