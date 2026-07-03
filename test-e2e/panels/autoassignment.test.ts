import { expect, test } from '@playwright/test';

import NmriumPage from '../NmriumPage/index.js';

test('automatic assignment panel', async ({ page }) => {
  // Depends on an external assignment web service — triple the timeout.
  test.slow();
  const nmrium = await NmriumPage.create(page);
  await test.step('open 1H ethylvinylether spectrum', async () => {
    await nmrium.openSample('./data/ethylvinylether/1h.json');
    await expect(nmrium.page.locator('#nmrSVG')).toBeVisible();
  });
  await test.step('activate automatic assignment panel', async () => {
    await nmrium.page.click('_react=ToolbarItem[id="general-settings"]');
    await nmrium.page.getByRole('tablist').locator('text=Panels').click();

    //change panel status to active (displays the panel in the accordion panels and the right bar )
    await nmrium.changePanelStatus('Automatic assignment', 'active');

    await nmrium.saveWorkspaceModal('test');
  });
  await test.step('check automatic assignment panel', async () => {
    await nmrium.clickPanel('Automatic assignment');
    // Click on the automatic ranges button.
    await nmrium.page.click(
      '_react=AutomaticAssignment >> _react=SpectraAutomaticPickingButton',
    );

    // Wait for auto range to be applied.
    await expect(nmrium.page.locator('_react=Range')).toHaveCount(5);

    await nmrium.getToolbarLocatorByTitle('Automatic assignment').click();

    // The automatic assignment runs through an external web service; give
    // it generous time on slow CI runners.
    await expect(
      nmrium.page.locator('_react=AutomaticAssignmentTable >> text=0.75'),
    ).toHaveCount(2, { timeout: 90 * 1000 });
  });
});
