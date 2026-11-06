import { test, expect, horizontalOverflow } from "./fixtures";

/**
 * 同じツールの情報を、どのページでも同じ意味で示すことの確認（ライセンスの例外・セキュリティの状態・期間の表記）と、
 * トップの導線（カテゴリの開閉・検索の近くの導線）。
 */
test.describe("情報の整合性", () => {
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

  test("変化レポート：7日間と断定せず、対象期間の定義を見出しの近くに出す", async ({ page }) => {
    await page.goto("/changes/");
    const sec = page.locator("#stars-heading").locator("..").locator("..");
    await expect(page.locator("#stars-heading")).toContainText("直近約1週間");
    await expect(sec).toContainText("対象期間");
    await expect(page.locator("main")).not.toContainText("7日間の実測");
  });

  test("指標の名称：「健全度」ではなく「注目度・規模の目安」と表示し、保証ではないことを示す", async ({ page }) => {
    await page.goto("/tools/n8n/");
    await expect(page.locator("main")).toContainText("注目度・規模");
    await expect(page.locator("main")).not.toContainText("健全度スコアの説明");
  });
});

test.describe("トップの導線", () => {
  test("検索の近くに、診断（対象のSaaSつき）と費用比較への導線がある", async ({ page }) => {
    await page.goto("/");
    const paths = page.getByRole("list", { name: "検索以外の探し方" });
    await expect(paths.getByRole("link", { name: /質問に答えて候補を探す/ })).toHaveAttribute("href", "/diagnosis/");
    await expect(paths.getByRole("link", { name: /運用・移行費用を比較する/ })).toHaveAttribute("href", "/cost-lab/");
    await expect(paths).toContainText("対象：Notion");
    await expect(page).toHaveTitle("SaaSの代替OSSを日本語で比較｜ossalt.jp");
  });

  test("カテゴリ：小さい画面では先頭8件と開閉ボタン、大きい画面では全件", async ({ page, isMobile }) => {
    await page.goto("/");
    const tiles = page.locator(".cat-tiles .cat-tile");
    const total = await tiles.count();
    expect(total).toBeGreaterThan(8);
    const visible = async () => (await tiles.evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length));
    const toggle = page.getByRole("button", { name: /すべてのカテゴリを見る/ });
    if (isMobile) {
      expect(await visible()).toBe(8);
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("button", { name: "カテゴリを少なく表示する" })).toHaveAttribute("aria-expanded", "true");
      expect(await visible()).toBe(total);
    } else {
      expect(await visible()).toBe(total);
      await expect(toggle).toBeHidden();
    }
    // 全カテゴリへの到達手段（一覧へのリンク）は常にある
    await expect(page.getByRole("link", { name: /カテゴリ一覧/ })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});
