"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { getHistory } from "@/lib/quorum";
import type { Session } from "@/lib/types";

export default function HistoryPage() {
  const { address } = useWallet();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    if (!address) return;
    try {
      const hist = await getHistory(address, 50);
      setSessions(hist);
    } catch {}
    setLoading(false);
  }, [address]);

  useEffect(() => { load(); }, [load]);

  if (!address) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="display text-4xl mb-4">History</h1>
          <p className="text-body mb-6">Sign in to view your session history.</p>
          <Link href="/auth" className="btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  const byAsset = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    (acc[s.asset] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow mb-2">All sessions</p>
          <h1 className="display-upright text-3xl">Session History</h1>
          <p className="text-body mt-2">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"} on-chain
            <span className="mono text-xs ml-3" style={{ color: "var(--color-body)", opacity: 0.6 }}>· PAPER · no real funds</span>
          </p>
        </div>
        <Link href="/console" className="btn-primary">+ New session</Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="convening-ring" />
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="card p-10 text-center">
          <p className="display-upright text-lg mb-3">No sessions yet.</p>
          <Link href="/console" className="btn-primary">Convene the committee</Link>
        </div>
      )}

      {/* Grouped by asset */}
      {Object.entries(byAsset).map(([asset, group]) => (
        <div key={asset} className="mb-10">
          <p className="eyebrow mb-4">{asset} · {group.length} sessions</p>
          <div className="flex flex-col gap-2">
            {group.map((s, i) => (
              <div key={i} className="card p-4 flex items-center gap-4">
                <span className={`chip chip-${s.decision.toLowerCase()} shrink-0`}>{s.decision}</span>
                <span className="eyebrow shrink-0 hidden sm:inline" style={{ opacity: 0.5 }}>
                  #{s.session_id.split("_").pop()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-body text-sm truncate">{s.summary}</div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="mono text-xs text-muted">{s.market}</div>
                    <div className="mono text-xs">{s.confidence}%</div>
                  </div>
                  {s.paper_trade?.pnl !== undefined && s.paper_trade.pnl !== 0 && (
                    <div className={`mono text-sm font-bold ${s.paper_trade.pnl >= 0 ? "text-positive" : "text-negative"}`}>
                      {s.paper_trade.pnl >= 0 ? "+" : ""}{s.paper_trade.pnl.toFixed(2)}
                    </div>
                  )}
                  <div className="mono text-xs text-muted">{s.timestamp?.slice(0, 10)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
