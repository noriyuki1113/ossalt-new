import fs from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * ブラウザテスト（既存の `npm test` とは別。ビルド済みの out/ を localhost で配信して検証する）。
 *   npm run build && npm run test:e2e
 * 本番サイトには接続しない。外部への通信は e2e/fixtures.ts で遮断する。
 * 失敗時はスクリーンショット・トレース・動画を test-results/ に残す（CI では成果物としてアップロード）。
 */
const PORT = Number(process.env.E2E_PORT || 4173);
// 計測（PostHog）のE2E用ビルド（scripts/build-analytics-e2e.mjs）。ある場合だけ、別ポートで配信する
const ANALYTICS_PORT = Number(process.env.E2E_ANALYTICS_PORT || 4174);
const ANALYTICS_DIR = "out-analytics-e2e";
const hasAnalyticsBuild = fs.existsSync(ANALYTICS_DIR);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  // 巡回（sweep）は E2E_SWEEP=1 のときだけ。通常のCIでは動かさない
  testIgnore: process.env.E2E_SWEEP ? [] : [/sweep\.spec\.ts/],
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
    {
      name: "analytics",
      testDir: "./e2e-analytics",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, baseURL: `http://127.0.0.1:${ANALYTICS_PORT}` },
    },
  ],
  webServer: [
    {
      command: `node e2e/serve.mjs ${PORT}`,
      url: `http://127.0.0.1:${PORT}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    ...(hasAnalyticsBuild
      ? [{
          command: `node e2e/serve.mjs ${ANALYTICS_PORT} ${ANALYTICS_DIR}`,
          url: `http://127.0.0.1:${ANALYTICS_PORT}/`,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        }]
      : []),
  ],
});
