import { test, expect, horizontalOverflow } from "./fixtures";

test.describe("変化レポートと急上昇", () => {
  test("/trending/ は、スター数の取得日（ビルド日ではなく）を示し、ランキングが出る", async ({ page, problems }) => {
    await page.goto("/trending/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("急上昇");
    await expect(page.locator(".lede")).toContainText(/までにGitHubから取得した最新の値/);
    await expect(page.locator("ol.trend .trend__row").first()).toBeVisible();
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
