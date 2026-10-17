import { test, expect } from "./fixtures";

test.describe("OSS一覧の検索と絞り込み", () => {
  test("キーワードで絞り込める", async ({ page }) => {
    await page.goto("/tools/");
    const count = page.locator("#browser-count");
    await expect(count).toContainText(/\d/);
    const before = (await count.textContent()) ?? "";

    await page.getByRole("searchbox").fill("immich");
    const rows = page.locator("article.row");
    await expect(rows.first()).toContainText("Immich");
    await expect(count).not.toHaveText(before);
    expect(await rows.count()).toBeLessThan(10);
  });

  test("該当なしのときは空の案内を出す", async ({ page }) => {
    await page.goto("/tools/");
    await page.getByRole("searchbox").fill("zzzz-no-such-tool-9999");
    await expect(page.locator(".empty")).toBeVisible();
    await expect(page.locator("article.row")).toHaveCount(0);
  });

  test("カテゴリで絞り込み、リセットで戻せる", async ({ page }) => {
    await page.goto("/tools/");
    const count = page.locator("#browser-count");
    const before = (await count.textContent()) ?? "";
    const chips = page.locator(".chips .chip");
    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(count).not.toHaveText(before);
    await page.getByRole("button", { name: "条件を解除" }).first().click();
    await expect(count).toHaveText(before);
  });

  test("並び替えを変えても一覧が出る", async ({ page }) => {
    await page.goto("/tools/");
    const sort = page.locator("select.select").first();
    for (const value of ["stars", "recent", "name", "health"]) {
      await sort.selectOption(value);
      await expect(page.locator("article.row").first()).toBeVisible();
    }
  });

  test("「もっと見る」で表示件数が増える", async ({ page }) => {
    await page.goto("/tools/");
    const rows = page.locator("article.row");
    const first = await rows.count();
    await page.getByRole("button", { name: /もっと見る/ }).click();
    await expect.poll(() => rows.count()).toBeGreaterThan(first);
  });
});

test.describe("ツール詳細ページ", () => {
  test("一覧から詳細ページに移動できる", async ({ page }) => {
    await page.goto("/tools/");
    await page.getByRole("searchbox").fill("immich");
    await page.locator("article.row a.row__link", { hasText: "Immich" }).first().click();
    await expect(page).toHaveURL(/\/tools\/immich\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Immich");
  });

  test("詳細ページに基本情報とパンくずがある", async ({ page, problems }) => {
    const res = await page.goto("/tools/immich/");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Immich");
    await expect(page.getByRole("navigation", { name: "パンくず" })).toBeVisible();
    await expect(page.locator("main")).toContainText(/ライセンス/);
    expect(problems).toEqual([]);
  });
});
