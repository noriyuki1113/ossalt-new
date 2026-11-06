import { test, expect, horizontalOverflow } from "./fixtures";

test.describe("整合性・導線", () => {
  test("変化レポート：7日間と断定せず、対象期間の定義を見出しの近くに出す", async ({ page }) => {
    await page.goto("/changes/");
    const sec = page.locator("#stars-heading").locator("..").locator("..");
    await expect(page.locator("#stars-heading")).toContainText("直近約1週間");
    await expect(sec).toContainText("対象期間");
    await expect(page.locator("main")).not.toContainText("7日間の実測");
  });
});
