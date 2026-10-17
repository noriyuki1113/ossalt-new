import { test, expect, readJsonLd } from "./fixtures";

const SITE = "https://ossalt.jp";

test.describe("SEOメタデータ", () => {
  for (const path of ["/", "/tools/", "/tools/immich/", "/cost-lab/", "/diagnosis/", "/blog/"]) {
    test(`${path} に title・description・canonical・OGPがある`, async ({ page }) => {
      await page.goto(path);
      const title = await page.title();
      expect(title.length).toBeGreaterThan(5);
      const desc = await page.locator('meta[name="description"]').getAttribute("content");
      expect((desc ?? "").length).toBeGreaterThan(20);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}${path}`);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https?:\/\//);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index/);
      expect(await page.locator('meta[name="robots"]').getAttribute("content")).not.toMatch(/noindex/);
    });
  }
});

test.describe("構造化データ（JSON-LD）", () => {
  test("トップに WebSite がある", async ({ page }) => {
    await page.goto("/");
    const types = (await readJsonLd(page)).map((j) => j["@type"]);
    expect(types).toContain("WebSite");
  });

  test("ツール詳細に SoftwareApplication と BreadcrumbList があり、根拠のない Review を含まない", async ({ page }) => {
    await page.goto("/tools/immich/");
    const blocks = await readJsonLd(page);
    const flat = JSON.stringify(blocks);
    expect(flat).toContain('"SoftwareApplication"');
    expect(flat).toContain('"BreadcrumbList"');
    expect(flat).not.toContain('"Review"'); // P1-2：監査で削除済み。再発防止
    for (const b of blocks) expect(b["@context"]).toBe("https://schema.org");
  });
});

test.describe("収益導線の表示条件（P1-1：サーバーで動かすツールだけにVPS枠）", () => {
  test("サーバー用ツール（Immich）には広告と明示したVPS枠が出る", async ({ page }) => {
    await page.goto("/tools/immich/");
    const box = page.getByRole("region", { name: /広告（アフィリエイト）/ });
    await expect(box).toBeVisible();
    await expect(box.locator("a[rel~='sponsored']").first()).toBeVisible();
  });

  for (const id of ["gimp", "obs", "flowise"]) {
    test(`${id}（アプリ・アーカイブ済み）にはVPS枠が出ない`, async ({ page }) => {
      await page.goto(`/tools/${id}/`);
      await expect(page.locator(".vps-reco")).toHaveCount(0);
    });
  }

  test("アフィリエイトのリンクは rel=sponsored で、広告の表記がある", async ({ page }) => {
    await page.goto("/tools/immich/");
    const links = page.locator(".vps-reco a[href^='http']");
    const n = await links.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await expect(links.nth(i)).toHaveAttribute("rel", /sponsored/);
    }
    await expect(page.locator(".vps-reco")).toContainText(/広告|PR|アフィリエイト/);
  });
});
