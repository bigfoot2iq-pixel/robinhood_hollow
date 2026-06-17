"use client";

import { useEffect, useState } from "react";
import { RaffleCard } from "@/components/raffle";
import type { PrizeType, Raffle, RaffleStatus } from "@/lib/supabase";

const statusFilters: { label: string; value: RaffleStatus | "all" }[] = [
  { label: "All Raffles", value: "all" },
  { label: "Live", value: "active" },
  { label: "Upcoming", value: "pending" },
  { label: "Historical", value: "ended" },
];

type RaffleSummary = Raffle & {
  status: RaffleStatus;
  prize_types: PrizeType[];
  participants_count: number;
};

export default function RafflesPage() {
  const [raffles, setRaffles] = useState<RaffleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RaffleStatus | "all">("all");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchRaffles() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filter !== "all") {
          params.set("status", filter);
        }
        params.set("limit", "20");

        const response = await fetch(`/api/raffles?${params}`);
        const data = await response.json();
        
        if (response.ok) {
          setRaffles(data.raffles);
          setTotal(data.total);
        }
      } catch (error) {
        console.error("Error fetching raffles:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRaffles();
  }, [filter]);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page Title */}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-header text-white mb-4 lg:mb-8">Raffles Explorer</h2>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto border-b border-white/10 gap-4 sm:gap-6 lg:gap-8 mb-6 lg:mb-8 pb-px">
        {statusFilters.map((status) => (
          <button
            key={status.value}
            onClick={() => setFilter(status.value)}
            className={`pb-3 sm:pb-4 px-2 text-xs sm:text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${
              filter === status.value
                ? "text-[#F4FF1A] border-b-2 border-[#F4FF1A]"
                : "text-muted-blue hover:text-white"
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>

      {/* Raffles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="ui-container rounded h-72 sm:h-80 animate-pulse" />
          ))}
        </div>
      ) : raffles.length === 0 ? (
        <div className="ui-container rounded p-12 sm:p-16 text-center">
          <span className="material-symbols-outlined text-muted-blue text-5xl sm:text-6xl mb-4 block">confirmation_number</span>
          <p className="text-base sm:text-lg text-muted-blue">No raffles found</p>
          <p className="text-xs sm:text-sm text-muted-blue/60 mt-2">Check back soon for new raffles!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {raffles.map((raffle) => (
              <RaffleCard key={raffle.id} raffle={raffle} />
            ))}
          </div>
          {total > raffles.length && (
            <div className="text-center mt-6 lg:mt-8">
              <button className="px-5 sm:px-6 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded uppercase tracking-widest text-xs sm:text-sm transition-all border border-white/10">
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
