"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useAdminStatus } from "@/lib/hooks/useAdmin";

interface WaitlistWallet {
  wallet_address: string;
}

export default function WaitlistWalletsPage() {
  const { address } = useAccount();
  const { isAdmin, isLoading: adminLoading } = useAdminStatus(address);
  const [wallets, setWallets] = useState<WaitlistWallet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWallets = useCallback(async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/waitlist/wallets?page=${p}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWallets(data.wallets);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      setError("Failed to load waitlisted wallets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetchWallets(1);
  }, [isAdmin, adminLoading, fetchWallets]);

  if (adminLoading) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <div className="mb-6 lg:mb-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-header text-white mb-2">
            Waitlisted Wallets
          </h2>
          <p className="text-muted-blue text-xs sm:text-sm">Loading...</p>
        </div>
        <div className="ui-container rounded overflow-hidden">
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#F4FF1A] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-blue">Loading wallets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <div className="mb-6 lg:mb-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-header text-white mb-2">
            Waitlisted Wallets
          </h2>
        </div>
        <div className="ui-container rounded p-8 text-center border border-red-500/30 bg-red-500/5">
          <p className="text-red-400 text-sm">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="mb-6 lg:mb-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-header text-white mb-2">
          Waitlisted Wallets
        </h2>
        <p className="text-muted-blue text-xs sm:text-sm">
          All wallets that have joined the waitlist
        </p>
      </div>

      {/* Total Counter */}
      <div className="ui-container rounded-lg p-6 border border-[#F4FF1A]/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-blue text-xs uppercase tracking-widest font-bold mb-1">
              Total Waitlisted
            </p>
            <p className="text-4xl font-bold text-[#F4FF1A]">
              {total.toLocaleString()}
            </p>
          </div>
          <a
            href="/api/waitlist/wallets/export"
            download
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg border border-[#F4FF1A]/30 text-[#F4FF1A] hover:bg-[#F4FF1A]/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download CSV
          </a>
        </div>
      </div>

      {error && (
        <div className="ui-container rounded border border-red-500/30 p-4 text-center bg-red-500/5">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Wallets Table */}
      <div className="ui-container rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-muted-blue text-xs uppercase tracking-widest font-bold px-5 py-3">
                  #
                </th>
                <th className="text-left text-muted-blue text-xs uppercase tracking-widest font-bold px-5 py-3">
                  Wallet Address
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-5 py-8 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-[#F4FF1A] border-t-transparent rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : wallets.length === 0 && !error ? (
                <tr>
                  <td colSpan={2} className="px-5 py-8 text-center text-muted-blue text-sm">
                    No waitlisted wallets yet
                  </td>
                </tr>
              ) : (
                wallets.map((wallet, index) => (
                  <tr
                    key={wallet.wallet_address}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3 text-white/50 text-sm">
                      {(page - 1) * 20 + index + 1}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-white text-sm font-mono">
                        {wallet.wallet_address}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
            <p className="text-muted-blue text-xs">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchWallets(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded border border-white/10 text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                onClick={() => fetchWallets(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded border border-white/10 text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
