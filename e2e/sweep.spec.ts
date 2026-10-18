import { test, expect, horizontalOverflow } from "./fixtures";

/**
 * 探索的な巡回（autodev の Browser QA 用）。通常の `npm run test:e2e` では実行しない。
 *   E2E_SWEEP=1 npx playwright test e2e/sweep.spec.ts   （または npm run qa -- --sweep）
 * sitemap.xml から、セクション（/tools/・/blog/ など）ごとに等間隔で数ページを選び、
 * JSエラー・見出し（h1が1つ）・横はみ出し・画像のalt・内部リンクの切れを調べる。
 */
test.skip(!process.env.E2E_SWEEP, "E2E_SWEEP=1 のときだけ実行");

const PER_SECTION = Number(process.env.E2E_SWEEP_PER_SECTION || 6);

function pick<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const step = items.length / n;
  return Array.from({ length: n }, (_, i) => items[Math.floor(i * step)]);
}

test("サイトマップのページを巡回して問題を探す", async ({ page, request, problems }, info) => {
  test.setTimeout(240_000);
  const xml = await (await request.get("/sitemap.xml")).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const sections = new Map<string, string[]>();
  for (const p of paths) {
    const key = p.split("/")[1] || "(top)";
    sections.set(key, [...(sections.get(key) ?? []), p]);
  }
  const targets = [...sections.values()].flatMap((list) => pick(list, PER_SECTION));
  expect(targets.length).toBeGreaterThan(5);

  const found: string[] = [];
  for (const path of targets) {
    const res = await page.goto(path, { waitUntil: "load" });
    if (res?.status() !== 200) { found.push(`${path}: HTTP ${res?.status()}`); continue; }
    const h1 = await page.locator("h1").count();
    if (h1 !== 1) found.push(`${path}: h1 が ${h1} 個`);
    const over = await horizontalOverflow(page);
    if (over > 1) found.push(`${path}: 横に ${over}px はみ出す（${info.project.name}）`);
    const noAlt = await page.locator("img:not([alt])").count();
    if (noAlt > 0) found.push(`${path}: alt のない画像が ${noAlt} 件`);
    if (!(await page.locator('link[rel="canonical"]').count())) found.push(`${path}: canonical がない`);
  }
  info.annotations.push({ type: "url", description: `巡回 ${targets.length} ページ` });
  expect(found, `巡回で見つかった問題（${targets.length}ページ）`).toEqual([]);
  expect(problems).toEqual([]);
});
