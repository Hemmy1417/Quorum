"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { getHistory } from "@/lib/quorum";
import type { Session } from "@/lib/types";

export default function ChamberPage() {
  const { address } = useWallet();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading,  setLoading]  = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!address) return;
    try {
      const hist = await getHistory(address, 10);
      setSessions(hist);
    } catch {}
    setLoading(false);
  }, [address]);

  useEffect(() => { load(); }, [load]);

  if (!address) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="display text-4xl mb-4">The Chamber</h1>
          <p className="text-body mb-6">Sign in to observe past committee sessions.</p>
          <Link href="/auth" className="btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-8">
        <p className="eyebrow mb-2">Live chamber</p>
        <h1 className="display-upright text-3xl">Session Archive</h1>
        <p className="text-body mt-2">A full replay of every committee deliberation.</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="convening-ring" />
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="card p-10 text-center">
          <p className="display-upright text-lg mb-3">No sessions yet.</p>
          <p className="text-muted text-sm mb-6">Convene the committee to start your first session.</p>
          <Link href="/console" className="btn-primary">Go to Console</Link>
        </div>
      )}

      <div ref={listRef} className="flex flex-col gap-4">
        {sessions.map((s, i) => (
          <div key={i} className="card p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className={`chip chip-${s.decision.toLowerCase()}`}>{s.decision}</span>
                  <span className="display-upright text-base">{s.asset}</span>
                  <span className="eyebrow">{s.market}</span>
                </div>
                <p className="text-body text-sm">{s.summary}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="mono text-xs text-muted">{s.timestamp}</div>
                <div className="mono text-sm font-bold mt-1">
                  {s.confidence}% confidence
                </div>
              </div>
            </div>

            {/* Vote breakdown */}
            <div className="flex items-center gap-3 mb-4">
              <span className="eyebrow">Votes</span>
              {s.vote_breakdown.BUY  > 0 && <span className="chip chip-buy">BUY ×{s.vote_breakdown.BUY}</span>}
              {s.vote_breakdown.HOLD > 0 && <span className="chip chip-hold">HOLD ×{s.vote_breakdown.HOLD}</span>}
              {s.vote_breakdown.SELL > 0 && <span className="chip chip-sell">SELL ×{s.vote_breakdown.SELL}</span>}
            </div>

            {/* Agent outputs */}
            {s.agent_outputs?.length > 0 && (
              <details className="group">
                <summary className="eyebrow cursor-pointer hover:text-ink transition-colors select-none">
                  Show debate transcript ↓
                </summary>
                <div className="mt-4 flex flex-col">
                  {s.agent_outputs.map((a, j) => (
                    <div key={j} className="debate-line">
                      <div className="debate-agent">{a.agent} · {a.vote} · {a.confidence}%</div>
                      <p>{a.analysis}</p>
                    </div>
                  ))}
                  {s.risk_review && (
                    <div className="debate-line">
                      <div className="debate-agent">
                        Risk Manager · {s.risk_review.veto ? "VETO" : "CLEARED"} · Risk {s.risk_review.risk_score}/100
                      </div>
                      <p>{s.risk_review.reasoning}</p>
                    </div>
                  )}
                  {s.execution && (
                    <div className="debate-line latest">
                      <div className="debate-agent">
                        Execution Agent [CHAIR] · {s.execution.decision} · {s.execution.confidence}%
                      </div>
                      <p>{s.execution.summary}</p>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Trade */}
            {s.trade && (
              <div className="mt-4 pt-4 border-t border-hairline flex items-center gap-6">
                <div>
                  <div className="eyebrow mb-0.5">Action</div>
                  <span className={`chip chip-${s.trade.action.toLowerCase()}`}>{s.trade.action}</span>
                </div>
                <div>
                  <div className="eyebrow mb-0.5">Price</div>
                  <div className="mono text-sm">${s.trade.price.toLocaleString()}</div>
                </div>
                <div>
                  <div className="eyebrow mb-0.5">Size</div>
                  <div className="mono text-sm">{s.trade.size.toFixed(4)} {s.asset.replace("USDT","")}</div>
                </div>
                <div>
                  <div className="eyebrow mb-0.5">USDT</div>
                  <div className="mono text-sm">${s.trade.usdt_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
                {s.trade.pnl !== undefined && s.trade.pnl !== 0 && (
                  <div>
                    <div className="eyebrow mb-0.5">PnL</div>
                    <div className={`mono text-sm font-bold ${s.trade.pnl >= 0 ? "text-positive" : "text-negative"}`}>
                      {s.trade.pnl >= 0 ? "+" : ""}{s.trade.pnl.toFixed(2)} USDT
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
