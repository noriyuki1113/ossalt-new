import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SERVER_INFO } from "../src/core.mjs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));

test("server.json：バージョンが package.json・サーバー本体と一致し、説明が100文字以内", () => {
  const manifest = read("../server.json");
  const pkg = read("../package.json");
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.version, SERVER_INFO.version);
  assert.ok(manifest.description.length <= 100, `説明が${manifest.description.length}文字`);
  assert.match(manifest.name, /^[a-z0-9.-]+\/[a-zA-Z0-9._-]+$/);
});

test("server.json：公開するURLは ossalt.jp のもので、運営者のアカウント名を含まない", () => {
  const text = readFileSync(new URL("../server.json", import.meta.url), "utf8");
  assert.doesNotMatch(text, /noriyuki|github\.com|workers\.dev/i);
  for (const r of read("../server.json").remotes) assert.match(r.url, /^https:\/\/mcp\.ossalt\.jp\//);
});
