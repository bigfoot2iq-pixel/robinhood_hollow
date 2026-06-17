"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAdminStatus } from "@/lib/hooks";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/claim", label: "Claim", icon: "redeem" },
  { href: "/raffles", label: "Raffles", icon: "confirmation_number" },
  { href: "/waitlist", label: "Waitlist", icon: "playlist_add" },
  { href: "/game", label: "Game", icon: "sports_esports" },
  { href: "/leaderboard", label: "Leaderboard", icon: "emoji_events" },
  { href: "/staking", label: "Staking", icon: "token" },
  { href: "/checker", label: "Checker", icon: "fact_check" },
  { href: "/profile", label: "Profile", icon: "person" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { isAdmin } = useAdminStatus(isConnected ? address : undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark-navy/95 border border-white/10 rounded text-white"
      >
        <span className="material-symbols-outlined">
          {mobileMenuOpen ? "close" : "menu"}
        </span>
      </button>

      {/* Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 flex-shrink-0 border-r border-white/10 bg-dark-navy/95 flex flex-col justify-between p-6
        lg:relative lg:translate-x-0
        fixed inset-y-0 left-0 z-40 transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <Link href="/claim" className="flex items-center gap-3">
          <img src="/hollow_logo.png" alt="Katana Logo" className="h-10 w-auto" />
          <h2 className="text-2xl font-header tracking-tight text-white uppercase">Katana</h2>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#F4FF1A] text-dark-navy"
                    : "text-muted-blue hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <p className={`text-sm ${isActive ? "font-bold uppercase tracking-wider" : "font-medium"}`}>
                  {item.label}
                </p>
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded transition-all cursor-pointer ${
                pathname.startsWith("/admin")
                  ? "bg-[#F4FF1A] text-dark-navy"
                  : "text-muted-blue hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined">admin_panel_settings</span>
              <p className={`text-sm ${pathname.startsWith("/admin") ? "font-bold uppercase tracking-wider" : "font-medium"}`}>
                Admin
              </p>
            </Link>
          )}
        </nav>
      </div>

      {/* User section with RainbowKit */}
      <div className="flex flex-col gap-4">
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            if (!ready) return null;

            if (!connected) {
              return (
                <button
                  onClick={openConnectModal}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#F4FF1A] hover:brightness-110 text-dark-navy text-sm font-bold rounded transition-all uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                  Connect Wallet
                </button>
              );
            }

            if (chain.unsupported) {
              return (
                <button
                  onClick={openChainModal}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded transition-all uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Wrong Network
                </button>
              );
            }

            return (
              <button
                onClick={openAccountModal}
                className="flex items-center gap-3 p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-colors cursor-pointer w-full"
              >
                <div className="h-10 w-10 rounded bg-[#F4FF1A] flex items-center justify-center text-dark-navy text-xs font-bold flex-shrink-0">
                  K
                </div>
                <div className="flex flex-col overflow-hidden flex-1 text-left">
                  <p className="text-sm font-bold text-white truncate">
                    {account.displayName}
                  </p>
                  <p className="text-xs text-muted-blue truncate">
                    {account.displayBalance || chain.name}
                  </p>
                </div>
              </button>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </aside>
    </>
  );
}
