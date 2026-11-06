import { test, expect, horizontalOverflow } from "./fixtures";

test.describe("整合性・導線", () => {
  test("セキュリティ：Scorecard と報告窓口を分け、未評価や SECURITY.md 未検出を断定しない", async ({ page }) => {
    await page.goto("/tools/open-webui/");
    const main = page.locator("main");
    await expect(main).toContainText("OpenSSF Scorecard");
    await expect(main).toContainText("脆弱性の報告窓口");
    await expect(main).toContainText("SECURITY.mdは見つかりませんでした（他の窓口があるかは未確認）");
    await expect(main).not.toContainText("報告窓口が用意されていません");
    await expect(main).not.toContainText("窓口なし");

    // ミラーは「対象外」。点数でも未評価でもない
    await page.goto("/tools/ffmpeg/");
    await expect(page.locator("main")).toContainText("対象外");

    // Scorecard の -1（判定できず）を「未対応」と表示しない（Odoo は Dangerous-Workflow などが -1）
    await page.goto("/tools/odoo/");
    await expect(page.locator("main")).toContainText("判定できず");
    await expect(page.locator("main")).not.toContainText("× 未対応");
  });
});
