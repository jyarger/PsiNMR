import { usePreferences } from '../context/PreferencesContext.tsx';
import { workspaceDefaultProperties } from '../workspaces/workspaceDefaultProperties.ts';

// gridlines1D and gridlines2D share the same shape.
type Gridlines = typeof workspaceDefaultProperties.axis.gridlines1D;

// The stored default stroke is black; map it to the themed grid color so
// gridlines stay visible on the dark theme. Custom colors are kept as-is.
function themeGridlines<T extends Gridlines>(gridlines: T): T {
  const result = structuredClone(gridlines);
  for (const level of ['primary', 'secondary'] as const) {
    if (result[level].lineStyle.stroke === '#000000') {
      result[level].lineStyle.stroke = 'var(--psi-plot-grid, #000000)';
    }
  }
  return result;
}

export function useGridline1DConfig() {
  const preferences = usePreferences();
  const { current } = preferences;
  const axis = current.axis ?? workspaceDefaultProperties.axis;

  return themeGridlines(axis.gridlines1D);
}

export function useGridline2DConfig() {
  const preferences = usePreferences();
  const { current } = preferences;
  const axis = current.axis ?? workspaceDefaultProperties.axis;

  return themeGridlines(axis.gridlines2D);
}
