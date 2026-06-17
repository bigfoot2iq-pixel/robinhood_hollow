import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { PrizeType, Raffle, RaffleStatus } from "@/lib/supabase";
import { CountdownTimer } from "./CountdownTimer";
import { getTokenMetadataCached } from "@/lib/utils/erc20";
import { contracts } from "@/lib/contracts/config";

interface RaffleCardProps {
  raffle: Raffle & {
    status: RaffleStatus;
    prize_types: PrizeType[];
    participants_count: number;
  };
}

const prizeTypeLabels: Record<PrizeType, string> = {
  erc20: "Token",
  erc721: "NFT",
  erc6220: "ERC6220",
};

export function RaffleCard({ raffle }: RaffleCardProps) {
  const [tokenSymbol, setTokenSymbol] = useState<string>("HOLLOW");
  
  const isActive = raffle.status === "active";
  const isEnded = raffle.status === "ended";
  const backupRafflesThatAreEnded = ['b412fc76-06a9-47fc-9540-46a49cdfad81', '86b1bafb-a03a-451e-9732-4966a63c1d68', 'b9788d7f-5f66-431e-823f-6f040d998fb4'].includes(raffle.id);
  const prizeTypes = raffle.prize_types || [];
  const uniquePrizeTypes = Array.from(new Set(prizeTypes));
  const primaryPrizeType = uniquePrizeTypes[0];
  const isNFT = uniquePrizeTypes.some((type) => type === "erc721" || type === "erc6220");
  const prizeLabel =
    uniquePrizeTypes.length === 0
      ? "TBD"
      : uniquePrizeTypes.length === 1 && primaryPrizeType
      ? prizeTypeLabels[primaryPrizeType]
      : "Multiple";

  // Fetch token metadata for entry cost
  useEffect(() => {
    const fetchTokenSymbol = async () => {
      const metadata = await getTokenMetadataCached(contracts.hollowToken.address, false);
      if (metadata) {
        setTokenSymbol(metadata.symbol);
      }
    };
    fetchTokenSymbol();
  }, []);

  return (
    <Link href={`/raffles/${raffle.slug || raffle.id}`}>
      <div className={`ui-container rounded overflow-hidden flex flex-col group transition-transform hover:translate-y-[-4px] ${isEnded || backupRafflesThatAreEnded ? "opacity-50" : ""}`}>
        {/* Image */}
        <div className={`h-56 overflow-hidden relative ${isNFT ? "" : "bg-dark-navy flex items-center justify-center border-b border-white/5"}`}>
          {raffle.image_url ? (
            <Image
              alt={raffle.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              src={raffle.image_url}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : isNFT ? (
            <div className="w-full h-full bg-dark-navy flex items-center justify-center">
              <span className="material-symbols-outlined text-muted-blue text-6xl">image</span>
            </div>
          ) : (
            <Image
              alt="Katana Token"
              width={56}
              height={56}
              className="group-hover:scale-110 transition-transform duration-700"
              src="https://katana.network/meta/favicon.svg"
            />
          )}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="bg-[#F4FF1A] text-dark-navy text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">
              Type: {prizeLabel}
            </span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
              isActive
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : (isEnded || backupRafflesThatAreEnded)
                ? "bg-white/10 text-muted-blue border border-white/10"
                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            }`}>
              {raffle.status === "active" ? "Live" : raffle.status === "pending" ? "Upcoming" : "Ended"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-1.5">
            <h3 className="text-lg font-header text-white truncate mr-2">{raffle.title}</h3>
            <div className="text-right flex-shrink-0">
              <p className="text-[8px] font-bold uppercase text-muted-blue tracking-widest mb-0.5">Participants</p>
              <p className="text-base font-display font-bold text-white tracking-tight leading-none">
                {raffle.participants_count.toLocaleString()}
              </p>
            </div>
          </div>
          
          <p className="text-muted-blue text-[11px] leading-snug mb-3 line-clamp-2">
            {raffle.description}
          </p>

          {(isActive || isEnded || backupRafflesThatAreEnded) && raffle.end_date && (
            <div className={`mb-2.5 p-2.5 rounded border ${isActive ? "bg-gradient-to-r from-[#F4FF1A]/10 to-transparent border-[#F4FF1A]/20" : "bg-white/5 border-white/10"}`}>
              <CountdownTimer endDate={raffle.end_date} />
            </div>
          )}

          <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[8px] font-bold uppercase text-muted-blue tracking-widest">Price</p>
              <p className="text-sm font-display font-bold text-[#F4FF1A]">
                {raffle.tokens_required.toFixed(2)} {tokenSymbol}
              </p>
            </div>
            <button className="px-3 py-1.5 bg-[#F4FF1A] hover:brightness-110 text-dark-navy font-bold rounded uppercase tracking-widest text-[9px] transition-all shadow-[0_0_15px_rgba(244,255,26,0.15)]">
              {isActive ? "Enter" : "View"}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
