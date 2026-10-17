import { defineConfig, devices } from "@playwright/test";

/**
 * ブラウザテスト（既存の `npm test` とは別。ビルド済みの out/ を localhost で配信して検証する）。
 *   npm run build && npm run test:e2e
 * 本番サイトには接続しない。外部への通信は e2e/fixtures.ts で遮断する。
 * 失敗時はスクリーンショット・トレース・動画を test-results/ に残す（CI では成果物としてアップロード）。
 */
const PORT = Number(process.env.E2E_PORT || 4173);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  outputDir: "test-results/artifacts",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `node e2e/serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
