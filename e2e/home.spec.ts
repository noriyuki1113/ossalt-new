import { test, expect, horizontalOverflow } from "./fixtures";

test.describe("トップページ：目的のOSSへ早くたどり着く", () => {
  test("SaaS名を入れると候補が出て、選ぶとその代替ページへ移動する", async ({ page, problems }) => {
    await page.goto("/");
    const box = page.getByRole("combobox", { name: /SaaSの名前/ });
    await expect(box).toBeVisible();
    // 画面の最初（ファーストビュー）に検索ボックスがある
    const y = await box.evaluate((el) => el.getBoundingClientRect().top);
    const h = await page.evaluate(() => window.innerHeight);
    expect(y).toBeLessThan(h);

    await box.fill("notion");
    const options = page.getByRole("option");
    await expect(options.first()).toContainText("Notion");
    await box.press("ArrowDown");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/alternatives\/notion\/$/);
    expect(problems).toEqual([]);
  });

  test("カタカナ・日本語名でも候補が出る。候補に無い言葉はツール一覧の検索へ送る", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("combobox", { name: /SaaSの名前/ });
    await box.fill("スラック");
    // 日本語名の別名があれば候補に出る。無ければ、ツール一覧の検索に送る選択肢だけが出る
    await expect(page.getByRole("option").last()).toContainText("ツール名・説明から探す");

    await box.fill("immich");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/tools\/\?q=immich$/);
    // 一覧は ?q= を読んで絞り込む
    await expect(page.getByRole("searchbox")).toHaveValue("immich");
    await expect(page.locator("article.row").first()).toContainText("Immich");
  });

  test("人気のSaaSのリンクから代替ページへ行ける", async ({ page }) => {
    await page.goto("/");
    const first = page.locator(".saas-popular a[href^='/alternatives/']").first();
    const href = await first.getAttribute("href");
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test("OSS診断とCost Labへの導線がある", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /OSS診断をはじめる/ })).toHaveAttribute("href", "/diagnosis/");
    await expect(page.getByRole("link", { name: /Cost Labで試算する/ })).toHaveAttribute("href", "/cost-lab/");
  });

  test("3種類のランキングを切り替えられ、詳細ページへ進める", async ({ page, problems }) => {
    await page.goto("/");
    const tabs = page.locator('[aria-label="ランキングの種類"]').first().getByRole("tab");
    await expect(tabs).toHaveCount(3);
    await expect(page.locator("#home-panel-popular")).toBeVisible();
    await page.getByRole("tab", { name: "急成長" }).first().click();
    await expect(page.locator("#home-panel-growth")).toBeVisible();
    await expect(page.locator("#home-panel-popular")).toBeHidden();
    await page.getByRole("tab", { name: "おすすめ" }).first().click();
    await expect(page.locator("#home-panel-recommended")).toContainText("順位を付けていません");
    await page.getByRole("link", { name: /ランキングをすべて見る/ }).click();
    await expect(page).toHaveURL(/\/rankings\/#recommended$/);
    await expect(page.locator("#panel-recommended")).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("スマートフォンの幅でも横にはみ出さない", async ({ page }) => {
    await page.goto("/");
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});
