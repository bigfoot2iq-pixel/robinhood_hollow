"use client";

import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { useTokenBalance, formatTokenBalance } from "@/lib/hooks";

export function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { data: balance } = useTokenBalance(address);

  // Determine page title based on path
  const getPageTitle = () => {
    if (pathname === "/") return "Profile Overview";
    if (pathname.startsWith("/raffles")) return "Raffles";
    if (pathname.startsWith("/game")) return "LitVM: Last Stand";
    if (pathname.startsWith("/leaderboard")) return "Leaderboard";
    if (pathname.startsWith("/profile")) return "Profile Overview";
    if (pathname.startsWith("/admin")) return "Admin Dashboard";
    return "LitVM Hollow";
  };

  return (
    <header className="sticky top-0 z-10 bg-dark-navy/80 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 lg:gap-6 flex-1 min-w-0">
        {/* Mobile: Leave space for menu button */}
        <div className="lg:hidden w-10"></div>
        <h1 className="text-lg lg:text-2xl font-header text-white truncate">{getPageTitle()}</h1>
        <div className="hidden xl:flex gap-4">
          <a className="text-sm text-muted-blue hover:text-[#33C5D9] transition-colors" href="#">Explorer</a>
          <a className="text-sm text-muted-blue hover:text-[#33C5D9] transition-colors" href="#">Marketplace</a>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        {isConnected && balance !== undefined && (
          <div className="px-2 lg:px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#33C5D9] animate-pulse"></div>
            <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest">
              <span className="hidden sm:inline">{formatTokenBalance(balance)} </span>
              <span className="sm:hidden">{formatTokenBalance(balance)} </span>
              HOLLOW
            </span>
          </div>
        )}
        
        <div className="relative group hidden xl:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-blue">search</span>
          <input
            className="bg-white/10 border-none rounded pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-[#33C5D9] w-64 text-white placeholder-muted-blue"
            placeholder="Search..."
            type="text"
          />
        </div>

        <button className="p-2 bg-white/10 rounded text-white hover:bg-[#33C5D9] hover:text-dark-navy transition-all">
          <span className="material-symbols-outlined text-xl lg:text-2xl">notifications</span>
        </button>
      </div>
    </header>
  );
}
