import { test, expect } from "./fixtures";

// 解説がなく検索の需要もないツールページは noindex（ページとリンクは残す）。src/lib/search-index.ts
test.describe("解説のないツールページの noindex", () => {
  test("対象のページは noindex, follow で、ページは開け、canonical は自分自身", async ({ page }) => {
    const res = await page.goto("/tools/gimp/");
    expect(res?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex,\s*follow/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://ossalt.jp/tools/gimp/");
    await expect(page.locator("h1")).toContainText("GIMP");
  });

  test("解説のあるページと、先に解説を書くページは index のまま", async ({ page }) => {
    for (const path of ["/tools/gitea/", "/tools/mediawiki/"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /^index,\s*follow/);
    }
  });

  test("サイトマップには対象のページを載せず、内部リンクは残す", async ({ page, request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).not.toContain("/tools/gimp/</loc>");
    expect(xml).toContain("/tools/gitea/</loc>");
    expect(xml).toContain("/tools/mediawiki/</loc>");
    await page.goto("/categories/design/");
    expect(await page.locator('a[href="/tools/gimp/"]').count()).toBeGreaterThan(0);
  });
});
