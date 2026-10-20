import { test, expect } from "./fixtures";

const curated = [
  { slug: "libreoffice-vs-onlyoffice", title: /LibreOfficeとONLYOFFICE、どっちを選ぶ？/ },
  { slug: "collabora-online-vs-libreoffice", title: /Collabora OnlineとLibreOffice、どっちを選ぶ？/ },
  { slug: "borg-vs-restic", title: /BorgBackupとRestic、どっちを選ぶ？/ },
];

test("比較一覧に解説付きのおすすめページへのリンクが表示される", async ({ page }) => {
  const res = await page.goto("/compare/");
  expect(res?.status()).toBe(200);
  const section = page.locator('section[aria-labelledby="featured-comparisons"]');
  await expect(section.getByRole("heading", { name: "まず読みたい、OSSの比較ガイド" })).toBeVisible();
  for (const p of curated) {
    await expect(section.locator('a[href="/compare/' + p.slug + '/"]')).toBeVisible();
  }
});

for (const p of curated) {
  test(p.slug + " の人手による比較解説を検索に公開できる", async ({ page }) => {
    const res = await page.goto("/compare/" + p.slug + "/");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: p.title })).toBeVisible();
    const robotsTag = page.locator('meta[name="robots"]');
    const robots = (await robotsTag.count()) > 0 ? (await robotsTag.getAttribute("content")) ?? "" : "";
    expect(robots).not.toContain("noindex");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href", new RegExp("/compare/" + p.slug + "/$")
    );
  });
}
