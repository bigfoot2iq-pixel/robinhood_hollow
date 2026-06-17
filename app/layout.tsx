import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans, Space_Grotesk, DM_Serif_Display } from "next/font/google";
import localFont from "next/font/local";
import { Web3Provider } from "@/components/providers";
import { Header, Sidebar } from "@/components/layout";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { Toaster } from "sonner";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
  display: "swap",
});

const materialSymbols = localFont({
  src: "../public/fonts/material-symbols-outlined.woff2",
  variable: "--font-material-symbols",
  display: "swap",
  weight: "100 700",
});

export const metadata: Metadata = {
  title: "Katana Raffles - Win Amazing Prizes",
  description: "Decentralized raffles platform on Katana Network. Buy tokens, enter raffles, win prizes!",
  icons: {
    icon: "/hollow_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${plusJakarta.variable} ${spaceGrotesk.variable} ${dmSerif.variable} ${materialSymbols.variable}`}>
      <head />
      <body className="antialiased min-h-screen">
        <GlobalLoader />
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "#0a1128",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fff",
            },
          }}
        />
        <Web3Provider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto w-full">
              <Header />
              <div className="max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
