import { createClient } from "genlayer-js";
import { CHAIN, CONTRACT_ADDRESS } from "./config";
import type { Session, Portfolio, LeaderboardEntry, Stats } from "./types";

// ── read with retry ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function read(method: string, params: any[] = []): Promise<unknown> {
  const client = createClient({ chain: CHAIN });
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await client.readContract({
        address:      CONTRACT_ADDRESS,
        functionName: method,
        args:         params,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("rate") && attempt < 4) {
        await new Promise(r => setTimeout(r, 700 * attempt));
        continue;
      }
      throw e;
    }
  }
}

// ── write helper ───────────────────────────────────────────────────────────

export async function writeAndWait(
  client: ReturnType<typeof createClient>,
  method: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[]
): Promise<string> {
  const hash = await client.writeContract({
    address:      CONTRACT_ADDRESS,
    functionName: method,
    args:         params,
    value:        BigInt(0),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any).waitForTransactionReceipt({ hash, status: "ACCEPTED" });
  return hash as string;
}

// ── reads ──────────────────────────────────────────────────────────────────

export async function getStats(): Promise<Stats> {
  const raw = await read("get_stats");
  return JSON.parse(raw as string);
}

export async function getPortfolio(address: string): Promise<Portfolio> {
  const raw = await read("get_portfolio", [address]);
  return JSON.parse(raw as string);
}

export async function getHistory(address: string, n = 20): Promise<Session[]> {
  const raw = await read("get_history", [address, BigInt(n)]);
  return JSON.parse(raw as string);
}

export async function getLeaderboard(n = 20): Promise<LeaderboardEntry[]> {
  const raw = await read("get_leaderboard", [BigInt(n)]);
  return JSON.parse(raw as string);
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const raw = await read("get_session", [sessionId]);
  return JSON.parse(raw as string);
}

// ── writes ─────────────────────────────────────────────────────────────────

export async function convene(
  client: ReturnType<typeof createClient>,
  asset: string,
  market: string,
  positionPct: number,
  riskLevel: string
): Promise<string> {
  return writeAndWait(client, "convene", [
    asset, market, positionPct.toString(), riskLevel,
  ]);
}

// ── helpers ────────────────────────────────────────────────────────────────

export function formatUSDT(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatReturn(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

export function shortAddr(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}
