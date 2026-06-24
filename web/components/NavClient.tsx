"use client";

import Link from "next/link";
import { useWallet, formatAddr } from "@/lib/wallet";

export default function NavClient() {
  const { address, authMethod, connect, disconnect, busy } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-3">
        <span className="mono text-xs text-muted hidden sm:block">
          {authMethod === "email" ? "✉" : "◆"} {formatAddr(address)}
        </span>
        <button onClick={disconnect} className="btn-ghost !px-4 !py-1.5 text-xs">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/auth" className="btn-ghost !px-4 !py-1.5 text-xs">
        Sign in
      </Link>
      <button
        onClick={() => connect().catch(() => {})}
        disabled={busy}
        className="btn-primary !px-4 !py-1.5 text-xs"
      >
        {busy ? "Connecting…" : "Connect wallet"}
      </button>
    </div>
  );
}
