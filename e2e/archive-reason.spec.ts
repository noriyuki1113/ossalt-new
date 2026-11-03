import { test, expect, horizontalOverflow } from "./fixtures";

/**
 * アーカイブ済みのツール：GitHub のアーカイブは理由を区別しない。
 * 公式の記載を確認できたものは区分と出典を出し、確認できないものは「開発終了」と断定しない。
 */
test.describe("アーカイブの理由の表示", () => {
  test("File Browser：保守終了とセキュリティ修正がないことを、警告として出す", async ({ page, problems }) => {
    await page.goto("/tools/filebrowser/");
    const notice = page.locator(".notice--warn", { hasText: "保守が終了しました" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("セキュリティ修正はない");
    await expect(notice).toContainText("インターネットに直接公開せず");
    await expect(notice.getByRole("link", { name: "出典" })).toHaveAttribute("href", /github\.com\/filebrowser\/filebrowser/);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test("Flowise：開発終了と、EOLの日付・発表へのリンクを出す", async ({ page, problems }) => {
    await page.goto("/tools/flowise/");
    const notice = page.locator(".notice--warn", { hasText: "開発が終了しました" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("2026-08-31にEOL");
    await expect(notice.getByRole("link", { name: "出典" })).toHaveAttribute("href", "https://github.com/FlowiseAI/Flowise/discussions/6727");
    expect(problems).toEqual([]);
  });

  test("後継へ移った Luckysheet・undb は、案内（青）として、後継のページへリンクする", async ({ page }) => {
    for (const [id, successor] of [["luckysheet", "univer"], ["undb", "teable"]] as const) {
      await page.goto(`/tools/${id}/`);
      const notice = page.locator(".notice--info", { hasText: "後継のプロジェクトへ移りました" });
      await expect(notice, id).toBeVisible();
      await expect(notice.locator(`a[href="/tools/${successor}/"]`), id).toBeVisible();
    }
  });

  test("理由を確認できないもの（Peppermint・OhMyForm）は、「開発終了」と断定しない", async ({ page }) => {
    for (const id of ["peppermint", "ohmyform"]) {
      await page.goto(`/tools/${id}/`);
      const notice = page.locator(".notice--warn", { hasText: "理由・後継は公式に記載が確認できません" });
      await expect(notice, id).toBeVisible();
      await expect(page.getByText("開発は終了しています")).toHaveCount(0);
    }
  });

  test("アーカイブされていないツールには、出さない", async ({ page }) => {
    await page.goto("/tools/pocketbase/");
    await expect(page.getByText("保守が終了しました")).toHaveCount(0);
    await expect(page.getByText("GitHubでアーカイブされています")).toHaveCount(0);
  });
});
