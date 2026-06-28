import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet";
import { QuorumWordmark } from "@/components/Logo";
import NavClient from "@/components/NavClient";

const serif = Instrument_Serif({
  weight:   ["400"],
  style:    ["normal", "italic"],
  variable: "--font-serif",
  subsets:  ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets:  ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets:  ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://quorum.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:       "QUORUM — Autonomous AI Investment Committee",
  description: "Five AI agents debate, vote, and reach a paper-trading verdict entirely on-chain on GenLayer Studionet.",
  openGraph: {
    title:       "QUORUM — Autonomous AI Investment Committee",
    description: "Five AI agents debate, vote, and reach a paper-trading verdict entirely on-chain.",
    url:         SITE_URL,
    siteName:    "Quorum",
    type:        "website",
  },
  twitter: {
    card:        "summary_large_image",
    title:       "QUORUM — Autonomous AI Investment Committee",
    description: "Five AI agents debate, vote, and reach a paper-trading verdict entirely on-chain.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <WalletProvider>
          {/* Nav */}
          <header className="border-b border-hairline sticky top-0 z-40 backdrop-blur-sm"
            style={{ background: "rgba(13,13,20,0.92)" }}>
            <div className="mx-auto max-w-7xl px-5 h-14 flex items-center justify-between">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <QuorumWordmark />
              </Link>
              <nav className="hidden sm:flex items-center gap-6">
                {[
                  { href: "/console",     label: "Console"    },
                  { href: "/chamber",     label: "Chamber"    },
                  { href: "/portfolio",   label: "Portfolio"  },
                  { href: "/history",     label: "History"    },
                  { href: "/compliance",  label: "Compliance" },
                ].map(({ href, label }) => (
                  <Link key={href} href={href}
                    className="eyebrow hover:text-ink transition-colors">
                    {label}
                  </Link>
                ))}
              </nav>
              <NavClient />
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-hairline py-6">
            <div className="mx-auto max-w-7xl px-5 flex items-center justify-between">
              <span className="eyebrow">Quorum · Autonomous AI Investment Committee</span>
              <span className="eyebrow">Powered by GenLayer</span>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
