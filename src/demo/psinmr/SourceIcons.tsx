interface IconProps {
  size?: number;
}

/**
 * nmrXiv mark: a central dot encircled by two rotating arrows —
 * evokes the repository's "open, cycling data" logo.
 */
export function NmrXivIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      >
        {/* Top arc + arrowhead */}
        <path d="M18.5 8.5 A7.5 7.5 0 0 0 5 6.5" />
        <path d="M5.2 3.4 L4.6 6.9 L8 6.6" strokeLinejoin="round" />
        {/* Bottom arc + arrowhead */}
        <path d="M5.5 15.5 A7.5 7.5 0 0 0 19 17.5" />
        <path d="M18.8 20.6 L19.4 17.1 L16 17.4" strokeLinejoin="round" />
      </g>
      <circle cx="12" cy="12" r="3.1" fill="currentColor" />
    </svg>
  );
}

/**
 * BMRB mark: a green double helix, the databank's biomolecular-NMR motif.
 */
export function BmrbIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="#4caf50" strokeWidth="1.8" strokeLinecap="round" fill="none">
        {/* Two intertwined strands */}
        <path d="M8 3 C 16 7, 8 11, 16 15 C 8 19, 16 21, 16 21" />
        <path d="M16 3 C 8 7, 16 11, 8 15 C 16 19, 8 21, 8 21" />
        {/* Base-pair rungs */}
        <path d="M9.2 5.2 L14.8 5.2" strokeWidth="1.3" />
        <path d="M9.2 9 L14.8 9" strokeWidth="1.3" />
        <path d="M9.2 15 L14.8 15" strokeWidth="1.3" />
        <path d="M9.2 18.8 L14.8 18.8" strokeWidth="1.3" />
      </g>
    </svg>
  );
}
