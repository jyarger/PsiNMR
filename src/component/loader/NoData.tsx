import type { CSSProperties, ReactNode } from 'react';

import { useLoader } from '../context/LoaderContext.js';
import { useCheckToolsVisibility } from '../hooks/useCheckToolsVisibility.js';

const styles: Record<'container' | 'text', CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'column',
    userSelect: 'none',
    width: '100%',
    height: '100%',
    outline: '3px dashed var(--psi-plot-grid, rgba(0, 0, 0, 0.3))',
    outlineOffset: '-14px',
    paddingLeft: '20px',
    paddingRight: '20px',
  },
  text: {
    padding: '15px 30px',
    backgroundColor: 'var(--psi-accent, #3d8f85)',
    borderRadius: 'var(--psi-radius, 8px)',
    color: '#fff',
    fontFamily:
      "var(--psi-font, 'Inter', -apple-system, 'Segoe UI', sans-serif)",
    fontSize: 'large',
    fontWeight: 600,
    textAlign: 'center',
    maxWidth: '520px',
    lineHeight: 1.5,
  },
};

interface NoDataProps {
  isEmpty?: boolean;
  canOpenLoader?: boolean;
  emptyText?: ReactNode;
  style?: CSSProperties;
}

function NoData({
  isEmpty = true,
  emptyText = 'Bruker, Varian, Jeol, or general JCAMP-DX and NMRium Datasets Supported',
  canOpenLoader = true,
  style,
}: NoDataProps) {
  const openLoader = useLoader();
  const isToolEnabled = useCheckToolsVisibility();

  if (!isEmpty) {
    return null;
  }

  return (
    <div
      style={{ ...styles.container, ...style }}
      {...(canOpenLoader && { onClick: openLoader })}
    >
      <div style={styles.text}>
        {isToolEnabled('import')
          ? emptyText
          : 'Importation feature has been disabled'}
      </div>
    </div>
  );
}

export default NoData;
