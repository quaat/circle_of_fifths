import { expect, test } from '@playwright/test';
for (const url of ['http://127.0.0.1:3100/', 'http://127.0.0.1:3102/circle_of_fifths/']) {
  test(`loads styled app without external CDNs: ${url}`, async ({ page }) => {
    const external: string[] = [];
    const failedAssets: string[] = [];
    page.on('response', response => { if (response.status() >= 400) failedAssets.push(response.url()); });
    await page.route(/^https:\/\//, route => { external.push(route.request().url()); return route.abort(); });
    await page.goto(url);
    await expect(page.getByRole('heading', { name: 'Circle of Fifths', exact: true })).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 23, 42)');
    await expect(page.getByRole('button', { name: 'Next key on the circle' })).toHaveCSS('padding', '12px');
    await page.getByRole('button', { name: 'Next key on the circle' }).click();
    await page.getByRole('button', { name: 'Expand', exact: true }).click();
    await expect(page.getByText('Progressions in G', { exact: true })).toBeVisible();
    expect(external).toEqual([]);
    expect(failedAssets).toEqual([]);
  });
}
