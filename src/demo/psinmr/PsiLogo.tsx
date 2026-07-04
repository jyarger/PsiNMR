import { css, keyframes } from '@emotion/react';
import styled from '@emotion/styled';

type SpinMode = 'intro' | 'loading' | false;
type Wordmark = 'psinmr' | 'greek' | 'ket' | 'ketmark';

interface PsiLogoProps {
  size?: number;
  showWordmark?: boolean;
  onChrome?: boolean;
  wordmark?: Wordmark;
  spin?: SpinMode;
}

// A few fast turns that ease to a stop — used on first paint.
const introSpin = keyframes`
  from { transform: rotateY(0deg); }
  to { transform: rotateY(1440deg); }
`;

// One continuous turn — used as a loading indicator.
const loadingSpin = keyframes`
  from { transform: rotateY(0deg); }
  to { transform: rotateY(360deg); }
`;

const MarkStage = styled.span<{ $size: number }>`
  display: inline-block;
  perspective: ${({ $size }) => $size * 6}px;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
`;

const MarkSvg = styled.svg<{ $spin: SpinMode }>`
  transform-style: preserve-3d;
  ${({ $spin }) =>
    $spin === 'intro'
      ? css`
          animation: ${introSpin} 1.8s cubic-bezier(0.25, 0.9, 0.25, 1) 1;
        `
      : $spin === 'loading'
        ? css`
            animation: ${loadingSpin} 1s linear infinite;
          `
        : undefined}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

interface PsiMarkProps {
  size?: number;
  spin?: SpinMode;
}

/**
 * The Ψ mark used across the Psi scientific-data family. Optionally spins
 * about its vertical axis: `intro` for a few turns on load, `loading` for
 * a continuous indicator. Respects prefers-reduced-motion.
 */
export function PsiMark({ size = 28, spin = false }: PsiMarkProps) {
  return (
    <MarkStage $size={size}>
      <MarkSvg
        $spin={spin}
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
      </MarkSvg>
    </MarkStage>
  );
}

function WordmarkText({
  variant,
  accent,
  base,
}: {
  variant: Wordmark;
  accent: string;
  base: string;
}) {
  if (variant === 'greek') {
    return (
      <>
        <span style={{ color: base }}>Ψ</span>
        <span style={{ color: accent }}>NMR</span>
      </>
    );
  }
  if (variant === 'ket') {
    // Dirac ket notation Ψ|NMR⟩, common in NMR spin-dynamics.
    return (
      <>
        <span style={{ color: base }}>Ψ|</span>
        <span style={{ color: accent }}>NMR</span>
        <span style={{ color: base }}>⟩</span>
      </>
    );
  }
  if (variant === 'ketmark') {
    // Pairs with the Ψ mark to read Ψ|NMR⟩ (the icon supplies the Ψ).
    return (
      <>
        <span style={{ color: base }}>|</span>
        <span style={{ color: accent }}>NMR</span>
        <span style={{ color: base }}>⟩</span>
      </>
    );
  }
  return (
    <>
      <span style={{ color: base }}>Psi</span>
      <span style={{ color: accent }}>NMR</span>
    </>
  );
}

export default function PsiLogo(props: PsiLogoProps) {
  const {
    size = 28,
    showWordmark = true,
    onChrome = true,
    wordmark = 'psinmr',
    spin = false,
  } = props;
  const base = onChrome ? 'var(--psi-text-on-chrome)' : 'var(--psi-text)';
  const accent = onChrome ? 'var(--psi-accent-on-chrome)' : 'var(--psi-accent)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5em',
        userSelect: 'none',
      }}
    >
      <PsiMark size={size} spin={spin} />
      {showWordmark && (
        <span
          style={{
            fontSize: size * 0.62,
            fontWeight: 650,
            letterSpacing: '0.01em',
          }}
        >
          <WordmarkText variant={wordmark} accent={accent} base={base} />
        </span>
      )}
    </span>
  );
}
