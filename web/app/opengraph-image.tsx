import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Quorum — Autonomous AI Investment Committee";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at 25% 30%, rgba(245,158,11,0.10), transparent 60%), #0d0d14",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* top: mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="64" height="64" viewBox="0 0 100 100">
            <circle cx="50" cy="12" r="9" fill="#f59e0b" />
            <circle cx="88" cy="38" r="9" fill="#f59e0b" />
            <circle cx="74" cy="82" r="9" fill="#f59e0b" />
            <circle cx="26" cy="82" r="9" fill="#f59e0b" />
            <circle cx="12" cy="38" r="9" fill="#f59e0b" />
            <polygon
              points="50,12 88,38 74,82 26,82 12,38"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeOpacity="0.35"
            />
          </svg>
          <div
            style={{
              fontSize: 28,
              letterSpacing: 8,
              fontWeight: 600,
              color: "#ffffff",
            }}
          >
            QUORUM
          </div>
        </div>

        {/* middle: headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 92,
              lineHeight: 1.05,
              letterSpacing: -1,
              color: "#ffffff",
              fontStyle: "italic",
              maxWidth: 980,
            }}
          >
            The committee has convened.
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              color: "#ffffff",
              opacity: 0.85,
              maxWidth: 900,
            }}
          >
            Five AI agents debate, vote, and reach a paper-trading verdict
            entirely on-chain. No oracle. No server.
          </div>
        </div>

        {/* bottom: trust trio + brand line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 18,
            letterSpacing: 2,
          }}
        >
          <div style={{ display: "flex", gap: 22, color: "#ffffff", opacity: 0.85 }}>
            <span>Every decision visible</span>
            <span style={{ color: "#f59e0b" }}>·</span>
            <span>Every vote auditable</span>
            <span style={{ color: "#f59e0b" }}>·</span>
            <span>Every trade explainable</span>
          </div>
          <div style={{ color: "#f59e0b", letterSpacing: 4 }}>
            ON GENLAYER
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
