import { test, expect, horizontalOverflow } from "./fixtures";

test.describe("整合性・導線", () => {
  test("ライセンスの例外：詳細・比較で「中心／一部別条件」と注意の文を出し、識別子は表記に残す", async ({ page, problems }) => {
    await page.goto("/tools/affine/");
    await expect(page.locator("main")).toContainText("MIT中心／一部別条件");
    await expect(page.locator(".license-verdict__reason")).toContainText("Enterprise Edition");
    await expect(page.locator("main")).toContainText("ライセンス表記は「MIT（packages/backend 配下は別ライセンス）」");

    await page.goto("/compare/affine-vs-appflowy/");
    await expect(page.locator("main")).toContainText("MIT中心／一部別条件");
    await expect(page.locator(".license-caveat").first()).toContainText("Enterprise Edition");
    expect(problems).toEqual([]);
  });
  test("ライセンスの例外がないツールは、識別子のまま表示する", async ({ page }) => {
    await page.goto("/tools/n8n/");
    await expect(page.locator("main")).not.toContainText("一部別条件");
  });
});
