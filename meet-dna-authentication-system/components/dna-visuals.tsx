export function DnaLogo({
  className,
  color = '#00ff88',
}: {
  className?: string
  color?: string
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M9 3c0 6 14 8 14 13S9 23 9 29" />
      <path d="M23 3c0 6-14 8-14 13s14 7 14 13" />
      <line x1="10.5" y1="7" x2="21.5" y2="7" />
      <line x1="12.5" y1="11" x2="19.5" y2="11" />
      <line x1="12.5" y1="21" x2="19.5" y2="21" />
      <line x1="10.5" y1="25" x2="21.5" y2="25" />
    </svg>
  )
}

export function DnaSpinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className ?? ''}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5 helix-spin"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      >
        <path d="M7 2c0 4.5 10 6 10 10S7 18 7 22" />
        <path d="M17 2c0 4.5-10 6-10 10s10 5.5 10 10" />
      </svg>
    </span>
  )
}

/** Animated double-helix lines used in the branding panel + watermark */
export function HelixLines({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 600"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, i) => {
        const y = i * 100
        return (
          <g key={i}>
            <path d={`M20 ${y} C 100 ${y + 25}, 100 ${y + 75}, 20 ${y + 100}`} />
            <path
              d={`M100 ${y} C 20 ${y + 25}, 20 ${y + 75}, 100 ${y + 100}`}
            />
            <line x1="35" y1={y + 20} x2="85" y2={y + 20} strokeWidth={1.2} />
            <line x1="42" y1={y + 50} x2="78" y2={y + 50} strokeWidth={1.2} />
            <line x1="35" y1={y + 80} x2="85" y2={y + 80} strokeWidth={1.2} />
          </g>
        )
      })}
    </svg>
  )
}
