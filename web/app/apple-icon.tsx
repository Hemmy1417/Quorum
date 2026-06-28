import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0d0d14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 100 100">
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
      </div>
    ),
    { ...size },
  );
}
