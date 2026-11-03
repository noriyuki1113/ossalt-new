import { test, expect, horizontalOverflow } from "./fixtures";

/**
 * GitHub がミラー（本当の開発場所は別）のツール：ミラーの設定・履歴から取れる値（Scorecard・リリース・SECURITY.md など）は、
 * 実際の開発の状況を表さないため、「未確認」と表示する。ライセンスは公式の記載に合わせる。
 */
test.describe("ミラーのツールの表示", () => {
  test("FFmpeg：ミラーの案内、数値は未確認、ライセンスは LGPL-2.1 と GPL の条件", async ({ page, problems }) => {
    await page.goto("/tools/ffmpeg/");
    const notice = page.locator(".notice--info", { hasText: "GitHubはミラーです" });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole("link", { name: /code\.ffmpeg\.org/ })).toHaveAttribute("href", "https://code.ffmpeg.org/FFmpeg/FFmpeg");
    await expect(page.locator(".spec__row", { hasText: "リリース" }).first()).toContainText("未確認");
    await expect(page.locator("body")).not.toContainText("リリースはありません");
    await expect(page.locator("body")).toContainText("LGPL-2.1");
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test("GlitchTip：コントリビューター数（ミラーの1人）を出さない", async ({ page, problems }) => {
    await page.goto("/tools/glitchtip/");
    await expect(page.locator(".notice--info", { hasText: "GitHubはミラーです" })).toBeVisible();
    await expect(page.locator("body")).toContainText(/コントリビュータ\s*×\s*0\.5\s*未取得/);
    expect(problems).toEqual([]);
  });

  test("ミラーでないツール（Gitea）には、案内を出さない", async ({ page }) => {
    await page.goto("/tools/gitea/");
    await expect(page.locator(".notice", { hasText: "GitHubはミラーです" })).toHaveCount(0);
  });
});
