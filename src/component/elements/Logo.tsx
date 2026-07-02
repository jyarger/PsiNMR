interface LogoProps {
  width?: number;
  height?: number;
}

export default function Logo({ width = 100, height = 100 }: LogoProps) {
  return (
    <svg
      style={{ width, height }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 100"
    >
      <rect x="10" y="18" width="64" height="64" rx="14" fill="#232a33" />
      <text
        x="42"
        y="64"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="42"
        fontWeight="bold"
        textAnchor="middle"
        fill="#5fb3a7"
      >
        Ψ
      </text>
      <text
        x="88"
        y="64"
        fontFamily="Inter, -apple-system, sans-serif"
        fontSize="40"
        fontWeight="650"
        fill="#2b3440"
      >
        Psi
      </text>
      <text
        x="148"
        y="64"
        fontFamily="Inter, -apple-system, sans-serif"
        fontSize="40"
        fontWeight="650"
        fill="#3d8f85"
      >
        NMR
      </text>
    </svg>
  );
}
