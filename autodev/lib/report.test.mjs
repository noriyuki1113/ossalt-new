import test from "node:test";
import assert from "node:assert/strict";
import { extractFailures, renderFailureMarkdown, statsOf } from "./report.mjs";

const sample = {
  stats: { expected: 1, unexpected: 1, flaky: 0, skipped: 0 },
  suites: [
    {
      title: "tools.spec.ts", file: "tools.spec.ts",
      suites: [
        {
          title: "OSS一覧の検索と絞り込み", file: "tools.spec.ts",
          specs: [
            { title: "OK", file: "tools.spec.ts", line: 4, tests: [{ projectName: "desktop", status: "expected", results: [{}] }] },
            {
              title: "キーワードで絞り込める", file: "tools.spec.ts", line: 10,
              tests: [{
                projectName: "mobile", status: "unexpected",
                annotations: [{ type: "url", description: "http://127.0.0.1:4173/tools/" }, { type: "problem", description: "pageerror: boom" }],
                results: [{ errors: [{ message: "\x1b[31mexpected 1\x1b[39m" }], attachments: [{ name: "screenshot", path: "/r/s.png" }, { name: "trace", path: "/r/t.zip" }] }],
              }],
            },
          ],
        },
      ],
    },
  ],
};

test("失敗だけを、再現情報つきで取り出す", () => {
  const f = extractFailures(sample);
  assert.equal(f.length, 1);
  assert.equal(f[0].project, "mobile");
  assert.equal(f[0].url, "http://127.0.0.1:4173/tools/");
  assert.equal(f[0].screenshot, "/r/s.png");
  assert.deepEqual(f[0].consoleProblems, ["pageerror: boom"]);
  assert.match(f[0].error, /^expected 1$/);
  assert.match(f[0].reproduce, /tools\.spec\.ts:10 --project=mobile/);
  assert.match(f[0].title, /OSS一覧の検索と絞り込み › キーワードで絞り込める/);
});

test("Markdown と集計", () => {
  const md = renderFailureMarkdown(extractFailures(sample));
  assert.match(md, /対象URL: http:\/\/127\.0\.0\.1:4173\/tools\//);
  assert.match(md, /スクリーンショット: \/r\/s\.png/);
  assert.equal(renderFailureMarkdown([]), "失敗はありません。\n");
  assert.deepEqual(statsOf(sample), { passed: 1, failed: 1, flaky: 0, skipped: 0 });
});
