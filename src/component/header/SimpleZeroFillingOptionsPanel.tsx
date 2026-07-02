import { useFilter } from '../hooks/useFilter.js';
import { getDefaultFilterOptions } from '../utility/getDefaultFilterOptions.js';

import { BaseSimpleZeroFillingOptionsPanel } from './base/BaseSimpleZeroFillingOptionsPanel.js';

const defaultOptions = getDefaultFilterOptions('zeroFilling');

export function SimpleZeroFillingOptionsPanel() {
  const filter = useFilter('zeroFilling');

  return (
    <BaseSimpleZeroFillingOptionsPanel filter={filter || defaultOptions} />
  );
}
