"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { convene, getHistory, getPortfolio, formatUSDT, formatReturn } from "@/lib/quorum";
import { CONTRACT_CONFIGURED, ASSETS, explorerTxUrl } from "@/lib/config";
import type { Session, Portfolio } from "@/lib/types";

const STEPS = ["Market Scan", "Debate", "Voting", "Risk Review", "Decision"];

const AGENTS = [
  { emoji: "📈", name: "Technical Analyst" },
  { emoji: "📰", name: "News Analyst"       },
  { emoji: "🧮", name: "Quant Analyst"      },
  { emoji: "🛡️", name: "Risk Manager"       },
  { emoji: "⚖️", name: "Execution Agent", chair: true },
];

function voteState(agentName: string, session: Session | null): string {
  if (!session) return "awaiting";
  const output = session.agent_outputs?.find(a => a.agent === agentName);
  if (!output) {
    const rm = session.risk_review;
    if (agentName === "Risk Manager" && rm) return rm.veto ? "vetoed" : `voted-${rm.risk_score > 60 ? "sell" : "hold"}`;
    if (agentName === "Execution Agent" && session.execution) return `voted-${session.execution.decision.toLowerCase()}`;
    return "awaiting";
  }
  return `voted-${output.vote.toLowerCase()}`;
}

