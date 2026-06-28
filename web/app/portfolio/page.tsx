"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { getPortfolio, getHistory, formatUSDT, formatReturn } from "@/lib/quorum";
import type { Portfolio, Session } from "@/lib/types";

const STARTING = 100_000;

function EquityBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? "var(--color-buy)" : "var(--color-sell)";
  const w = Math.min(Math.abs(pct - 100) / 50 * 50, 50);
  return (
    <div className="relative h-2 bg-hairline-strong rounded-full overflow-hidden">
      <div className="absolute inset-y-0 left-1/2 w-px bg-muted" />
      {pct >= 100
        ? <div className="absolute inset-y-0 left-1/2" style={{ width: `${w}%`, background: color }} />
        : <div className="absolute inset-y-0 right-1/2" style={{ width: `${w}%`, background: color }} />
      }
    </div>
  );
}

export default function PortfolioPage() {
  const { address } = useWallet();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [sessions,  setSessions]  = useState<Session[]>([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    if (!address) return;
    try {
      const [port, hist] = await Promise.all([
        getPortfolio(address),
        getHistory(address, 20),
      ]);
      setPortfolio(port);
      setSessions(hist);
    } catch {}
    setLoading(false);
  }, [address]);

  useEffect(() => { load(); }, [load]);

  if (!address) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="display text-4xl mb-4">Portfolio</h1>
          <p className="text-body mb-6">Sign in to view your paper trading portfolio.</p>
          <Link href="/auth" className="btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  const wins  = sessions.filter(s => (s.trade?.pnl ?? 0) > 0).length;
  const total = sessions.filter(s => s.trade).length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-8">
        <p className="eyebrow mb-2">Paper trading</p>
        <h1 className="display-upright text-3xl">Portfolio</h1>
        <p className="text-body mt-2">Starting equity: {formatUSDT(STARTING)} USDT</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="convening-ring" />
        </div>
      )}

      {!loading && !portfolio && (
        <div className="card p-10 text-center">
          <p className="display-upright text-lg mb-3">No portfolio yet.</p>
          <p className="text-muted text-sm mb-6">Run your first committee session to initialize your portfolio.</p>
          <Link href="/console" className="btn-primary">Go to Console</Link>
        </div>
      )}

      {portfolio && (
        <div className="flex flex-col gap-6">
          {/* Key stats */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="eyebrow mb-2">Equity</div>
              <div className="display-upright text-2xl">{formatUSDT(portfolio.equity)}</div>
              <div className="eyebrow mt-1">USDT</div>
            </div>
            <div className="card p-5">
              <div className="eyebrow mb-2">Total Return</div>
              <div className={`display-upright text-2xl ${portfolio.total_return_pct >= 0 ? "text-positive" : "text-negative"}`}>
                {formatReturn(portfolio.total_return_pct)}
              </div>
              <div className="mono text-sm text-muted mt-1">
                {portfolio.total_return_pct >= 0 ? "+" : ""}
                {formatUSDT(portfolio.equity - STARTING)} USDT
              </div>
            </div>
            <div className="card p-5">
              <div className="eyebrow mb-2">Win rate</div>
              <div className="display-upright text-2xl">
                {total > 0 ? ((wins / total) * 100).toFixed(0) : "—"}
                {total > 0 ? "%" : ""}
              </div>
              <div className="mono text-sm text-muted mt-1">{wins}/{total} trades</div>
            </div>
          </div>

          {/* Equity bar */}
          <div className="card p-5">
            <div className="flex justify-between mono text-xs text-muted mb-2">
              <span>Start {formatUSDT(STARTING)}</span>
              <span>Current {formatUSDT(portfolio.equity)}</span>
            </div>
            <EquityBar pct={(portfolio.equity / STARTING) * 100} />
          </div>

          {/* Holdings */}
          {portfolio.holdings && Object.keys(portfolio.holdings).length > 0 && (
            <div className="card p-5">
              <p className="eyebrow mb-4">Open positions</p>
              <div className="flex flex-col gap-3">
                {Object.entries(portfolio.holdings).map(([asset, holding]) => (
                  <div key={asset} className="flex items-center justify-between py-2 border-b border-hairline last:border-0">
                    <div>
                      <div className="display-upright text-base">{asset}</div>
                      <div className="mono text-xs text-muted">{holding.qty.toFixed(6)} units</div>
                    </div>
                    <div className="text-right">
                      <div className="mono text-sm">@ ${holding.avg_price.toLocaleString()}</div>
                      <div className="mono text-xs text-muted">avg entry</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trade history table */}
          {sessions.filter(s => s.paper_trade && (s.paper_trade.allocation || s.paper_trade.pnl !== undefined)).length > 0 && (
            <div className="card p-5">
              <p className="eyebrow mb-4">Trade history</p>
              <div className="overflow-x-auto">
                <table className="w-full mono text-xs">
                  <thead>
                    <tr className="border-b border-hairline">
                      {["Asset","Action","Price","Size","Value","PnL","Session"].map(h => (
                        <th key={h} className="text-left eyebrow pb-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions
                      .filter(s => s.paper_trade && (s.paper_trade.allocation || s.paper_trade.pnl !== undefined))
                      .map((s, i) => {
                        const t = s.paper_trade!;
                        const action = t.direction ?? s.decision;
                        const price = t.exit_price ?? t.entry_price ?? s.price;
                        return (
                          <tr key={i} className="border-b border-hairline last:border-0">
                            <td className="py-2.5 pr-4 text-ink">{s.asset}</td>
                            <td className="py-2.5 pr-4">
                              <span className={`chip chip-${action.toLowerCase()}`}>{action}</span>
                            </td>
                            <td className="py-2.5 pr-4">${price.toLocaleString()}</td>
                            <td className="py-2.5 pr-4">{(t.quantity ?? 0).toFixed(4)}</td>
                            <td className="py-2.5 pr-4">${(t.allocation ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            <td className={`py-2.5 pr-4 font-bold ${(t.pnl ?? 0) >= 0 ? "text-positive" : "text-negative"}`}>
                              {t.pnl !== undefined && t.pnl !== 0
                                ? `${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}`
                                : "—"}
                            </td>
                            <td className="py-2.5 text-muted">{s.timestamp?.slice(0, 10)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
