"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { convene, getHistory, getPortfolio, formatUSDT, formatReturn } from "@/lib/quorum";
import { CONTRACT_CONFIGURED, ASSETS, explorerTxUrl } from "@/lib/config";
import type { Session, Portfolio } from "@/lib/types";

const STEPS = ["Market Scan", "Debate", "Voting", "Risk Review", "Decision"];

const AGENTS = [
  { emoji: "📈", name: "Technical Analyst", chair: false,
    tags:    "RSI · MACD · EMA · S/R",
    tagline: "Chart purist — structure over noise, opens the case." },
  { emoji: "📰", name: "News Analyst", chair: false,
    tags:    "sentiment · ETF · macro",
    tagline: "Momentum chaser — reads the room, trusts the tape." },
  { emoji: "🧮", name: "Quant Analyst", chair: false,
    tags:    "probability · statistics",
    tagline: "Cold and mathematical — fades stretched extremes." },
  { emoji: "🛡️", name: "Risk Manager", chair: false,
    tags:    "drawdown · volatility · exposure",
    tagline: "Paranoid guardian — holds the veto, protects capital." },
  { emoji: "⚖️", name: "Execution Agent", chair: true,
    tags:    "synthesis · decision",
    tagline: "The chairman — weighs the room, calls the verdict." },
];