export default function ConsolePage() {
  const { address, client } = useWallet();

  const [asset,       setAsset]       = useState("BTCUSDT");
  const [market,      setMarket]      = useState<"spot"|"futures">("spot");
  const [posPct,      setPosPct]      = useState(10);
  const [riskLevel,   setRiskLevel]   = useState<"conservative"|"moderate"|"aggressive">("moderate");
  const [convening,   setConvening]   = useState(false);
  const [lastTx,      setLastTx]      = useState("");
  const [error,       setError]       = useState("");
  const [session,     setSession]     = useState<Session | null>(null);
  const [portfolio,   setPortfolio]   = useState<Portfolio | null>(null);
  const [step,        setStep]        = useState(-1);

  const stepRef = useRef(0);

  const reload = useCallback(async () => {
    if (!address || !CONTRACT_CONFIGURED) return;
    const [hist, port] = await Promise.all([
      getHistory(address, 1).catch(() => []),
      getPortfolio(address).catch(() => null),
    ]);
    if (hist.length) setSession(hist[0]);
    if (port) setPortfolio(port);
  }, [address]);

  useEffect(() => { reload(); }, [reload]);

  async function handleConvene() {
    if (!client || !address) return;
    setError(""); setConvening(true); setSession(null); setStep(0);

    // Animate steps while waiting for validators
    const interval = setInterval(() => {
      stepRef.current = Math.min(stepRef.current + 1, STEPS.length - 1);
      setStep(stepRef.current);
    }, 12000);

    try {
      const hash = await convene(client, asset, market, posPct, riskLevel);
      setLastTx(hash);
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[QUORUM] convene failed:", e);
      setError(msg);
    } finally {
      clearInterval(interval);
      setStep(STEPS.length - 1);
      setConvening(false);
      stepRef.current = 0;
    }
  }

  /* ── Not connected ── */
  if (!address) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="display text-5xl mb-4">Convene the<br/>Committee</h1>
          <p className="text-body mb-8">Sign in to access the console.</p>
          <Link href="/auth" className="btn-primary !px-10 !py-3">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">

      {/* Convening overlay */}
      {convening && (
        <div className="convening-overlay">
          <div className="text-center">
            <div className="convening-ring mx-auto" />
            <p className="display-upright text-xl mt-6 text-accent">THE COMMITTEE DELIBERATES</p>
            <p className="text-muted text-sm mt-2">Validators reaching consensus…</p>
            <div className="flex justify-center gap-0 mt-8">
              {STEPS.map((s, i) => (
                <div key={s} className="progress-step"
                  data-active={step === i ? true : undefined}
                  data-done={step > i ? true : undefined}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">

        {/* ── Left: Main ── */}
        <div className="flex flex-col gap-6">

          {/* Session Decision */}
          {session && (
            <div className="decision-banner" data-decision={session.decision}>
              <div className="eyebrow mb-2">Last session · {session.asset} · {session.market}</div>
              <div className="display text-5xl mb-3">{session.decision}</div>
              <p className="text-sm leading-relaxed max-w-xl mx-auto" style={{ color: "inherit", opacity: 0.85 }}>
                {session.summary}
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 mono text-xs" style={{ opacity: 0.7 }}>
                <span>Confidence {session.confidence}%</span>
                <span>·</span>
                <span>BUY {session.vote_breakdown.BUY} · HOLD {session.vote_breakdown.HOLD} · SELL {session.vote_breakdown.SELL}</span>
                {lastTx && explorerTxUrl(lastTx) && (
                  <>
                    <span>·</span>
                    <a href={explorerTxUrl(lastTx)} target="_blank" rel="noreferrer" className="link">tx ↗</a>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Agent cards */}
          <div>
            <p className="eyebrow mb-4">Committee status</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {AGENTS.map(a => {
                const state = session ? voteState(a.name, session) : "awaiting";
                const output = session?.agent_outputs?.find(o => o.agent === a.name);
                const rm     = session?.risk_review;
                const exec   = session?.execution;

                return (
                  <div key={a.name} className="agent-card" data-state={convening ? "speaking" : state}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xl">{a.emoji}</span>
                      {a.chair && <span className="eyebrow text-accent">Chair</span>}
                    </div>
                    <div className="display-upright text-sm mb-1">{a.name}</div>

                    {/* Show vote/output after session */}
                    {output && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        <span className={`chip chip-${output.vote.toLowerCase()} self-start`}>{output.vote}</span>
                        <p className="text-muted text-xs leading-relaxed">{output.reasoning}</p>
                        <span className="mono text-xs text-muted">{output.confidence}% confidence</span>
                      </div>
                    )}
                    {a.name === "Risk Manager" && rm && !output && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        <span className={`chip self-start ${rm.veto ? "chip-veto" : "chip-hold"}`}>
                          {rm.veto ? "VETO" : "CLEARED"}
                        </span>
                        <p className="text-muted text-xs leading-relaxed">{rm.reasoning}</p>
                        <span className="mono text-xs text-muted">Risk {rm.risk_score}/100</span>
                      </div>
                    )}
                    {a.name === "Execution Agent" && exec && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        <span className={`chip chip-${exec.decision.toLowerCase()} self-start`}>{exec.decision}</span>
                        <p className="text-muted text-xs leading-relaxed">{exec.execution_note}</p>
                        <span className="mono text-xs text-muted">{exec.confidence}% confidence</span>
                      </div>
                    )}
                    {!output && !(a.name === "Risk Manager" && rm) && !(a.name === "Execution Agent" && exec) && (
                      <div className="mt-2">
                        <span className="eyebrow">
                          {convening ? "deliberating…" : "awaiting session"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Debate log */}
          {session && (session.agent_outputs ?? []).length > 0 && (
            <div>
              <p className="eyebrow mb-3">Debate transcript</p>
              <div className="flex flex-col">
                {(session.agent_outputs ?? []).map((a, i) => {
                  const outputs = session.agent_outputs ?? [];
                  return (
                    <div key={i} className={`debate-line ${i === outputs.length - 1 ? "latest" : ""}`}>
                      <div className="debate-agent">{a.agent} · {a.vote} · {a.confidence}%</div>
                      <p>{a.analysis}</p>
                    </div>
                  );
                })}
                {session.risk_review && (
                  <div className="debate-line">
                    <div className="debate-agent">Risk Manager · {session.risk_review.veto ? "VETO" : "CLEARED"} · Risk {session.risk_review.risk_score}/100</div>
                    <p>{session.risk_review.reasoning}</p>
                  </div>
                )}
                {session.execution && (
                  <div className="debate-line latest">
                    <div className="debate-agent">Execution Agent [CHAIR] · {session.execution.decision} · {session.execution.confidence}%</div>
                    <p>{session.execution.summary}</p>
                    {session.execution.dissent && session.execution.dissent !== "None" && (
                      <p className="mt-1 text-muted text-xs italic">Dissent: {session.execution.dissent}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="card p-4 border-sell" style={{ borderColor: "var(--color-sell)" }}>
              <p className="eyebrow mb-1" style={{ color: "var(--color-sell)" }}>Committee error</p>
              <p className="mono text-sm" style={{ color: "var(--color-sell)" }}>{error}</p>
              <p className="text-muted text-xs mt-2">Open DevTools → Console for full stack trace</p>
            </div>
          )}
        </div>

        {/* ── Right: Config ── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-20">

          {/* Portfolio strip */}
          {portfolio && (
            <div className="card p-4 flex items-center justify-between gap-4">
              <div>
                <div className="eyebrow mb-1">Portfolio</div>
                <div className="display-upright text-lg">{formatUSDT(portfolio.equity)} <span className="text-muted text-sm">USDT</span></div>
              </div>
              <div className="text-right">
                <div className="eyebrow mb-1">Return</div>
                <div className={`mono text-base font-bold ${portfolio.total_return_pct >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatReturn(portfolio.total_return_pct)}
                </div>
              </div>
            </div>
          )}

          {/* Config panel */}
          <div className="card p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Trade Configuration</p>
              <span className="eyebrow text-muted">autonomous</span>
            </div>

            {/* Market */}
            <div>
              <label className="eyebrow block mb-2">Market</label>
              <div className="flex border border-hairline">
                {(["spot", "futures"] as const).map(m => (
                  <button key={m} onClick={() => setMarket(m)}
                    className={`flex-1 py-2 eyebrow transition-colors ${market === m ? "bg-elevated text-ink" : "text-muted hover:text-body"}`}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset */}
            <div>
              <label className="eyebrow block mb-2">Asset</label>
              <select value={asset} onChange={e => setAsset(e.target.value)}
                className="field mono text-sm">
                {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Position size */}
            <div>
              <label className="eyebrow block mb-2">Position size — {posPct}% of portfolio</label>
              <input type="range" min={1} max={50} value={posPct}
                onChange={e => setPosPct(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between mono text-xs text-muted mt-1">
                <span>1%</span><span>25%</span><span>50%</span>
              </div>
            </div>

            {/* Risk level */}
            <div>
              <label className="eyebrow block mb-2">Risk level</label>
              <div className="flex border border-hairline">
                {(["conservative","moderate","aggressive"] as const).map(r => (
                  <button key={r} onClick={() => setRiskLevel(r)}
                    className={`flex-1 py-2 eyebrow transition-colors capitalize ${riskLevel === r ? "bg-elevated text-ink" : "text-muted hover:text-body"}`}>
                    {r.slice(0, 4).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleConvene} disabled={convening || !client}
              className="btn-primary w-full !py-3">
              {convening ? "Committee deliberating…" : "Convene the committee"}
            </button>
            <p className="text-muted text-xs text-center">
              The committee deliberates on-chain. This takes 1–3 minutes.
            </p>
          </div>

          <Link href="/chamber" className="btn-ghost w-full text-center !py-2.5">
            Open live chamber →
          </Link>
        </div>
      </div>
    </div>
  );
}
