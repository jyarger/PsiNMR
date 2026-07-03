import type {
  Color2D,
  Spectrum2D,
  SpectrumTwoDimensionsColor,
} from '@zakodium/nmrium-core';

import type { UsedColors } from '../../../types/UsedColors.js';
import { adjustAlpha, generateColor } from '../../utilities/generateColor.js';
import { getCustomColor } from '../../utilities/getCustomColor.js';

interface BaseColorOptions {
  usedColors?: UsedColors;
  colors?: SpectrumTwoDimensionsColor[];
}

interface ColorOptions extends BaseColorOptions {
  regenerate?: false;
}
interface RandomColorOptions extends BaseColorOptions {
  regenerate: true;
  random?: boolean;
}

function isRandomColorGeneration(
  options: ColorOptions | RandomColorOptions,
): options is RandomColorOptions {
  return 'random' in options;
}

export function get2DColor(
  spectrum: Spectrum2D,
  options: ColorOptions | RandomColorOptions,
): Color2D {
  let color: Partial<Color2D>;
  if (
    spectrum?.display?.negativeColor === undefined ||
    spectrum?.display?.positiveColor === undefined ||
    options.regenerate
  ) {
    const isRandom = isRandomColorGeneration(options) && options.random;
    const customColor =
      getCustomColor(spectrum, options.colors) ||
      (spectrum.info.experiment
        ? ((color2D as any)?.[spectrum.info.experiment] ?? null)
        : null);

    if (customColor && !isRandom) {
      color = customColor;
    } else {
      const positiveColor = generateColor({
        usedColors: options.usedColors?.['2d'] || [],
      });
      const negativeColor = adjustAlpha(positiveColor, 50);
      color = { positiveColor, negativeColor };
    }
  } else {
    const { positiveColor = 'red', negativeColor = 'blue' } =
      spectrum?.display || {};
    color = { positiveColor, negativeColor };
  }
  if (options.usedColors?.['2d'] && color.positiveColor) {
    options.usedColors['2d'].push(color.positiveColor);
  }

  return {
    positiveColor: color.positiveColor ?? '',
    negativeColor: color.negativeColor ?? '',
  };
}

type ExperimentType = 'cosy' | 'roesy' | 'noesy' | 'tocsy' | 'hsqc' | 'hmbc';

// PsiNMR 2D contour colors: bright positive/negative pairs with strong
// mutual contrast, readable on the dark plot background and on white.
export const color2D: Readonly<Record<ExperimentType, Color2D>> = {
  cosy: { positiveColor: '#64B5F6', negativeColor: '#FF5C5C' },
  roesy: { positiveColor: '#F06292', negativeColor: '#FFD54F' },
  noesy: { positiveColor: '#F06292', negativeColor: '#FFD54F' },
  tocsy: { positiveColor: '#81C784', negativeColor: '#FFD54F' },
  hsqc: { positiveColor: '#4DD0E1', negativeColor: '#FF8A65' },
  hmbc: { positiveColor: '#BA68C8', negativeColor: '#FFD54F' },
};
