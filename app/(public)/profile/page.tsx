"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { format } from "date-fns";
import { useTokenBalance, formatTokenBalance } from "@/lib/hooks";
import type { Entry, RaffleStatus, Transaction, User, Winner } from "@/lib/supabase";

interface ProfileData {
  user: User | null;
  entries: (Entry & { raffle: { id: string; slug: string; title: string; status: RaffleStatus } })[];
  wins: (Winner & { raffle: { id: string; slug: string; title: string } })[];
  transactions: Transaction[];
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useTokenBalance(address);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/user/${address}`);
        const result = await response.json();
        
        if (response.ok) {
          setData(result);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 lg:py-20 px-4">
        <span className="material-symbols-outlined text-muted-blue text-5xl sm:text-6xl mb-4 block">account_balance_wallet</span>
        <h1 className="text-xl sm:text-2xl font-header text-white mb-2 text-center">Connect Your Wallet</h1>
        <p className="text-muted-blue text-sm sm:text-base text-center">Connect your wallet to view your profile and raffle entries</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="ui-container rounded h-28 lg:h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page Title */}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-header text-white">My Profile</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="ui-container p-4 lg:p-6 rounded border-l-4 border-[#33C5D9]">
          <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-2">Token Balance</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl lg:text-3xl font-display font-bold text-white">
              {balance !== undefined ? formatTokenBalance(balance) : "0.00"}
            </p>
            <p className="text-[#33C5D9] font-bold pb-0.5 text-sm lg:text-base">HOLLOW</p>
          </div>
          <Link href="/claim">
            <button className="mt-3 lg:mt-4 px-3 lg:px-4 py-1.5 lg:py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] lg:text-xs font-bold rounded uppercase tracking-widest transition-all border border-white/10">
              Claim Daily
            </button>
          </Link>
        </div>

        <div className="ui-container p-4 lg:p-6 rounded">
          <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-2">Total Entries</p>
          <p className="text-2xl lg:text-3xl font-display font-bold text-white">{data?.user?.total_entries || 0}</p>
        </div>

        <div className="ui-container p-4 lg:p-6 rounded sm:col-span-2 lg:col-span-1">
          <p className="text-muted-blue text-[10px] font-bold uppercase tracking-widest mb-2">Total Wins</p>
          <p className="text-2xl lg:text-3xl font-display font-bold text-white">{data?.user?.total_wins || 0}</p>
        </div>
      </div>

      {/* Entries and Wins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* My Entries */}
        <div className="ui-container rounded overflow-hidden">
          <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-white/10">
            <h3 className="text-lg lg:text-xl font-header text-white">My Entries</h3>
          </div>
          <div className="p-4 lg:p-6">
            {data?.entries && data.entries.length > 0 ? (
              <ul className="space-y-2 lg:space-y-3">
                {data.entries.map((entry) => (
                  <li key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 p-3 lg:p-4 bg-white/5 rounded border border-white/5">
                    <div className="min-w-0">
                      <Link href={`/raffles/${entry.raffle.slug || entry.raffle.id}`} className="font-bold text-sm lg:text-base text-white hover:text-[#33C5D9] transition-colors block truncate">
                        {entry.raffle.title}
                      </Link>
                      <p className="text-[10px] lg:text-xs text-muted-blue mt-1">
                        {entry.entry_count} entries • {entry.tokens_spent} HOLLOW
                      </p>
                    </div>
                    <span className={`px-2 lg:px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border self-start sm:self-auto ${
                      entry.raffle.status === "active"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-white/5 text-muted-blue border-white/10"
                    }`}>
                      {entry.raffle.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 lg:py-8">
                <span className="material-symbols-outlined text-muted-blue text-3xl lg:text-4xl mb-2 block">confirmation_number</span>
                <p className="text-muted-blue text-sm">No entries yet</p>
              </div>
            )}
          </div>
        </div>

        {/* My Wins */}
        <div className="ui-container rounded overflow-hidden">
          <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-white/10">
            <h3 className="text-lg lg:text-xl font-header text-white">My Wins</h3>
          </div>
          <div className="p-4 lg:p-6">
            {data?.wins && data.wins.length > 0 ? (
              <ul className="space-y-2 lg:space-y-3">
                {data.wins.map((win) => (
                  <li key={win.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 p-3 lg:p-4 bg-white/5 rounded border border-white/5">
                    <div className="min-w-0">
                      <Link href={`/raffles/${win.raffle.slug || win.raffle.id}`} className="font-bold text-sm lg:text-base text-white hover:text-[#33C5D9] transition-colors block truncate">
                        {win.raffle.title}
                      </Link>
                      <p className="text-[10px] lg:text-xs text-muted-blue mt-1">
                        {format(new Date(win.created_at), "PPP")}
                      </p>
                    </div>
                    {win.distribution_tx_hash ? (
                      <span className="px-2 lg:px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest rounded border border-emerald-500/20 self-start sm:self-auto">
                        Claimed
                      </span>
                    ) : (
                      <span className="px-2 lg:px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-widest rounded border border-amber-500/20 self-start sm:self-auto">
                        Pending
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 lg:py-8">
                <span className="material-symbols-outlined text-muted-blue text-3xl lg:text-4xl mb-2 block">trophy</span>
                <p className="text-muted-blue text-sm">No wins yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions History */}
      <div className="ui-container rounded overflow-hidden">
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-white/10">
          <h3 className="text-lg lg:text-xl font-header text-white">Transaction History</h3>
        </div>
        {data?.transactions && data.transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-widest text-muted-blue">Date</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-widest text-muted-blue">Type</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-widest text-muted-blue">Amount</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-widest text-muted-blue text-right">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 lg:px-6 py-4 lg:py-5">
                      <p className="text-xs lg:text-sm font-bold text-white">{format(new Date(tx.created_at), "MMM d, yyyy")}</p>
                      <p className="text-[10px] text-muted-blue uppercase">{format(new Date(tx.created_at), "HH:mm")}</p>
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-5">
                      <span className="text-[10px] lg:text-xs text-white capitalize">{tx.type.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-5">
                      <p className="text-xs lg:text-sm font-display font-bold text-[#33C5D9]">{tx.amount} HOLLOW</p>
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-5 text-right">
                      <a className="text-muted-blue hover:text-[#33C5D9] transition-colors" href="#" target="_blank">
                        <span className="material-symbols-outlined text-lg lg:text-xl">open_in_new</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 lg:p-8 text-center">
            <span className="material-symbols-outlined text-muted-blue text-3xl lg:text-4xl mb-2 block">receipt_long</span>
            <p className="text-muted-blue text-sm">No transactions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
