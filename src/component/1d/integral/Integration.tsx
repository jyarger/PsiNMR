import { useActiveSpectrumIntegralsViewState } from '../../hooks/useActiveSpectrumIntegralsViewState.js';
import useIntegralPath from '../../hooks/useIntegralPath.js';
import { usePanelPreferences } from '../../hooks/usePanelPreferences.js';

import IntegralResizable from './IntegralResizable.js';
import type { IntegralData } from './IntegralsSeries.js';

interface IntegralProps {
  integral: IntegralData;
  nucleus: string;
  max: number;
  from: number;
  to: number;
}

export function Integration(props: IntegralProps) {
  const { integral, nucleus, max, from, to } = props;
  const { x, y } = integral;
  const { scaleRatio } = useActiveSpectrumIntegralsViewState();
  const path = useIntegralPath({ x, y, max, scaleRatio, from, to });
  const { showIntegralsValues } = useActiveSpectrumIntegralsViewState();
  const integralPreferences = usePanelPreferences('integrals', nucleus);

  // The stored default is black; map it to the themed plot foreground so
  // integrals stay visible on the dark theme. Custom colors are kept as-is.
  const integralColor =
    integralPreferences.color === '#000000'
      ? 'var(--psi-plot-fg, #000000)'
      : integralPreferences.color;

  return (
    <g>
      <path
        className="line"
        stroke={integralColor}
        strokeWidth={integralPreferences.strokeWidth}
        fill="none"
        d={path}
      />

      {showIntegralsValues && (
        <IntegralResizable
          integralData={integral}
          integralFormat={integralPreferences.relative.format}
        />
      )}
    </g>
  );
}
