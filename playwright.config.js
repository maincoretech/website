import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', locale: 'zh-CN' },
  webServer: { command: 'bun run preview --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_USE_CHROME ? 'chrome' : undefined } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], locale: 'zh-CN', channel: process.env.PW_USE_CHROME ? 'chrome' : undefined } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], locale: 'zh-CN' } }
  ]
});
