import { test, expect } from "./fixtures";

test.describe("OSS一覧の検索と絞り込み", () => {
  test("キーワードで絞り込める", async ({ page }) => {
    await page.goto("/tools/");
    const count = page.locator("#browser-count");
    await expect(count).toContainText(/\d/);
    const before = (await count.textContent()) ?? "";

    await page.getByRole("searchbox").fill("immich");
    const rows = page.locator("article.row, article.browse-card");
    await expect(rows.first()).toContainText("Immich");
    await expect(count).not.toHaveText(before);
    expect(await rows.count()).toBeLessThan(10);
  });

  test("該当なしのときは空の案内を出す", async ({ page }) => {
    await page.goto("/tools/");
    await page.getByRole("searchbox").fill("zzzz-no-such-tool-9999");
    await expect(page.locator(".empty")).toBeVisible();
    await expect(page.locator("article.row, article.browse-card")).toHaveCount(0);
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
      await expect(page.locator("article.row, article.browse-card").first()).toBeVisible();
    }
  });

  test("ライセンスの種類（ソース公開型）で絞り込める", async ({ page }) => {
    await page.goto("/tools/");
    const count = page.locator("#browser-count");
    const before = (await count.textContent()) ?? "";
    const select = page.locator("select", { has: page.locator('option[value="group:source-available"]') });
    await select.selectOption("group:source-available");
    await expect(count).not.toHaveText(before);
    await page.getByRole("searchbox").fill("n8n");
    await expect(page.locator("article.row, article.browse-card").first()).toContainText("n8n");
    await page.getByRole("searchbox").fill("immich"); // AGPL-3.0（OSI承認）は出ない
    await expect(page.locator("article.row, article.browse-card")).toHaveCount(0);
  });

  test("「もっと見る」で表示件数が増える", async ({ page }) => {
    await page.goto("/tools/");
    const rows = page.locator("article.row, article.browse-card");
    const first = await rows.count();
    await page.getByRole("button", { name: /もっと見る/ }).click();
    await expect.poll(() => rows.count()).toBeGreaterThan(first);
  });
});

test.describe("ツール詳細ページ", () => {
  test("一覧から詳細ページに移動できる", async ({ page }) => {
    await page.goto("/tools/");
    await page.getByRole("searchbox").fill("immich");
    await page.locator("article.row a.row__link, article.browse-card a.row__link", { hasText: "Immich" }).first().click();
    await expect(page).toHaveURL(/\/tools\/immich\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Immich");
  });

  test("詳細ページに基本情報とパンくずがある", async ({ page, problems }) => {
    const res = await page.goto("/tools/immich/");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Immich");
    await expect(page.getByRole("navigation", { name: "パンくず" })).toBeVisible();
    await expect(page.locator("main")).toContainText(/ライセンス/);
    await expect(page.locator(".license-verdict__badge")).toHaveText("OSI承認のオープンソース");
    expect(problems).toEqual([]);
  });

  test("選ぶ前の要約：強み・確認したい点に根拠が付き、人気・成長・公式の情報へ進める", async ({ page, problems }) => {
    await page.goto("/tools/n8n/");
    const brief = page.locator(".brief");
    await expect(brief).toBeVisible();
    await expect(brief).toContainText("データから分かる強み");
    await expect(brief).toContainText("確認しておきたい点・向かない条件");
    // ソース公開型のライセンスは、確認したい点に出る
    await expect(brief.locator(".brief__list--check")).toContainText("ソース公開型");
    // どの項目にも根拠が付く
    const items = brief.locator(".brief__list li");
    expect(await items.count()).toBeGreaterThan(2);
    for (const li of await items.all()) await expect(li.locator("small")).toContainText("根拠：");
    // 導入・運用、人気・成長、公式の情報
    await expect(brief).toContainText(/導入・運用の難易度：/);
    await expect(brief).toContainText(/人気：掲載\d+件中\d+位/);
    await expect(brief.getByRole("link", { name: "GitHubのREADME" })).toHaveAttribute("href", /github\.com\/.+#readme$/);
    await expect(brief.getByRole("link", { name: /計算の根拠を見る/ })).toHaveAttribute("href", "/rankings/");
    expect(problems).toEqual([]);
  });

  test("ソース公開型のツールは区分と判定理由を出す", async ({ page }) => {
    await page.goto("/tools/n8n/");
    await expect(page.locator(".license-verdict__badge")).toHaveText(/ソース公開型/);
    await expect(page.locator(".license-verdict__reason")).toContainText("OSI承認のオープンソースライセンスではありません");
  });
});


test.describe("OSS一覧 Phase 2 — カード表示と大量データ", () => {
  test("初期表示はカードで、一覧に切り替えても同じツールへ移動できる", async ({ page }) => {
    await page.goto("/tools/");
    const switcher = page.getByRole("group", { name: "表示形式" });
    await expect(switcher.getByRole("button", { name: "カード" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("article.browse-card")).toHaveCount(50);
    await expect(page.locator("article.row")).toHaveCount(0);
    await switcher.getByRole("button", { name: "一覧" }).click();
    await expect(page.locator("article.row")).toHaveCount(50);
    await expect(page.locator("article.browse-card")).toHaveCount(0);
    await page.getByRole("searchbox").fill("immich");
    const row = page.locator("article.row").filter({ hasText: "Immich" }).first();
    await expect(row).toBeVisible();
    await row.locator("a.row__link").click();
    await expect(page).toHaveURL(/\/tools\/immich\/$/);
  });

  test("並び替え後も表示は50件ずつで、もっと見ると追加される", async ({ page }) => {
    await page.goto("/tools/");
    await page.locator("select.select").first().selectOption("name");
    const rows = page.locator("article.row, article.browse-card");
    await expect(rows).toHaveCount(50);
    await page.getByRole("button", { name: /もっと見る/ }).click();
    await expect(rows).toHaveCount(100);
    await expect(page.locator(".browser-results-summary")).toContainText("100件を表示");
  });

  test("検索条件のチップでその条件だけを解除できる", async ({ page }) => {
    await page.goto("/tools/");
    await page.getByRole("searchbox").fill("immich");
    await expect(page.locator(".browser-active-filters")).toContainText("immich");
    await page.getByRole("button", { name: "検索: immichを解除" }).click();
    await expect(page.getByRole("searchbox")).toHaveValue("");
    await expect(page.locator("article.row, article.browse-card")).toHaveCount(50);
  });

  test("詳細ページの最初に、公式サイトへの導線・基本情報・向いている使い方が、要約より先に並ぶ", async ({ page }) => {
    await page.goto("/tools/immich/");
    const top = (sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const actions = await top(".hero__actions");
    const positioning = await top(".positioning");
    const brief = await top(".brief");
    expect(actions).toBeLessThan(positioning);
    expect(positioning).toBeLessThan(brief);
    await expect(page.locator(".hero__actions").getByRole("link", { name: "公式サイト" })).toBeVisible();
  });

  test("最終コミットが1年以上前のツールは、詳細ページの先頭に事実を表示し、更新中のツールには出さない", async ({ page }) => {
    await page.goto("/tools/gpt4all/");
    const notice = page.locator(".notice--warn", { hasText: "更新が1年以上ありません" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("最終コミットは");
    await page.goto("/tools/n8n/");
    await expect(page.getByText("更新が1年以上ありません")).toHaveCount(0);
  });

  test("検索欄とカテゴリ列が画面幅に収まる（チップ列は横スクロール）", async ({ page }) => {
    await page.goto("/tools/");
    const vw = page.viewportSize()!.width;
    const box = await page.getByRole("searchbox").boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(vw);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(vw);
  });
});
