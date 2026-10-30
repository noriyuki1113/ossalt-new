import { test, expect, horizontalOverflow } from "./fixtures";

test.describe("変化レポートと急上昇", () => {
  test("/trending/ は、スター数の取得日（ビルド日ではなく）を示し、ランキングが出る", async ({ page, problems }) => {
    await page.goto("/trending/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("急上昇");
    await expect(page.locator(".lede")).toContainText(/までにGitHubから取得した最新の値/);
    await expect(page.locator("ol.trend .trend__row").first()).toBeVisible();
    // 成長（1週間・30日間）と人気（スター総数）を別の見出しで分けて示す
    await expect(page.getByRole("heading", { name: "成長ランキング：直近1週間" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "成長ランキング：直近30日間" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "人気ランキング：スター総数" })).toBeVisible();
    await expect(page.locator("#week")).toContainText(/\d+日間|まだ集まっていません/);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test("/changes/ は自前の実測（取得日時・比較の期間）を主に示し、外部の観測は過去の記録として分ける", async ({ page, problems }) => {
    await page.goto("/changes/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("OSSの変化レポート");
    // 取得日時・ページの生成・データの状態を分けて示す
    const dates = page.getByLabel("データの日時");
    await expect(dates).toContainText(/GitHubからの最新の取得\s*(\d{4}\/\d{2}\/\d{2}|記録なし)/);
    await expect(dates).toContainText("このページの生成");
    await expect(page.getByLabel("検証できたOSSの件数")).toContainText("比較不可");
    // Starの一覧は、行ごとに比較の期間（開始→終了・日数）を出す
    const firstStar = page.locator("#stars-heading").locator("xpath=ancestor::section").locator("li").first();
    if (await firstStar.count()) await expect(firstStar).toContainText(/\d+\/\d+→\d+\/\d+（\d+日間）/);
    // 外部Watchの観測は「過去の観測記録」。観測時点のタグは現在の最新とは限らないと明記
    const past = page.getByRole("heading", { name: "過去の観測記録" });
    if (await past.count()) {
      await page.getByText(/件の記録を見る/).click();
      await expect(page.getByText(/観測時点のタグ：.*（現在の最新とは限りません）/).first()).toBeVisible();
    }
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test("トップページと /changes/ の取得日時が一致する", async ({ page }) => {
    await page.goto("/changes/");
    const m = (await page.getByLabel("データの日時").innerText()).match(/GitHubからの最新の取得\s*(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2})/);
    await page.goto("/");
    const home = page.locator("#watch-home-heading + p");
    if (m && (await home.count())) await expect(home).toContainText(m[1]);
  });
});

test.describe("OSSランキング（人気・急成長・おすすめ）", () => {
  test("3つに分かれ、切り替えでき、計算の根拠と観測日を確認できる", async ({ page, problems }) => {
    await page.goto("/rankings/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("ランキング");
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(3);
    // 既定は人気。重み（50・25・25%）を明示
    await expect(page.locator("#panel-popular")).toBeVisible();
    await expect(page.locator("#panel-popular")).toContainText("Stars 50%");
    await expect(page.locator("#panel-growth")).toBeHidden();

    // 計算の根拠（項目・重み・順位・加点）と、取得日
    const first = page.locator("#panel-popular .rank-row").first();
    await first.locator("summary").click();
    await expect(first.locator(".rank-why__table")).toContainText("Contributors");
    await expect(first.locator(".rank-why__obs")).toContainText(/取得日/);

    // 急成長：重みと、実測の期間。記録が足りないものは未観測であることを説明
    await page.getByRole("tab", { name: /急成長/ }).click();
    await expect(page).toHaveURL(/#growth$/);
    await expect(page.locator("#panel-growth")).toBeVisible();
    await expect(page.locator("#panel-growth")).toContainText("直近7日の純増 50%");
    await expect(page.locator("#panel-growth .rank-row").first()).toBeVisible();

    // おすすめ：適用条件（5つのSaaSだけ）を明示し、SaaSを切り替えられる
    await page.getByRole("tab", { name: /おすすめ/ }).click();
    await expect(page.locator("#panel-recommended")).toContainText("順位を付けていません");
    const chips = page.locator("#panel-recommended .chip");
    await expect(chips).toHaveCount(5);
    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#panel-recommended .rank-row:visible").first()).toContainText(/点/);

    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test("URLの #growth で、急成長のタブが開く", async ({ page }) => {
    await page.goto("/rankings/#growth");
    await expect(page.locator("#panel-growth")).toBeVisible();
    await expect(page.getByRole("tab", { name: /急成長/ })).toHaveAttribute("aria-selected", "true");
  });

  test("3種類の違いをカードで示し、押すとその種類のタブに切り替わる。棒の横には数値がある", async ({ page }) => {
    await page.goto("/rankings/");
    const kinds = page.getByRole("list", { name: "3つのランキングの違い" });
    await expect(kinds.getByRole("link")).toHaveCount(3);
    await kinds.getByRole("link", { name: /おすすめ/ }).click();
    await expect(page.getByRole("tab", { name: /おすすめ/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-recommended")).toBeVisible();
    const row = page.locator("#panel-recommended .rank-row:visible").first();
    await expect(row.locator(".rank-bar")).toBeVisible();
    await expect(row.locator(".trend__value strong")).toContainText("点");
  });
});
