"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet, formatAddr } from "@/lib/wallet";
import { getLeaderboard, getStats, formatUSDT, formatReturn } from "@/lib/quorum";
import { CONTRACT_ADDRESS, CHAIN, EXPLORER_URL } from "@/lib/config";
import type { LeaderboardEntry, Stats } from "@/lib/types";

const METHOD = [
  { n: "01", t: "Price fetch",
    d: "Live market data is fetched on-chain via gl.nondet.web.render (CoinGecko), wrapped in eq_principle for validator agreement. No oracle dependency." },
  { n: "02", t: "Independent analysis",
    d: "Three analysts (Technical, News, Quant) score the asset in isolation. None of them sees another's reasoning before voting." },
  { n: "03", t: "Consensus voting",
    d: "Each analyst casts BUY / HOLD / SELL with a confidence score. Votes are sealed before the risk stage." },
  { n: "04", t: "Risk veto",
    d: "The Risk Manager audits position size, exposure, and confidence floor. A VETO overrides the majority and halts the trade." },
  { n: "05", t: "Execution synthesis",
    d: "The Chair weighs the debate, vote tally, and risk review, then delivers the binding verdict and writes it to chain." },
  { n: "06", t: "Validator consensus",
    d: "Every AI call is re-run by GenLayer's validator network. The session only finalises when the validators agree per the equivalence principle." },
];

export default function CompliancePage() {
  const { address, exportKey } = useWallet();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [exportedKey, setExportedKey] = useState("");
  const [exporting,   setExporting]   = useState(false);
  const [keyError,    setKeyError]    = useState("");
  const [copied,      setCopied]      = useState(false);

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

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow mb-2">Transparency & governance</p>
          <h1 className="display-upright text-3xl">Compliance</h1>
          <p className="text-body mt-2 max-w-2xl">
            Every session is recorded immutably on GenLayer&apos;s Studionet. No oracle. No server.
            The AI deliberation is the contract.
          </p>
        </div>
        <span className="mono text-xs px-3 py-1 border border-hairline-strong" style={{ color: "var(--color-body)", opacity: 0.75 }}>
          PAPER · no real funds
        </span>
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
                <div className="flex items-baseline justify-between mb-1">
                  <span className="eyebrow">Address</span>
                  <button onClick={copyAddress} className="eyebrow link" style={{ background: "none", border: "none", cursor: "pointer" }}>
                    {copied ? "copied ✓" : "copy"}
                  </button>
                </div>
                <div className="mono text-xs text-muted break-all">{CONTRACT_ADDRESS}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="eyebrow mb-1">Network</div>
                  <div className="mono text-sm">GenLayer Studionet</div>
                </div>
                <div>
                  <div className="eyebrow mb-1">Chain ID</div>
                  <div className="mono text-sm">{CHAIN.id}</div>
                </div>
                <div>
                  <div className="eyebrow mb-1">Agents</div>
                  <div className="mono text-sm">5 AI specialists</div>
                </div>
                <div>
                  <div className="eyebrow mb-1">Validators / session</div>
                  <div className="mono text-sm">5 per phase</div>
                </div>
              </div>
              {EXPLORER_URL && (
                <a href={EXPLORER_URL} target="_blank" rel="noreferrer" className="link text-sm mt-2">
                  View on GenLayer Studio ↗
                </a>
              )}
            </div>
          </div>

          {/* Methodology */}
          <div className="card p-5">
            <p className="eyebrow mb-4">Decision methodology</p>
            <div className="flex flex-col">
              {METHOD.map((m, i) => (
                <div key={m.n} className={`flex items-start gap-4 py-3 ${i < METHOD.length - 1 ? "border-b border-hairline" : ""}`}>
                  <span className="eyebrow w-8 shrink-0 pt-0.5">{m.n}</span>
                  <div className="flex-1">
                    <div className="display-upright text-sm mb-1">{m.t}</div>
                    <p className="text-body text-xs leading-relaxed">{m.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right ── */}
        <div className="flex flex-col gap-6">

          {/* Leaderboard */}
          <div className="card p-5">
            <div className="flex items-baseline justify-between mb-4">
              <p className="eyebrow">Performance leaderboard</p>
              <span className="eyebrow">{leaderboard.length} ranked</span>
            </div>
            {loading && <div className="convening-ring mx-auto" />}
            {!loading && leaderboard.length === 0 && (
              <p className="text-body text-sm">No sessions recorded yet.</p>
            )}
            {leaderboard.map((e, i) => {
              const isFirst    = i === 0;
              const isYou      = address && e.owner.toLowerCase() === address.toLowerCase();
              return (
                <div key={i}
                  className="flex items-center gap-3 py-3 border-b border-hairline last:border-0"
                  style={isFirst ? { background: "rgba(245,158,11,0.04)", margin: "0 -1.25rem", padding: "0.75rem 1.25rem" } : {}}>
                  <span className={`eyebrow w-6 text-center ${isFirst ? "text-accent" : ""}`}>
                    {isFirst ? "★" : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="mono text-xs flex items-center gap-2">
                      {formatAddr(e.owner)}
                      {isYou && <span className="eyebrow text-accent">you</span>}
                    </div>
                    <div className="eyebrow mt-0.5">{e.total_sessions} sessions · {e.wins}W / {e.losses}L</div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-sm font-bold">{formatUSDT(e.equity)}</div>
                    <div className={`mono text-xs ${e.total_return_pct >= 0 ? "text-positive" : "text-negative"}`}>
                      {formatReturn(e.total_return_pct)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Wallet / key export */}
          {address && (
            <div className="card p-5">
              <p className="eyebrow mb-4">Your wallet</p>
              <div className="mono text-xs text-muted break-all mb-4">{address}</div>
              {!exportedKey && (
                <div className="p-3 border border-hairline-strong mb-4" style={{ borderColor: "var(--color-accent)", background: "rgba(245,158,11,0.04)" }}>
                  <div className="eyebrow mb-1" style={{ color: "var(--color-accent)" }}>Before you continue</div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-body)" }}>
                    Your private key controls this wallet and every paper-trading position attached to it.
                    Anyone with the key can act as you. Never share it, never paste it into untrusted apps.
                  </p>
                </div>
              )}
              <button onClick={handleExportKey} disabled={exporting}
                className="btn-ghost w-full !py-2.5">
                {exporting ? "Exporting…" : exportedKey ? "Re-export private key" : "Export private key"}
              </button>
              {keyError && <p className="text-sell text-xs mt-2">{keyError}</p>}
              {exportedKey && (
                <div className="mt-4 p-3 bg-canvas border" style={{ borderColor: "var(--color-sell)" }}>
                  <div className="eyebrow mb-1" style={{ color: "var(--color-sell)" }}>SECRET — handle like a password</div>
                  <div className="mono text-xs break-all text-ink select-all">{exportedKey}</div>
                </div>
              )}
              <p className="text-muted text-xs mt-3 leading-relaxed">
                Import this key into MetaMask or any compatible wallet to take full custody.
                Once exported, treat it as compromised if it ever leaves this device.
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
