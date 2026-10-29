import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const srcDir = join(root, "src");
const targetExtensions = /\.(?:js|jsx|mjs|ts|tsx|css|scss|html)$/i;

async function* sourceFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(file);
    else if (entry.isFile() && targetExtensions.test(entry.name)) yield file;
  }
}

test("site never references Google-hosted font stylesheets or font files", async () => {
  const offending = [];
  for await (const file of sourceFiles(srcDir)) {
    const source = await readFile(file, "utf8");
    if (/fonts\.(?:googleapis|gstatic)\.com/i.test(source)) {
      offending.push(relative(root, file));
    }
  }
  assert.deepEqual(offending, [], `Remote Google Fonts detected in: ${offending.join(", ")}`);
  const layout = await readFile(join(srcDir, "app/layout.tsx"), "utf8");
  assert.match(layout, /from "next\/font\/google"/, "Use build-time self-hosted fonts");
});

test("no session replay SDK has been introduced without an audit", async () => {
  const offending = [];
  // posthog-js は、同意制のアクセス分析として src/lib/posthog/client.ts だけが読み込む（録画は下のテストで無効を確認）
  const replaySdk = /(?:from\s*|import\s*\(|require\s*\()\s*["'](?:@fullstory\/|@sentry\/replay|@hotjar\/|rrweb|react-hotjar)/i;
  const replayScript = /(?:src\s*=\s*["'][^"']*(?:hotjar\.com|fullstory\.com|clarity\.ms|static\.hotjar\.com))/i;
  for await (const file of sourceFiles(srcDir)) {
    const source = await readFile(file, "utf8");
    if (replaySdk.test(source) || replayScript.test(source)) {
      offending.push(relative(root, file));
    }
  }
  assert.deepEqual(offending, [], `Session replay implementation needs privacy approval: ${offending.join(", ")}`);
});

test("PostHog はセッション録画を無効にしている。posthog-js の読み込みは同意制のクライアント1か所だけ", async () => {
  const importers = [];
  for await (const file of sourceFiles(srcDir)) {
    const source = await readFile(file, "utf8");
    if (/["']posthog-js["']/.test(source) && !file.endsWith(".test.ts")) importers.push(relative(root, file));
  }
  assert.deepEqual(importers, ["src/lib/posthog/client.ts"]);
  const client = await readFile(join(srcDir, "lib/posthog/client.ts"), "utf8");
  assert.match(client, /disable_session_recording:\s*true/);
});
