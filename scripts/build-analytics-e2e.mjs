#!/usr/bin/env node
/**
 * 計測（PostHog）のE2E用に、テスト専用のトークン・ホストを埋め込んだビルドを out-analytics-e2e/ に作る。
 * 通常の out/ は退避して戻す（通常のE2Eには、同意バナーが出るビルドを混ぜない）。
 *
 *   node scripts/build-analytics-e2e.mjs   →   npm run test:e2e:analytics
 *
 * トークンは「phc_」の形をしたダミー。実際のPostHogには接続しない（ホストは localhost のモック）。
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "out");
const keep = path.join(root, "out.keep-analytics-e2e");
const dest = path.join(root, "out-analytics-e2e");

fs.rmSync(dest, { recursive: true, force: true });
fs.rmSync(keep, { recursive: true, force: true });
const hadOut = fs.existsSync(out);
if (hadOut) fs.renameSync(out, keep);
try {
  execFileSync("npx", ["next", "build"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_e2etesttoken123",
      NEXT_PUBLIC_POSTHOG_HOST: "http://127.0.0.1:4599",
      NEXT_PUBLIC_POSTHOG_ALLOWED_HOSTS: "127.0.0.1,localhost",
      NEXT_PUBLIC_POSTHOG_ALLOW_AUTOMATION: "1", // Playwright（自動操作）のイベントも、このテストビルドでは送る
    },
  });
  fs.renameSync(out, dest);
} finally {
  fs.rmSync(out, { recursive: true, force: true });
  if (hadOut) fs.renameSync(keep, out);
}
console.log(`計測E2E用のビルド: ${path.relative(root, dest)}/`);
