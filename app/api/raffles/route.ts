import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { PrizeType, RaffleStatus } from "@/lib/supabase";
import { getRaffleStatus } from "@/lib/utils/raffles";
import { getOnChainRaffleStates } from "@/lib/utils/chain";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get("status") as RaffleStatus | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const now = new Date();
    const nowIso = now.toISOString();

    let query = supabase
      .from("litvm_raffle_raffles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      if (status === "pending") {
        query = query.gt("start_date", nowIso);
      } else if (status === "active") {
        query = query.lte("start_date", nowIso).gt("end_date", nowIso);
      } else if (status === "ended") {
        query = query.lte("end_date", nowIso);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching raffles:", error);
      return NextResponse.json({ error: "Failed to fetch raffles" }, { status: 500 });
    }

    const raffleIds = (data || []).map((raffle) => raffle.id);

    const prizeTypesByRaffle = new Map<string, PrizeType[]>();
    if (raffleIds.length > 0) {
      const { data: prizes, error: prizesError } = await supabase
        .from("litvm_raffle_prizes")
        .select("raffle_id, prize_type")
        .in("raffle_id", raffleIds);

      if (prizesError) {
        console.error("Error fetching raffle prizes:", prizesError);
      } else {
        prizes?.forEach((prize) => {
          const existing = prizeTypesByRaffle.get(prize.raffle_id) || [];
          existing.push(prize.prize_type);
          prizeTypesByRaffle.set(prize.raffle_id, existing);
        });
      }
    }

    const participantsByRaffle = new Map<string, number>();
    if (raffleIds.length > 0) {
      const counts = await Promise.all(
        raffleIds.map(async (id) => {
          const { count, error: countError } = await supabase
            .from("litvm_raffle_entries")
            .select("*", { count: "exact", head: true })
            .eq("raffle_id", id);
          if (countError) {
            console.error(`Error fetching participant count for raffle ${id}:`, countError);
          }
          return { id, count: count || 0 };
        })
      );
      counts.forEach(({ id, count }) => {
        participantsByRaffle.set(id, count);
      });
    }

    // Read on-chain state for deployed raffles
    const chainRaffleIds = (data || [])
      .filter((r) => r.chain_raffle_id)
      .map((r) => ({ dbId: r.id, chainId: r.chain_raffle_id! }));
    const chainStates = await getOnChainRaffleStates(chainRaffleIds);

    const raffles = (data || []).map((raffle) => {
      const prizeTypes = prizeTypesByRaffle.get(raffle.id) || [];
      const uniquePrizeTypes = Array.from(new Set(prizeTypes));

      return {
        ...raffle,
        status: getRaffleStatus(raffle.start_date, raffle.end_date, now, chainStates.get(raffle.id)),
        prize_types: uniquePrizeTypes,
        participants_count: participantsByRaffle.get(raffle.id) || 0,
      };
    });

    // Sort raffles: active first, then pending, then ended (when showing "all")
    if (!status) {
      raffles.sort((a, b) => {
        const statusOrder: Record<RaffleStatus, number> = { active: 0, pending: 1, ended: 2 };
        const orderA = statusOrder[a.status as RaffleStatus] ?? 3;
        const orderB = statusOrder[b.status as RaffleStatus] ?? 3;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        // Within same status, maintain created_at descending order
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return NextResponse.json({
      raffles,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in GET /api/raffles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
