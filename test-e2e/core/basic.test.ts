import { expect, test } from '@playwright/test';

import NmriumPage from '../NmriumPage/index.js';

test('should load and display the 1D and 2D spectrum', async ({ page }) => {
  const nmrium = await NmriumPage.create(page);
  expect(await nmrium.page.title()).toBe('PsiNMR');

  await nmrium.openSample('./data/ethylbenzene/full.json');

  //switch to 1d
  await nmrium.page.click('_react=Tab[tabid="1H"]');

  const path = (await nmrium.page.getAttribute(
    '#nmrSVG path.line ',
    'd',
  )) as string;
  expect(path.length).toBeGreaterThan(1000);
  expect(path).not.toContain('NaN');

  //switch to 2d
  await nmrium.page.click('_react=Tab[tabid="1H,1H"]');

  const spectrumLineLocator = nmrium.page.getByTestId('spectrum-line').nth(0);

  await expect(spectrumLineLocator).toBeVisible();
});

// The upstream "check callbacks count" test exercised the old demo shell's
// debug callback counters, which no longer exist in the PsiNMR app.
