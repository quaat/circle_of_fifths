import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Core selection must also work when external fonts/styles are unavailable.
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Expand', exact: true }).click();
});
test('navigates keys and shares mode with the detail panel', async ({ page }) => {
  await page.getByRole('button', { name: 'Collapse', exact: true }).click();
  await page.getByRole('button', { name: 'Next key on the circle' }).click();
  await expect(page.getByRole('status')).toHaveText('Selected key: G major');
  await page.getByRole('button', { name: 'G major', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('status')).toHaveText('Selected key: D major');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('status')).toHaveText('Selected key: G major');
  await page.getByRole('button', { name: 'minor', exact: true }).click();
  await page.getByRole('button', { name: 'Expand', exact: true }).click();
  await expect(page.getByText('Progressions in Em', { exact: true })).toBeVisible();
});
test('selects a minor key by tapping its ring', async ({ page }) => {
  await page.getByRole('button', { name: 'Collapse', exact: true }).click();
  // Test actual SVG hit testing, without a synthetic click handler.
  await page.getByRole('button', { name: 'A minor', exact: true }).click();
  await page.getByRole('button', { name: 'Expand', exact: true }).click();
  await expect(page.getByText('Progressions in Am', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'minor', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
