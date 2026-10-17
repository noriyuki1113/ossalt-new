import { test, expect, horizontalOverflow } from "./fixtures";

test.describe("トップページとナビゲーション", () => {
  test("トップページが表示される", async ({ page, problems }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/ossalt\.jp/);
    await expect(page.locator("h1.hero__title")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "メインナビゲーション" })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("メインナビゲーションの各リンクが開ける", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator('nav[aria-label="メインナビゲーション"] a').evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute("href") || ""),
    );
    expect(hrefs.length).toBeGreaterThan(2);
    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.status(), `${href} が開けない`).toBe(200);
    }
  });

  test("トップ・一覧ページの内部リンクに切れがない", async ({ page, request }) => {
    const checked = new Set<string>();
    const broken: string[] = [];
    for (const start of ["/", "/tools/", "/blog/", "/guide/"]) {
      await page.goto(start);
      const hrefs = await page.locator("a[href]").evaluateAll((as) =>
        as.map((a) => (a as HTMLAnchorElement).getAttribute("href") || ""),
      );
      for (const href of hrefs) {
        if (!href.startsWith("/") || href.startsWith("//")) continue;
        const clean = href.split("#")[0];
        if (!clean || checked.has(clean)) continue;
        checked.add(clean);
        const res = await request.get(clean);
        if (res.status() !== 200) broken.push(`${start} → ${href} (${res.status()})`);
        if (checked.size >= 150) break;
      }
    }
    expect(checked.size).toBeGreaterThan(10);
    expect(broken).toEqual([]);
  });

  test("存在しないURLは404ページになる", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist/");
    expect(res?.status()).toBe(404);
  });
});

test.describe("表示崩れ（横スクロール）", () => {
  for (const path of ["/", "/tools/", "/tools/immich/", "/diagnosis/", "/cost-lab/", "/blog/"]) {
    test(`${path} が横にはみ出さない`, async ({ page, problems }, info) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await horizontalOverflow(page), `${info.project.name} で横スクロールが出る`).toBeLessThanOrEqual(1);
      expect(problems).toEqual([]);
    });
  }
});
