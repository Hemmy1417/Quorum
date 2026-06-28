"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStats } from "@/lib/quorum";
import { CONTRACT_CONFIGURED } from "@/lib/config";
import type { Stats } from "@/lib/types";

interface Tick { id: string; symbol: string; price: number; change: number; }

async function fetchTicks(): Promise<Tick[]> {
  const ids = "bitcoin,ethereum,solana";
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    return [
      { id: "bitcoin",  symbol: "BTCUSDT", price: d.bitcoin?.usd  ?? 0, change: d.bitcoin?.usd_24h_change  ?? 0 },
      { id: "ethereum", symbol: "ETHUSDT", price: d.ethereum?.usd ?? 0, change: d.ethereum?.usd_24h_change ?? 0 },
      { id: "solana",   symbol: "SOLUSDT", price: d.solana?.usd   ?? 0, change: d.solana?.usd_24h_change   ?? 0 },
    ];
  } catch {
    return [];
  }
}

const AGENTS = [
  { emoji: "📈", name: "Technical Analyst",  tags: "RSI · MACD · S/R",          desc: "Reads price structure, trend, and key levels to open the case." },
  { emoji: "📰", name: "News Analyst",        tags: "SENTIMENT · ETF · MACRO",    desc: "Weighs sentiment, ETF flows, and macro to gauge momentum." },
  { emoji: "🧮", name: "Quant Analyst",       tags: "PROBABILITY · STATISTICS",   desc: "Applies probability and statistics, fading stretched extremes." },
  { emoji: "🛡️", name: "Risk Manager",        tags: "DRAWDOWN · VOLATILITY",      desc: "Guards capital — flags volatility and holds the veto." },
  { emoji: "⚖️", name: "Execution Agent",     tags: "SYNTHESIS · DECISION",       desc: "Chairs the committee, weighs the debate, and calls the verdict.", chair: true },
];

