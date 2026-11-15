import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    actionTimeout: 10000,
    baseURL: 'http://127.0.0.1:3100',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: [{
    command: 'npm run dev -- --port 3100 --strictPort',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
  }, {
    command: 'npm run build -- --base=/circle_of_fifths/ && npm run preview -- --base=/circle_of_fifths/ --port 3102 --strictPort',
    url: 'http://127.0.0.1:3102/circle_of_fifths/',
    reuseExistingServer: !process.env.CI,
  }],
});
