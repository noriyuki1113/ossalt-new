/**
 * Playwright の JSON レポートから、Coding Agent に渡す「再現手順つきの失敗レポート」を作る。
 * （純粋関数。ファイルの読み書きは qa.mjs）
 */

function* walkSuites(suites, parents = []) {
  for (const s of suites ?? []) {
    const titles = s.title && !s.file?.endsWith(s.title) ? [...parents, s.title] : parents;
    for (const spec of s.specs ?? []) yield { spec, titles };
    yield* walkSuites(s.suites, titles);
  }
}

export function extractFailures(json) {
  const failures = [];
  for (const { spec, titles } of walkSuites(json.suites)) {
    for (const test of spec.tests ?? []) {
      if (test.status === "expected" || test.status === "skipped") continue;
      const results = test.results ?? [];
      const last = results[results.length - 1] ?? {};
      const att = (name) => (last.attachments ?? []).find((a) => a.name === name)?.path ?? null;
      const ann = (type) => (test.annotations ?? []).filter((a) => a.type === type).map((a) => a.description);
      const err = (last.errors?.[0]?.message ?? last.error?.message ?? "").replace(/\x1b\[[0-9;]*m/g, "");
      failures.push({
        title: [...titles, spec.title].join(" › "),
        project: test.projectName,
        file: spec.file,
        line: spec.line,
        flaky: test.status === "flaky",
        url: ann("url").pop() ?? null,
        error: err.slice(0, 1500),
        consoleProblems: ann("problem"),
        screenshot: att("screenshot"),
        trace: att("trace"),
        video: att("video"),
        reproduce: `npm run build && npx playwright test ${spec.file}:${spec.line} --project=${test.projectName}`,
      });
    }
  }
  return failures;
}

export function renderFailureMarkdown(failures) {
  if (failures.length === 0) return "失敗はありません。\n";
  return failures
    .map((f, i) =>
      [
        `### ${i + 1}. ${f.title}（${f.project}${f.flaky ? "・不安定" : ""}）`,
        `- 対象URL: ${f.url ?? "（不明）"}`,
        `- 再現: \`${f.reproduce}\``,
        f.consoleProblems.length ? `- 検出したJSエラー:\n${f.consoleProblems.map((p) => `  - ${p}`).join("\n")}` : null,
        `- エラー:\n\`\`\`\n${f.error}\n\`\`\``,
        f.screenshot ? `- スクリーンショット: ${f.screenshot}` : null,
        f.trace ? `- トレース: ${f.trace}（\`npx playwright show-trace\`）` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

export function statsOf(json) {
  const s = json.stats ?? {};
  return { passed: s.expected ?? 0, failed: s.unexpected ?? 0, flaky: s.flaky ?? 0, skipped: s.skipped ?? 0 };
}
