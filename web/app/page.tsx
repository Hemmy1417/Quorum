"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStats } from "@/lib/quorum";
import { CONTRACT_CONFIGURED } from "@/lib/config";
import type { Stats } from "@/lib/types";

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

  useEffect(() => {
    if (CONTRACT_CONFIGURED) getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="mx-auto max-w-5xl px-5 pt-32 pb-24 text-center">
        <p className="eyebrow mb-6">Five AI agents · One on-chain verdict · GenLayer</p>
        <h1 className="display text-5xl sm:text-7xl lg:text-8xl">
          The committee<br />has convened.
        </h1>
        <p className="mt-7 text-body text-lg max-w-2xl mx-auto leading-relaxed">
          QUORUM assembles five specialized AI agents that analyse live crypto markets,
          debate the opportunity, vote, and record a transparent investment decision on-chain.
          No server. No trust required.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/console"    className="btn-primary !px-9 !py-3">Convene the committee</Link>
          <Link href="/portfolio"  className="btn-ghost  !px-9 !py-3">View portfolio</Link>
        </div>
      </section>

      {/* ── Live stats ── */}
      {stats && (
        <section className="border-y border-hairline">
          <div className="mx-auto max-w-5xl px-5 py-5 flex items-center justify-center gap-12 text-center">
            <div>
              <div className="display-upright text-3xl">{stats.total_sessions}</div>
              <div className="eyebrow mt-1">Sessions on-chain</div>
            </div>
            <div className="w-px h-8 bg-hairline-strong" />
            <div>
              <div className="display-upright text-3xl">5</div>
              <div className="eyebrow mt-1">AI agents</div>
            </div>
            <div className="w-px h-8 bg-hairline-strong" />
            <div>
              <div className="display-upright text-3xl">100K</div>
              <div className="eyebrow mt-1">Paper USDT</div>
            </div>
          </div>
        </section>
      )}

      {/* ── The Committee ── */}
      <section className="mx-auto max-w-5xl px-5 py-24">
        <p className="eyebrow text-center mb-3">Meet the committee</p>
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

      {/* ── How it works ── */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-5xl px-5 py-24">
          <p className="eyebrow text-center mb-3">How it works</p>
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

      {/* ── Why GenLayer ── */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <p className="eyebrow mb-3">Why GenLayer</p>
          <h2 className="display text-3xl sm:text-4xl mb-6">
            The debate isn't just visible — it's trustless.
          </h2>
          <p className="text-body text-lg leading-relaxed">
            There is no central server deciding outcomes. Each agent's analysis is adjudicated
            by <strong className="text-ink">GenLayer's validator consensus</strong> — the same
            mechanism that makes the blockchain itself trustworthy. The AI judgement is the contract.
          </p>
          <Link href="/console" className="btn-primary mt-10 inline-flex !px-10 !py-3">
            Convene the committee
          </Link>
        </div>
      </section>

    </div>
  );
}
