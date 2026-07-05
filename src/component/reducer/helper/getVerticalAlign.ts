import type { Draft } from 'immer';

import type { State, VerticalAlignment } from '../Reducer.js';

export function getVerticalAlign(
  state: State | Draft<State>,
  defaultAlign: VerticalAlignment = 'bottom',
): VerticalAlignment {
  const {
    view: {
      verticalAlign,
      spectra: { activeTab },
    },
  } = state;

  return verticalAlign?.[activeTab] || defaultAlign;
}

// Both 'stack' and PsiNMR's 'skyline' spread the spectra out (vertically, and
// for skyline also horizontally), so display logic that asks "is this stacked?"
// should treat them the same.
export function isStackedAlign(align: VerticalAlignment): boolean {
  return align === 'stack' || align === 'skyline';
}
