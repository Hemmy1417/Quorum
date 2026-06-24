export function QuorumMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Quorum"
    >
      {/* Five dots arranged in a pentagon — committee of five */}
      <circle cx="50" cy="12"  r="8" fill="currentColor" />
      <circle cx="88" cy="38"  r="8" fill="currentColor" opacity="0.85" />
      <circle cx="74" cy="82"  r="8" fill="currentColor" opacity="0.7" />
      <circle cx="26" cy="82"  r="8" fill="currentColor" opacity="0.7" />
      <circle cx="12" cy="38"  r="8" fill="currentColor" opacity="0.85" />
      {/* Connecting lines */}
      <polygon
        points="50,12 88,38 74,82 26,82 12,38"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
        fill="none"
      />
    </svg>
  );
}

export function QuorumWordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <QuorumMark size={26} />
      <span className="wordmark tracking-widest text-base">QUORUM</span>
    </span>
  );
}