const STEPS = [
  { n: "01", label: "Market Scan",  desc: "Live price data fetched on-chain via GenLayer web rendering." },
  { n: "02", label: "Debate",       desc: "Three analysts present independent reads on the asset." },
  { n: "03", label: "Voting",       desc: "Each agent casts BUY, HOLD, or SELL with a confidence score." },
  { n: "04", label: "Risk Review",  desc: "The Risk Manager audits the vote and can veto any session." },
  { n: "05", label: "Execution",    desc: "The Chair synthesises the room and delivers the final verdict." },
];

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ticks, setTicks] = useState<Tick[]>([]);

  useEffect(() => {
    if (CONTRACT_CONFIGURED) getStats().then(setStats).catch(() => {});
    fetchTicks().then(setTicks);
    const id = setInterval(() => fetchTicks().then(setTicks), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="mx-auto max-w-5xl px-5 pt-32 pb-20 text-center">
        <p className="eyebrow mb-6">Autonomous AI Investment Committee · GenLayer</p>
        <h1 className="display text-5xl sm:text-7xl lg:text-8xl">
          The committee<br />has convened.
        </h1>
        <p className="mt-7 text-body text-lg max-w-2xl mx-auto leading-relaxed">
          QUORUM assembles five specialized AI agents that analyse live crypto markets,
          debate the opportunity, vote, and record a transparent paper-trading decision on-chain.
          No server. No oracle. No trust required.
        </p>

        {/* Trust trio */}
        <div className="mt-10 flex items-center justify-center gap-6 flex-wrap mono text-xs"
             style={{ color: "var(--color-body)", opacity: 0.9 }}>
          <span>Every decision visible.</span>
          <span style={{ color: "var(--color-accent)" }}>·</span>
          <span>Every vote auditable.</span>
          <span style={{ color: "var(--color-accent)" }}>·</span>
          <span>Every trade explainable.</span>
        </div>

        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/console"    className="btn-primary !px-9 !py-3">Convene the committee</Link>
          <Link href="/compliance" className="btn-ghost  !px-9 !py-3">View performance</Link>
        </div>
      </section>

      {/* ── 01 · Live Market Overview ── */}
      <section className="border-y border-hairline">
        <div className="mx-auto max-w-5xl px-5 py-6">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-baseline gap-3">
              <span className="eyebrow">01</span>
              <p className="eyebrow">Live Market Overview</p>
            </div>
            <span className="eyebrow" style={{ opacity: 0.7 }}>real-time · CoinGecko</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(ticks.length ? ticks : [
              { symbol: "BTCUSDT", price: 0, change: 0, id: "x" },
              { symbol: "ETHUSDT", price: 0, change: 0, id: "y" },
              { symbol: "SOLUSDT", price: 0, change: 0, id: "z" },
            ]).map(t => (
              <div key={t.symbol} className="card p-4 flex items-baseline justify-between">
                <div>
                  <div className="eyebrow mb-1">{t.symbol}</div>
                  <div className="mono text-lg">
                    {t.price > 0
                      ? `$${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                      : "loading…"}
                  </div>
                </div>
                {t.price > 0 && (
                  <div className={`mono text-sm ${t.change >= 0 ? "text-positive" : "text-negative"}`}>
                    {t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Protocol stats ── */}
      {stats && (
        <section className="border-b border-hairline">
          <div className="mx-auto max-w-5xl px-5 py-5 flex items-center justify-center gap-12 text-center flex-wrap">
            <div>
              <div className="display-upright text-3xl">{stats.total_sessions}</div>
              <div className="eyebrow mt-1">Sessions on-chain</div>
            </div>
            <div className="w-px h-8 bg-hairline-strong hidden sm:block" />
            <div>
              <div className="display-upright text-3xl">5</div>
              <div className="eyebrow mt-1">AI agents</div>
            </div>
            <div className="w-px h-8 bg-hairline-strong hidden sm:block" />
            <div>
              <div className="display-upright text-3xl">100K</div>
              <div className="eyebrow mt-1">Paper USDT / wallet</div>
            </div>
          </div>
        </section>
      )}

      {/* ── 02 · The Committee ── */}
      <section className="mx-auto max-w-5xl px-5 py-24">
        <div className="flex items-baseline justify-center gap-3 mb-3">
          <span className="eyebrow">02</span>
          <p className="eyebrow">Meet the committee</p>
        </div>
        <h2 className="display-upright text-3xl sm:text-4xl text-center mb-14">
          Five agents. One transparent process.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENTS.map(a => (
            <div key={a.name} className="agent-card">
              <div className="text-2xl mb-3">{a.emoji}</div>
              <div className="flex items-center gap-2 mb-1">
                <span className="display-upright text-base">{a.name}</span>
                {a.chair && <span className="eyebrow px-1.5 py-0.5 border border-accent text-accent">Chair</span>}
              </div>
              <div className="eyebrow mb-3">{a.tags}</div>
              <p className="text-body text-sm leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 03 · How it works ── */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-5xl px-5 py-24">
          <div className="flex items-baseline justify-center gap-3 mb-3">
            <span className="eyebrow">03</span>
            <p className="eyebrow">How it works</p>
          </div>
          <h2 className="display-upright text-3xl sm:text-4xl text-center mb-14">
            Every session follows the same transparent path.
          </h2>
          <div className="flex flex-col gap-0">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-start gap-6 py-5 border-b border-hairline last:border-0">
                <span className="eyebrow w-8 shrink-0 pt-0.5">{s.n}</span>
                <div className="flex-1">
                  <div className="display-upright text-lg mb-1">{s.label}</div>
                  <p className="text-body text-sm leading-relaxed">{s.desc}</p>
                </div>
                <div className="progress-step shrink-0 hidden sm:flex" data-done={i < 5 ? true : undefined}>
                  {s.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04 · Why GenLayer ── */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <div className="flex items-baseline justify-center gap-3 mb-3">
            <span className="eyebrow">04</span>
            <p className="eyebrow">Why GenLayer</p>
          </div>
          <h2 className="display text-3xl sm:text-4xl mb-6">
            The debate isn&apos;t just visible — it&apos;s trustless.
          </h2>
          <p className="text-body text-lg leading-relaxed">
            There is no central server deciding outcomes. Each agent&apos;s analysis is adjudicated
            by <strong className="text-ink">GenLayer&apos;s validator consensus</strong> — the same
            mechanism that makes the blockchain itself trustworthy. The AI judgement is the contract.
          </p>
          <Link href="/console" className="btn-primary mt-10 inline-flex !px-10 !py-3">
            Convene the committee
          </Link>
          <p className="text-muted text-xs mt-6">
            Paper trading only · No real funds · Studionet
          </p>
        </div>
      </section>

    </div>
  );
}
