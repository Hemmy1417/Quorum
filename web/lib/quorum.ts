// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

import { createClient } from "genlayer-js";
import { ethers } from "ethers";
import { CHAIN, CONTRACT_ADDRESS } from "./config";
import type { Session, Portfolio, LeaderboardEntry, Stats } from "./types";

// Contract stores keys via str(gl.message.sender_address) which yields the
// EIP-55 checksummed form. Whatever case the frontend gives us, normalise
// before querying so reads always match the stored key.
function checksum(a: string): string {
  try { return ethers.getAddress(a); } catch { return a; }
}

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

// ── write helper — mirrors Apex/Aegis pattern ─────────────────────────────

export async function writeAndWait(
  client: Client,
  method: string,
  params: unknown[]
): Promise<string> {
  console.log("[QUORUM] writeContract →", method, params);
  const hash = await client.writeContract({
    address:      CONTRACT_ADDRESS,
    functionName: method,
    args:         params,
    // no value field — omit for non-payable calls (matches Apex pattern)
  });
  console.log("[QUORUM] tx submitted →", hash);
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash,
      status:   "ACCEPTED",
      interval: 5000,   // poll every 5s
      retries:  72,     // up to 6 minutes — five sequential eq_principle calls can take a while
    });
    console.log("[QUORUM] receipt →", JSON.stringify(receipt));
    const status = receipt?.status ?? receipt?.consensus_data?.final_state ?? "";
    if (String(status).toUpperCase() === "CANCELED" || String(status).toUpperCase() === "UNDETERMINED") {
      throw new Error(`Transaction ${String(status)}: contract execution failed (check CoinGecko access)`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // genlayer-js throws on poll timeout. If consensus just hasn't finished, the tx
    // can still settle in the background — surface a clearer message so the user
    // refreshes instead of thinking it failed.
    if (msg.toLowerCase().includes("timed out")) {
      throw new Error(
        `Committee is still deliberating — validators didn't finish within 6 min. ` +
        `Refresh in a minute; the session usually completes shortly after this message.`,
      );
    }
    throw e;
  }
  return String(hash);
}

// ── reads ──────────────────────────────────────────────────────────────────

export async function getStats(): Promise<Stats> {
  const raw = await read("get_stats");
  if (!raw) return { total_sessions: 0 };
  return JSON.parse(raw as string);
}

export async function getPortfolio(address: string): Promise<Portfolio | null> {
  const raw = await read("get_portfolio", [checksum(address)]);
  if (!raw) return null;
  return JSON.parse(raw as string);
}

export async function getHistory(address: string, n = 20): Promise<Session[]> {
  console.log("[QUORUM] getHistory →", checksum(address), "n=", n);
  const raw = await read("get_history", [checksum(address), BigInt(n)]);
  console.log("[QUORUM] getHistory raw →", typeof raw === "string" ? raw.slice(0, 200) : raw);
  if (!raw) return [];
  try { return JSON.parse(raw as string); } catch { return []; }
}

export async function getLeaderboard(n = 20): Promise<LeaderboardEntry[]> {
  const raw = await read("get_leaderboard", [BigInt(n)]);
  if (!raw) return [];
  try { return JSON.parse(raw as string); } catch { return []; }
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const raw = await read("get_session", [sessionId]);
  if (!raw) return null;
  return JSON.parse(raw as string);
}

// ── writes ─────────────────────────────────────────────────────────────────

export async function convene(
  client: Client,
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
