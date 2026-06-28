"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet, formatAddr } from "@/lib/wallet";
import { getLeaderboard, getStats, formatUSDT, formatReturn } from "@/lib/quorum";
import { CONTRACT_ADDRESS, explorerTxUrl } from "@/lib/config";
import type { LeaderboardEntry, Stats } from "@/lib/types";

export default function CompliancePage() {
  const { address, exportKey } = useWallet();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [exportedKey, setExportedKey] = useState("");
  const [exporting,   setExporting]   = useState(false);
  const [keyError,    setKeyError]    = useState("");

  const load = useCallback(async () => {
    try {
      const [lb, st] = await Promise.all([getLeaderboard(10), getStats()]);
      setLeaderboard(lb);
      setStats(st);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleExportKey() {
    setExporting(true); setKeyError(""); setExportedKey("");
    try {
      const key = await exportKey();
      setExportedKey(key);
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : "Export failed");
    }
    setExporting(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-10">
        <p className="eyebrow mb-2">Transparency & governance</p>
        <h1 className="display-upright text-3xl">Compliance</h1>
        <p className="text-body mt-2">
          Every session is recorded immutably on GenLayer's Studionet. No oracle. No server.
          The AI deliberation is the contract.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">

        {/* ── Left ── */}
        <div className="flex flex-col gap-6">

          {/* Protocol stats */}
          {stats && (
            <div className="card p-5">
              <p className="eyebrow mb-4">Protocol statistics</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="eyebrow mb-1">Total sessions</div>
                  <div className="display-upright text-2xl">{stats.total_sessions}</div>
                </div>
                <div>
                  <div className="eyebrow mb-1">Unique traders</div>
                  <div className="display-upright text-2xl">{leaderboard.length}</div>
                </div>
              </div>
            </div>
          )}

          {/* Contract */}
          <div className="card p-5">
            <p className="eyebrow mb-4">Smart contract</p>
            <div className="flex flex-col gap-3">
              <div>
                <div className="eyebrow mb-1">Address</div>
                <div className="mono text-xs text-muted break-all">{CONTRACT_ADDRESS}</div>
              </div>
              <div>
                <div className="eyebrow mb-1">Network</div>
                <div className="mono text-sm">GenLayer Studionet</div>
              </div>
              <div>
                <div className="eyebrow mb-1">Agent count</div>
                <div className="mono text-sm">5 specialized AI agents</div>
              </div>
              <a href={`https://studio.genlayer.com/`} target="_blank" rel="noreferrer" className="link text-sm mt-2">
                View on GenLayer Studio ↗
              </a>
            </div>
          </div>

          {/* Methodology */}
          <div className="card p-5">
            <p className="eyebrow mb-4">Decision methodology</p>
            <div className="flex flex-col gap-3 text-sm text-body">
              <p>
                <strong className="text-ink">1. Price fetch</strong> — Live market data is fetched
                on-chain via <code className="mono text-xs">gl.nondet.web.render</code> (CoinGecko).
                No oracle dependency.
              </p>
              <p>
                <strong className="text-ink">2. Independent analysis</strong> — Three agents
                (Technical, News, Quant) analyse the asset independently without seeing each other's work.
              </p>
              <p>
                <strong className="text-ink">3. Consensus voting</strong> — Each analyst votes BUY,
                HOLD, or SELL with a confidence score. Votes are final before the risk stage.
              </p>
              <p>
                <strong className="text-ink">4. Risk veto</strong> — The Risk Manager audits the
                vote for capital risk. A VETO overrides the majority and freezes the session.
              </p>
              <p>
                <strong className="text-ink">5. Execution synthesis</strong> — The Chair weighs all
                inputs and delivers the final, binding verdict recorded on-chain.
              </p>
              <p>
                <strong className="text-ink">6. Validator consensus</strong> — GenLayer's validator
                network independently re-runs each AI call and must reach agreement before the tx finalises.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right ── */}
        <div className="flex flex-col gap-6">

          {/* Leaderboard */}
          <div className="card p-5">
            <p className="eyebrow mb-4">Performance leaderboard</p>
            {loading && <div className="convening-ring mx-auto" />}
            {!loading && leaderboard.length === 0 && (
              <p className="text-muted text-sm">No sessions recorded yet.</p>
            )}
            {leaderboard.map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-hairline last:border-0">
                <span className="eyebrow w-6 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="mono text-xs">{formatAddr(e.owner)}</div>
                  <div className="eyebrow mt-0.5">{e.total_sessions} sessions · {e.wins}W / {e.losses}L</div>
                </div>
                <div className="text-right">
                  <div className="mono text-sm font-bold">{formatUSDT(e.equity)}</div>
                  <div className={`mono text-xs ${e.total_return_pct >= 0 ? "text-positive" : "text-negative"}`}>
                    {formatReturn(e.total_return_pct)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Wallet / key export */}
          {address && (
            <div className="card p-5">
              <p className="eyebrow mb-4">Your wallet</p>
              <div className="mono text-xs text-muted break-all mb-4">{address}</div>
              <button onClick={handleExportKey} disabled={exporting}
                className="btn-ghost w-full !py-2.5">
                {exporting ? "Exporting…" : "Export private key"}
              </button>
              {keyError && <p className="text-sell text-xs mt-2">{keyError}</p>}
              {exportedKey && (
                <div className="mt-4 p-3 bg-canvas border border-hairline-strong">
                  <div className="eyebrow mb-1 text-sell">Keep this secret</div>
                  <div className="mono text-xs break-all text-ink">{exportedKey}</div>
                </div>
              )}
              <p className="text-muted text-xs mt-3 leading-relaxed">
                Export your private key to import into MetaMask or any compatible wallet.
                This key controls your on-chain identity.
              </p>
            </div>
          )}

          {!address && (
            <div className="card p-5 text-center">
              <p className="display-upright text-base mb-3">Sign in to see your wallet</p>
              <Link href="/auth" className="btn-primary">Sign in</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
