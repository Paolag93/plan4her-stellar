import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  expect: {
    toHaveScreenshot: {
      // Figma and Chromium rasterize glyph edges differently.
      // Keep geometry exact; allow only a small global rasterization delta.
      maxDiffPixelRatio: 0.025,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Optional override for sandboxes whose preinstalled Chromium differs from the pinned Playwright build.
    ...(process.env.PW_CHROMIUM_EXECUTABLE ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_EXECUTABLE } } : {})
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1',
    port: 4173,
    reuseExistingServer: true
  },
  projects: [{ name: 'mobile-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }]
})
