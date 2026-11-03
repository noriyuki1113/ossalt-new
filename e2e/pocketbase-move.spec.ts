import { test, expect, horizontalOverflow } from "./fixtures";

/**
 * PocketBase：旧GitHubリポジトリはアーカイブされたが、開発は移転して続いている。
 * 「開発終了」と扱わず、移転を案内し、比較ページ（手書きの解説がある）が存在すること。
 */
test.describe("PocketBase の開発場所の移転", () => {
  test("詳細ページは、移転を案内し、「開発終了」と書かない", async ({ page, problems }) => {
    await page.goto("/tools/pocketbase/");
    const notice = page.locator(".notice--info", { hasText: "開発場所が移転しました" });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole("link", { name: "公式の発表" })).toHaveAttribute("href", "https://github.com/pocketbase/pocketbase/discussions/7873");
    await expect(notice.getByRole("link", { name: /ganigeorgiev\.com\/pocketbase\/pocketbase/ })).toHaveAttribute("href", "https://ganigeorgiev.com/pocketbase/pocketbase");
    await expect(notice).toContainText("新しい開発場所の更新は反映していません");
    await expect(page.getByText("開発終了")).toHaveCount(0);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test("Appwrite・Supabase との比較ページが存在し、詳細ページからのリンクが切れていない", async ({ page, request }) => {
    for (const slug of ["appwrite-vs-pocketbase", "pocketbase-vs-supabase"]) {
      expect((await request.get(`/compare/${slug}/`)).status(), slug).toBe(200);
    }
    await page.goto("/tools/appwrite/");
    await expect(page.locator('a[href="/compare/appwrite-vs-pocketbase/"]').first()).toBeAttached();
  });
});
