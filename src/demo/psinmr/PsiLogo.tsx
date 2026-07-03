interface PsiLogoProps {
  size?: number;
  showWordmark?: boolean;
  onChrome?: boolean;
}

/**
 * The Ψ mark used across the Psi scientific-data family.
 * `onChrome` picks colors that read well on the dark chrome surfaces.
 */
export function PsiMark({ size = 28 }: Pick<PsiLogoProps, 'size'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="var(--psi-chrome-raised)" />
      <text
        x="32"
        y="46"
        fontFamily="var(--psi-font-serif)"
        fontSize="42"
        fontWeight="bold"
        textAnchor="middle"
        fill="var(--psi-accent-on-chrome)"
      >
        Ψ
      </text>
    </svg>
  );
}

export default function PsiLogo(props: PsiLogoProps) {
  const { size = 28, showWordmark = true, onChrome = true } = props;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5em',
        userSelect: 'none',
      }}
    >
      <PsiMark size={size} />
      {showWordmark && (
        <span
          style={{
            fontSize: size * 0.62,
            fontWeight: 650,
            letterSpacing: '0.01em',
            color: onChrome ? 'var(--psi-text-on-chrome)' : 'var(--psi-text)',
          }}
        >
          Psi
          <span
            style={{
              color: onChrome
                ? 'var(--psi-accent-on-chrome)'
                : 'var(--psi-accent)',
            }}
          >
            NMR
          </span>
        </span>
      )}
    </span>
  );
}
