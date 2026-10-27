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

  test("/changes/ は観測日時（JST）を示し、履歴蓄積中の行にはOSSALT自身の記録を別の出典として表示する", async ({ page, problems }) => {
    await page.goto("/changes/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/OBSERVATION \/ .*JST|NO VERIFIED DATA/)).toBeVisible();
    // 取り込み状況：配信元の観測日時・最終成功・最終試行を分けて示す（記録が無ければ推測で埋めない）
    const sync = page.getByLabel("観測データの取り込み状況");
    await expect(sync).toContainText("配信元の観測日時");
    await expect(sync).toContainText("最終取り込み成功");
    await expect(sync).toContainText(/最終試行.*(\d{4}\/\d{2}\/\d{2}|記録開始前)/);
    const rows = page.locator("article");
    if (await rows.count()) {
      await expect(rows.first().getByText(/最終観測：/)).toBeVisible();
      // 7日間の値が無い行は「履歴蓄積中」。OSSALT記録は、あれば別の表記で出る（Watchの値と混ぜない）
      const accumulating = page.locator("article", { hasText: "履歴蓄積中" });
      if (await accumulating.count()) await expect(accumulating.first()).toContainText(/OSSALT記録：\+[\d,]+／\d+日間/);
    }
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
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
});
