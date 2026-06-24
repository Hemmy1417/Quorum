"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { QuorumMark } from "@/components/Logo";

export default function AuthPage() {
  const router = useRouter();
  const { signup, login, connect, wallets, busy, address } = useWallet();

  const [tab,      setTab]      = useState<"login" | "signup">("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");

  if (address) {
    router.push("/console");
    return null;
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (tab === "signup") await signup(email, password);
      else                  await login(email, password);
      router.push("/console");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    }
  }

  async function handleWallet(rdns?: string) {
    setError("");
    try {
      await connect(rdns);
      router.push("/console");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem-5rem)] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <QuorumMark size={40} />
        </div>

        <h1 className="display-upright text-2xl text-center mb-2">
          {tab === "login" ? "Welcome back." : "Join the committee."}
        </h1>
        <p className="text-body text-sm text-center mb-8">
          {tab === "login"
            ? "Sign in to access your portfolio and session history."
            : "Create an account — a wallet is generated automatically."}
        </p>

        {/* Tab switcher */}
        <div className="flex mb-8 border border-hairline">
          {(["login", "signup"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 eyebrow transition-colors ${
                tab === t
                  ? "bg-elevated text-ink"
                  : "text-muted hover:text-body"
              }`}>
              {t === "login" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="flex flex-col gap-6">
          <div>
            <label className="eyebrow block mb-2">Email</label>
            <input
              type="email" value={email} required
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field"
            />
          </div>
          <div>
            <label className="eyebrow block mb-2">Password</label>
            <input
              type="password" value={password} required minLength={6}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="field"
            />
          </div>
          {error && <p className="text-sell text-sm">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
            {busy
              ? tab === "signup" ? "Creating account…" : "Signing in…"
              : tab === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-7">
          <div className="flex-1 h-px bg-hairline" />
          <span className="eyebrow">or connect wallet</span>
          <div className="flex-1 h-px bg-hairline" />
        </div>

        {/* Injected wallets */}
        {wallets.length > 0 ? (
          <div className="flex flex-col gap-2">
            {wallets.map(w => (
              <button key={w.rdns} onClick={() => handleWallet(w.rdns)}
                disabled={busy}
                className="btn-ghost w-full !py-2.5 flex items-center gap-3">
                {w.icon && <img src={w.icon} alt="" className="w-5 h-5 rounded" />}
                {w.name}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => handleWallet()} disabled={busy}
            className="btn-ghost w-full !py-2.5">
            {busy ? "Connecting…" : "Connect injected wallet"}
          </button>
        )}

        <p className="text-muted text-xs text-center mt-6 leading-relaxed">
          Email accounts receive an auto-generated wallet. You can export your private key from settings.
        </p>
      </div>
    </div>
  );
}
