import { test, expect, horizontalOverflow } from "./fixtures";

test.describe("SaaS代替ページ：結局どれを選ぶか", () => {
  test("機能データのあるSaaS（Slack・従来の配置）：用途別・おすすめの目安・早見表・機能比較・乗り換えない場合", async ({ page, problems }) => {
    await page.goto("/alternatives/slack/");
    const sec = page.locator("#choose");
    await expect(sec).toBeVisible();
    await expect(sec.getByRole("heading", { level: 2 })).toContainText("結局どれを選ぶ");
    await expect(sec).toContainText("おすすめの目安");
    await expect(sec.locator(".decide__rec li").first()).toContainText("点");
    const table = sec.getByRole("table", { name: "候補の判断の早見表" });
    await expect(table).toContainText("導入・運用の負担");
    await expect(table.locator("tbody tr").first()).toContainText(/位|未観測/);
    await expect(sec.locator(".decide__matrix")).toBeVisible();
    await expect(sec).toContainText("「非対応」ではありません");
    await expect(sec).toContainText("移行の難しさ");
    await expect(sec).toContainText("乗り換えない方がよいケース");
    await expect(sec).toContainText("一般的な目安（データではなく、編集方針にもとづくもの）");
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test("Notion（結論を先に出す配置）：結論→主要な比較表→移行→乗り換えない場合→詳細指標の順で、同じ候補を繰り返さない", async ({ page, problems }) => {
    await page.goto("/alternatives/notion/");
    const top = (sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    // 1. 用途別の結論（候補ごとに、ライセンス・導入前の確認つき）
    const picks = page.locator(".alt-picks--conclusion li");
    expect(await picks.count()).toBeGreaterThan(1);
    await expect(page.locator(".alt-picks--conclusion")).toContainText("導入前に確認");
    // 同じ候補を判断パネルで繰り返さない
    await expect(page.locator(".decide__picks")).toHaveCount(0);
    // 2. 主要な比較表（早見表と機能比較は、別の表のまま）
    const sec = page.locator("#choose");
    await expect(sec.getByRole("table", { name: "候補の判断の早見表" })).toBeVisible();
    await expect(sec.locator(".decide__matrix")).toBeVisible();
    await expect(sec).toContainText("「非対応」ではありません");
    // 3〜5 の順序
    const order = [await top(".alt-picks--conclusion"), await top("#choose"), await top("h2#migration"), await top("#stay"), await top("#details")];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    await expect(page.locator("#stay-data")).toContainText("一般的な目安（データではなく、編集方針にもとづくもの）");
    await expect(page.locator("#details")).toContainText("おすすめの目安");
    await expect(page.locator("#details .decide__rec li").first()).toContainText("点");
    // 詳細指標（全候補の表）は折りたたみ。出典・ライセンスの注意は本文に残す
    await expect(page.locator("details#all-candidates")).toHaveCount(1);
    await expect(page.locator("main")).toContainText("Enterprise Edition");
    await page.getByRole("navigation", { name: "このページの内容" }).getByRole("link", { name: "詳細指標と計算の根拠" }).click();
    await expect(page).toHaveURL(/#details$/);
    await expect(page.locator("#details")).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test("従来の配置（Slack）：用途別のおすすめと早見表が、全候補の比較表より先に並び、ページ内リンクで移動できる", async ({ page }) => {
    await page.goto("/alternatives/slack/");
    const top = (sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    expect(await top(".decide__picks")).toBeLessThan(await top("#all-candidates"));
    expect(await top("#choose")).toBeLessThan(await top("#all-candidates"));
    expect(await page.locator(".decide__picks li").count()).toBeGreaterThan(1);
    await page.getByRole("navigation", { name: "このページの内容" }).getByRole("link", { name: "全候補の比較表" }).click();
    await expect(page).toHaveURL(/#all-candidates$/);
    await expect(page.locator("#all-candidates")).toBeVisible();
  });

  test("機能データのないSaaS：機能の比較表・おすすめの点数は出さず、理由を説明する", async ({ page }) => {
    await page.goto("/alternatives/airtable/");
    const sec = page.locator("#choose");
    await expect(sec).toBeVisible();
    await expect(sec.locator(".decide__matrix")).toHaveCount(0);
    await expect(sec).not.toContainText("おすすめの目安");
    await expect(sec).toContainText("機能データのある5つのSaaS");
    await expect(sec.getByRole("table", { name: "候補の判断の早見表" })).toBeVisible();
  });

  test("手書きの解説の「移行するときの注意」へ、要約から移動できる", async ({ page }) => {
    await page.goto("/alternatives/slack/");
    const link = page.locator('#choose a[href="#migration"]');
    if (await link.count()) {
      await link.first().click();
      await expect(page.locator("h2#migration")).toBeVisible();
    } else {
      await expect(page.locator("h2#migration")).toHaveCount(0);
    }
  });
});
