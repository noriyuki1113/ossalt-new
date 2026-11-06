import { test, expect, horizontalOverflow } from "./fixtures";

test.describe("整合性・導線", () => {
  test("指標の名称：「健全度」ではなく「注目度・規模の目安」と表示し、保証ではないことを示す", async ({ page }) => {
    await page.goto("/tools/n8n/");
    await expect(page.locator("main")).toContainText("注目度・規模");
    await expect(page.locator("main")).not.toContainText("健全度スコアの説明");
  });
});