// Council-style heuristic: expected % loss per trade as a function of risk level and position size.
const LOSS_FACTOR: Record<"conservative"|"moderate"|"aggressive", number> = {
  conservative: 0.06,
  moderate:     0.10,
  aggressive:   0.18,
};

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
  const [posUnit,     setPosUnit]     = useState<"pct"|"usdt">("pct");
  const [userMaxLoss, setUserMaxLoss] = useState(10);
  const [riskLevel,   setRiskLevel]   = useState<"conservative"|"moderate"|"aggressive">("moderate");
  const [convening,   setConvening]   = useState(false);
  const [lastTx,      setLastTx]      = useState("");
  const [error,       setError]       = useState("");
  const [session,     setSession]     = useState<Session | null>(null);
  const [history,     setHistory]     = useState<Session[]>([]);
  const [portfolio,   setPortfolio]   = useState<Portfolio | null>(null);
  const [step,        setStep]        = useState(-1);

  const stepRef = useRef(0);

  const reload = useCallback(async () => {
    if (!address || !CONTRACT_CONFIGURED) return;
    const [hist, port] = await Promise.all([
      getHistory(address, 20).catch(() => []),
      getPortfolio(address).catch(() => null),
    ]);
    setHistory(hist);
    if (hist.length) setSession(hist[0]);
    if (port) setPortfolio(port);
  }, [address]);

  useEffect(() => { reload(); }, [reload]);

  // ── derived values for Trade Configuration ────────────────────────────────
  const equity         = portfolio?.equity ?? 100_000;
  const exposureUsdt   = (equity * posPct) / 100;
  const councilLossPct = +(posPct * LOSS_FACTOR[riskLevel]).toFixed(1);
  const finalLossPct   = Math.min(councilLossPct, userMaxLoss);

  // ── ballot derived ─────────────────────────────────────────────────────────
  const votesCast = session
    ? (session.agent_outputs?.length ?? 0) + (session.risk_review ? 1 : 0) + (session.execution ? 1 : 0)
    : 0;

  const sessionStatus = convening ? "DELIBERATING" : session ? "COMPLETE" : "IDLE";

  const ledgerTrades = useMemo(
    () => history.filter(s => s.paper_trade && (s.paper_trade.allocation || s.paper_trade.pnl !== undefined)),
    [history],
  );

  async function handleConvene() {
    if (!client || !address) return;
    setError(""); setConvening(true); setSession(null); setStep(0);

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
          <div className="text-center max-w-md px-6">
            <div className="convening-ring mx-auto" />
            <p className="display-upright text-xl mt-6 text-accent">THE COMMITTEE DELIBERATES</p>
            <p className="text-muted text-sm mt-2">Five validators running five agents through eq_principle consensus.</p>
            <div className="flex justify-center gap-0 mt-8 flex-wrap">
              {STEPS.map((s, i) => (
                <div key={s} className="progress-step"
                  data-active={step === i ? true : undefined}
                  data-done={step > i ? true : undefined}>
                  {s}
                </div>
              ))}
            </div>
            <p className="eyebrow mt-6" style={{ opacity: 0.6 }}>
              Phases are estimated — actual progress lives on-chain. Full settlement takes 1–3 min.
            </p>
          </div>
        </div>
      )}

      {/* ── Session header strip ───────────────────────────────────────── */}
      <div className="card p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6">
          <div>
            <div className="eyebrow">Subject</div>
            <div className="mono text-sm mt-1">{session?.asset ?? asset}</div>
          </div>
          <div>
            <div className="eyebrow">Session</div>
            <div className="mono text-sm mt-1">
              #{session ? (session.session_id.split("_").pop() ?? "—") : "—"}
            </div>
          </div>
          <div>
            <div className="eyebrow">Mode</div>
            <div className="mono text-sm mt-1">PAPER · no real funds</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`chip ${
            sessionStatus === "DELIBERATING" ? "chip-hold"
            : sessionStatus === "COMPLETE"    ? "chip-buy"
            :                                   "chip-veto"
          }`}>
            {sessionStatus}
          </span>
          <span className="eyebrow">{convening ? "online" : "standby"}</span>
        </div>
      </div>

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

          {/* ── Decision Metrics — Explainable Confidence ──────────────── */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow">Council Decision</p>
                <span className="eyebrow">verdict</span>
              </div>
              <div className="display text-4xl mb-1">
                {session?.decision ?? "—"}
              </div>
              <p className="text-xs" style={{ color: "var(--color-body)", opacity: 0.85 }}>
                {session ? "Final verdict from the Chair." : "No session in progress."}
              </p>
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow">Quorum Confidence</p>
                <span className="eyebrow">/100</span>
              </div>
              <div className="display text-4xl mb-1">
                {session ? session.confidence : "—"}
              </div>
              <p className="text-xs" style={{ color: "var(--color-body)", opacity: 0.85 }}>
                {session?.summary ? "Why the score landed here." : "Awaiting committee inputs…"}
              </p>
            </div>
          </div>

          {/* ── What just happened ─────────────────────────────────────── */}
          {session && (
            <div className="card p-5">
              <p className="eyebrow mb-3">What just happened</p>
              {session.decision === "VETOED" && (
                <p className="text-sm leading-relaxed">
                  The Risk Manager <strong style={{ color: "var(--color-veto)" }}>vetoed</strong> the trade. No position
                  was opened and no funds were committed. Your paper-trading portfolio is unchanged.
                </p>
              )}
              {session.decision === "HOLD" && (
                <p className="text-sm leading-relaxed">
                  The committee voted <strong style={{ color: "var(--color-hold)" }}>HOLD</strong>. No new position was
                  opened and no existing positions were touched. Your portfolio is unchanged.
                </p>
              )}
              {session.decision === "BUY" && session.paper_trade?.allocation ? (
                <div className="flex flex-col gap-2 text-sm leading-relaxed">
                  <p>
                    The committee voted <strong style={{ color: "var(--color-buy)" }}>BUY</strong>. A paper position was
                    opened on <strong>{session.asset}</strong> at <strong>${session.price.toLocaleString()}</strong>.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-2 mono text-xs">
                    <div>
                      <div className="eyebrow mb-1">Allocated</div>
                      <div>${formatUSDT(session.paper_trade.allocation)} USDT</div>
                    </div>
                    <div>
                      <div className="eyebrow mb-1">Quantity</div>
                      <div>{session.paper_trade.quantity?.toFixed(6)} {session.asset.replace("USDT", "")}</div>
                    </div>
                  </div>
                  <p className="text-xs mt-2" style={{ color: "var(--color-body)", opacity: 0.8 }}>
                    Open the next session with a SELL vote on the same asset to close this position and realise P&L.
                  </p>
                </div>
              ) : null}
              {session.decision === "SELL" && (
                <div className="flex flex-col gap-2 text-sm leading-relaxed">
                  <p>
                    The committee voted <strong style={{ color: "var(--color-sell)" }}>SELL</strong>.
                    {session.paper_trade?.pnl !== undefined ? (
                      <> An open <strong>{session.asset}</strong> position was closed at <strong>${session.price.toLocaleString()}</strong>.</>
                    ) : (
                      <> No open {session.asset} position was found to close — paper portfolio is unchanged.</>
                    )}
                  </p>
                  {session.paper_trade?.pnl !== undefined && (
                    <div className="mono text-sm mt-1">
                      Realised P&L:{" "}
                      <span className={session.paper_trade.pnl >= 0 ? "text-positive" : "text-negative"}>
                        {session.paper_trade.pnl >= 0 ? "+" : ""}
                        ${formatUSDT(session.paper_trade.pnl)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between text-xs mono">
                <span style={{ color: "var(--color-body)", opacity: 0.85 }}>
                  Session #{session.session_id.split("_").pop()}
                </span>
                <Link href="/portfolio" className="link">View portfolio →</Link>
              </div>
            </div>
          )}

          {/* ── The Committee 5 ────────────────────────────────────────── */}
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <p className="eyebrow">The Committee</p>
              <span className="eyebrow">5 agents</span>
            </div>
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
                    <div className="display-upright text-sm">{a.name}</div>
                    <p className="mono text-xs mt-1" style={{ color: "var(--color-accent)", opacity: 0.9 }}>
                      {a.tags}
                    </p>
                    <p className="text-xs italic leading-snug mt-1 mb-2" style={{ color: "var(--color-body)", opacity: 0.9 }}>
                      {a.tagline}
                    </p>

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

          {/* ── Committee Ballot ───────────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow">Committee Ballot</p>
              <span className="eyebrow">{votesCast}/5 cast</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {(["BUY", "HOLD", "SELL"] as const).map(v => (
                <div key={v} className="text-center">
                  <div className={`display text-3xl ${v === "BUY" ? "text-positive" : v === "SELL" ? "text-negative" : ""}`}
                       style={v === "HOLD" ? { color: "var(--color-hold)" } : {}}>
                    {session?.vote_breakdown[v] ?? 0}
                  </div>
                  <div className="eyebrow mt-1">{v}</div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-hairline">
              <div className="eyebrow mb-1">Committee Consensus</div>
              <p className="text-sm" style={{ color: "var(--color-body)" }}>
                {session
                  ? `${session.decision} carried with ${session.confidence}% confidence.`
                  : convening ? "Awaiting the committee's votes…" : "No vote on record."}
              </p>
            </div>
          </div>

          {/* ── Risk Review ────────────────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow">🛡️ Risk Review</p>
              <span className={`chip ${
                session?.risk_review?.veto ? "chip-veto"
                : session?.risk_review     ? "chip-buy"
                : convening                ? "chip-hold"
                :                            "chip-hold"
              }`}>
                {session?.risk_review?.veto ? "VETOED"
                : session?.risk_review      ? "CLEARED"
                : convening                 ? "REVIEWING"
                :                             "STANDBY"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="eyebrow mb-1">Risk Score</div>
                <div className="mono text-lg">{session?.risk_review?.risk_score ?? "—"}<span className="text-xs ml-1">/100</span></div>
              </div>
              <div>
                <div className="eyebrow mb-1">Volatility</div>
                <div className="mono text-sm">{session?.risk_review?.volatility_assessment ?? "—"}</div>
              </div>
              <div>
                <div className="eyebrow mb-1">Exposure</div>
                <div className="mono text-sm">{session?.risk_review?.exposure_assessment ?? "—"}</div>
              </div>
              <div>
                <div className="eyebrow mb-1">Position Size</div>
                <div className="mono text-sm">{session?.position_pct ? `${session.position_pct.toFixed(0)}%` : `${posPct}%`}</div>
              </div>
            </div>
            {session?.risk_review?.reasoning && (
              <p className="text-xs mt-4 pt-3 border-t border-hairline italic" style={{ color: "var(--color-body)" }}>
                “{session.risk_review.reasoning}”
              </p>
            )}
          </div>

          {/* ── Paper Trade — Execution Record ─────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow">Paper Trade</p>
              <span className="eyebrow">Execution Record</span>
            </div>
            {session?.paper_trade && (session.paper_trade.allocation || session.paper_trade.pnl !== undefined) ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="eyebrow mb-1">Action</div>
                  <span className={`chip chip-${(session.paper_trade.direction ?? session.decision).toLowerCase()}`}>
                    {session.paper_trade.direction ?? session.decision}
                  </span>
                </div>
                <div>
                  <div className="eyebrow mb-1">{session.paper_trade.status === "closed" ? "Exit" : "Entry"}</div>
                  <div className="mono text-sm">
                    ${(session.paper_trade.exit_price ?? session.paper_trade.entry_price ?? session.price).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="eyebrow mb-1">Allocation</div>
                  <div className="mono text-sm">
                    ${formatUSDT(session.paper_trade.allocation ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="eyebrow mb-1">PnL</div>
                  <div className={`mono text-sm font-bold ${(session.paper_trade.pnl ?? 0) >= 0 ? "text-positive" : "text-negative"}`}>
                    {session.paper_trade.pnl !== undefined
                      ? `${session.paper_trade.pnl >= 0 ? "+" : ""}${session.paper_trade.pnl.toFixed(2)}`
                      : "—"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--color-body)" }}>
                {convening ? "Awaiting decision…" : "No paper trades yet."}
              </p>
            )}
          </div>

          {/* ── Debate Timeline ────────────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow">Debate Timeline</p>
              <span className="eyebrow">· supporting detail</span>
            </div>
            {convening && !session && (
              <p className="text-sm italic" style={{ color: "var(--color-body)" }}>
                Listening to the chamber…
              </p>
            )}
            {session && (session.agent_outputs ?? []).length > 0 ? (
              <div className="flex flex-col">
                {(session.agent_outputs ?? []).map((a, i) => (
                  <div key={i} className="debate-line">
                    <div className="debate-agent">{a.agent} · {a.vote} · {a.confidence}%</div>
                    <p>{a.analysis}</p>
                  </div>
                ))}
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
            ) : !convening && (
              <p className="text-sm" style={{ color: "var(--color-body)" }}>
                The chamber is empty. Convene the committee to begin.
              </p>
            )}
          </div>

          {error && (
            <div className="card p-4" style={{ borderColor: "var(--color-sell)" }}>
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
              <div>
                <p className="eyebrow">Trade Configuration</p>
                <p className="eyebrow mt-1" style={{ opacity: 0.7 }}>autonomous execution control</p>
              </div>
              <span className={`chip ${sessionStatus === "DELIBERATING" ? "chip-hold" : "chip-buy"}`}>
                {sessionStatus === "DELIBERATING" ? "Live" : "Idle"}
              </span>
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
              <div className="flex items-center justify-between mb-2">
                <label className="eyebrow">Position Size</label>
                <div className="flex border border-hairline">
                  {(["pct", "usdt"] as const).map(u => (
                    <button key={u} onClick={() => setPosUnit(u)}
                      className={`px-2 py-1 eyebrow transition-colors ${posUnit === u ? "bg-elevated text-ink" : "text-muted hover:text-body"}`}>
                      {u === "pct" ? "% Book" : "USDT"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="eyebrow">share of portfolio</span>
                <span className="mono text-sm text-ink">
                  {posUnit === "pct" ? `${posPct}%` : `$${formatUSDT(exposureUsdt)}`}
                </span>
              </div>
              <input type="range" min={1} max={50} value={posPct}
                onChange={e => setPosPct(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between mono text-xs text-muted mt-1">
                <span>0%</span><span>25%</span><span>50%</span>
              </div>
            </div>

            {/* Risk level */}
            <div>
              <label className="eyebrow block mb-2">Risk Level</label>
              <div className="flex border border-hairline">
                {([
                  ["conservative", "Cons."],
                  ["moderate",     "Mod." ],
                  ["aggressive",   "Aggr."],
                ] as const).map(([r, label]) => (
                  <button key={r} onClick={() => setRiskLevel(r)}
                    className={`flex-1 py-2 eyebrow transition-colors ${riskLevel === r ? "bg-elevated text-ink" : "text-muted hover:text-body"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Exposure summary */}
            <div className="border-t border-hairline pt-4 flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">Estimated Exposure</span>
                <span className="mono text-sm text-ink">${formatUSDT(exposureUsdt)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">Max Loss Estimate</span>
                <span className="mono text-sm text-negative">−{finalLossPct}%</span>
              </div>
            </div>

            {/* Max-loss tri-row */}
            <div className="border border-hairline">
              <div className="flex items-center justify-between px-3 py-2 border-b border-hairline">
                <span className="eyebrow">Council est.</span>
                <span className="mono text-sm text-ink">{councilLossPct}%</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-b border-hairline">
                <span className="eyebrow">User max</span>
                <div className="flex items-center gap-2">
                  <input type="range" min={1} max={50} value={userMaxLoss}
                    onChange={e => setUserMaxLoss(Number(e.target.value))}
                    className="w-20 accent-amber-500" />
                  <span className="mono text-sm text-ink w-10 text-right">{userMaxLoss}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-elevated">
                <span className="eyebrow">Final</span>
                <span className="mono text-sm text-accent font-bold">{finalLossPct}%</span>
              </div>
            </div>
            <p className="text-xs" style={{ color: "var(--color-body)", opacity: 0.85 }}>
              QUORUM suggests an optimal size; execution never exceeds your cap.
              <span className="block mt-1 opacity-70">User-max is a UI safeguard — only position_pct is sent on-chain in this build.</span>
            </p>

            <button onClick={handleConvene} disabled={convening || !client}
              className="btn-primary w-full !py-3">
              {convening ? "Committee deliberating…" : "Convene the committee"}
            </button>
            <p className="text-muted text-xs text-center">
              The committee stays idle until you convene. Settles on-chain in 1–3 min.
            </p>
          </div>

          {/* Trade Ledger */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Trade Ledger</p>
              <span className="eyebrow">{ledgerTrades.length} {ledgerTrades.length === 1 ? "trade" : "trades"}</span>
            </div>
            {ledgerTrades.length > 0 && (
              <Link href="/portfolio" className="link text-xs mono mt-3 block">
                View full history →
              </Link>
            )}
          </div>

          <Link href="/chamber" className="btn-ghost w-full text-center !py-2.5">
            Open live chamber →
          </Link>
        </div>
      </div>
    </div>
  );
}
