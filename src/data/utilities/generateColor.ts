// PsiNMR default spectrum palettes. The active one follows the app theme
// (data-psi-theme on <html>): on the dark plot background spectra start
// with white and the Psi teal/blue accents; on white they start with
// stronger hues that survive publication-style rendering.
const COLORS_DARK: string[] = [
  '#FFFFFF', // white
  '#5FB3A7', // Psi teal
  '#64B5F6', // light blue
  '#FFD54F', // amber
  '#F06292', // pink
  '#AED581', // lime
  '#4DD0E1', // cyan
  '#FF8A65', // orange
  '#BA68C8', // purple
  '#FFF176', // yellow
  '#90CAF9', // pale blue
  '#81C784', // green
  '#FFB74D', // light orange
  '#E57373', // soft red
  '#7986CB', // indigo
  '#4DB6AC', // teal
  '#DCE775', // chartreuse
  '#F48FB1', // rose
  '#9575CD', // violet
  '#A1887F', // warm gray
];

const COLORS_LIGHT: string[] = [
  '#FF5C5C', // red
  '#4DD0E1', // cyan
  '#FFD54F', // amber
  '#81C784', // green
  '#64B5F6', // blue
  '#FF8A65', // orange
  '#BA68C8', // purple
  '#F06292', // pink
  '#AED581', // lime
  '#4DB6AC', // teal
  '#FFB74D', // light orange
  '#7986CB', // indigo
  '#E57373', // soft red
  '#4FC3F7', // sky
  '#FFF176', // yellow
  '#9575CD', // violet
  '#A1887F', // warm gray
  '#90CAF9', // pale blue
  '#DCE775', // chartreuse
  '#F48FB1', // rose
];

/**
 * Palette matching the active PsiNMR theme. Falls back to the light
 * palette outside a browser (tests, SSR).
 */
export function getSpectraPalette(): string[] {
  if (
    typeof document !== 'undefined' &&
    document.documentElement.dataset.psiTheme === 'dark'
  ) {
    return COLORS_DARK;
  }
  return COLORS_LIGHT;
}

function percentToHex(p: number): string {
  const percent = Math.max(0, Math.min(100, p));
  const intValue = Math.round((percent / 100) * 255);
  const hexValue = intValue.toString(16);
  return percent === 100 ? '' : hexValue.padStart(2, '0');
}

export function adjustAlpha(color: string, factor: number): string {
  return color + percentToHex(factor);
}

interface Options {
  isRandom?: boolean;
  usedColors?: string[];
  opacity?: number;
}

export function generateColor(options: Options) {
  const { isRandom = false, usedColors = [], opacity = 100 } = options;

  if (opacity > 100 || opacity < 0) {
    throw new Error(`Opacity value must be within the range of 0 to 100`);
  }

  const palette = getSpectraPalette();
  const resetColors = palette.filter((c) => !usedColors.includes(c));
  if (resetColors.length > 0 && !isRandom) {
    return resetColors[0] + percentToHex(opacity);
  } else {
    const lum = -0.25;
    let hex =
      `#${Math.random().toString(16).slice(2, 8).toUpperCase()}`.replaceAll(
        /[^\da-f]/gi,
        '',
      );
    if (hex.length < 6) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    let rgb = '#';
    let c: number | string;
    for (let i = 0; i < 3; i++) {
      c = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      c = Math.round(Math.min(Math.max(0, c + c * lum), 255)).toString(16);
      rgb += `00${c}`.slice(c.length);
    }

    return rgb + percentToHex(opacity);
  }
}
