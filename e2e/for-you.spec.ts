import { test, expect, horizontalOverflow } from "./fixtures";

test.describe("OSSALT For You：条件を選ぶと、理由つきの候補が変わる", () => {
  test("SaaSを選ぶと候補と理由が出て、条件を変えると結果が実際に変わる", async ({ page, problems }) => {
    await page.goto("/for-you/");
    await expect(page.getByRole("heading", { level: 1, name: /OSSALT For You/ })).toBeVisible();
    await expect(page.getByText("まず「何の代わりを探すか」を選んでください")).toBeVisible();

    await page.getByRole("combobox").first().selectOption("notion");
    await expect(page).toHaveURL(/saas=notion/);
    const cards = page.locator(".fy-card");
    await expect(cards.first()).toBeVisible();
    await expect(cards.first().getByRole("heading", { name: "おすすめする理由" })).toBeVisible();
    await expect(cards.first()).toContainText("Notionの代替として掲載している");
    const summary = page.locator(".fy-summary");
    const before = await summary.innerText();
    const namesBefore = await cards.locator(".fy-card__name").allInnerTexts();

    // ライセンスの条件を「許容型だけ」にすると、除外が増えて結果が変わる
    await page.getByRole("combobox", { name: /^ライセンス/ }).selectOption("permissive");
    await expect(page).toHaveURL(/license=permissive/);
    await expect(summary).not.toHaveText(before);
    const namesAfter = await cards.locator(".fy-card__name").allInnerTexts();
    expect(namesAfter).not.toEqual(namesBefore);
    await page.getByText(/条件に合わず除外した候補/).click();
    await expect(page.locator(".fy-excluded")).toContainText("（条件：許容型（MIT・Apacheなど）だけ）");

    // 評価の内訳は、採点の項目と重みを表示する
    await cards.first().locator("summary").click();
    await expect(cards.first().locator(".rank-why__table")).toContainText("用途・機能への適合度");
    expect(problems).toEqual([]);
  });

  test("URLの条件から復元され、不正な値でも壊れない", async ({ page, problems }) => {
    await page.goto("/for-you/?saas=slack&profile=team&skill=9&license=evil&docker=1");
    await expect(page.locator(".fy-card").first()).toBeVisible();
    await expect(page.getByRole("radio", { name: "企業・チーム" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Dockerで動かしたい" })).toBeChecked();
    await expect(page.getByRole("combobox", { name: /^ライセンス/ })).toHaveValue("any");
    expect(problems).toEqual([]);
  });

  test("推薦用データを読み込めないときは、再試行できるエラーを表示する", async ({ page }) => {
    await page.route("**/for-you/catalog.json", (r) => r.fulfill({ status: 500, body: "x" }));
    await page.goto("/for-you/?saas=notion");
    await expect(page.locator(".fy-results [role=alert]")).toContainText("推薦用のデータを読み込めませんでした");
    await expect(page.getByRole("button", { name: "もう一度読み込む" })).toBeVisible();
  });

  test("条件に合う候補が0件のときは、条件を外すボタンを出す", async ({ page }) => {
    await page.goto("/for-you/?saas=notion&license=permissive&docker=1&ja=1&features=wiki,database,realtimeCollaboration,mobile,api,fileAttachment,permissions,docs");
    const empty = page.getByText("条件に合うOSSが見つかりませんでした。");
    const cards = page.locator(".fy-card");
    await expect(empty.or(cards.first())).toBeVisible();
    if (await empty.isVisible()) {
      await page.getByRole("button", { name: /の条件を外す/ }).first().click();
      await expect(page).toHaveURL(/saas=notion/);
    }
  });

  test("スマートフォンの幅でも横にはみ出さず、キーボードで条件を変えられる", async ({ page, problems }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto("/for-you/?saas=notion");
    await expect(page.locator(".fy-card").first()).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);
    const beginner = page.getByRole("radio", { name: "OSSは初めて" });
    await beginner.focus();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/profile=beginner/);
    expect(problems).toEqual([]);
  });

  test("診断結果から条件を引き継いでFor Youを開ける", async ({ page }) => {
    await page.goto("/diagnosis/result/?saas=notion&team=solo&skill=1&hosting=selfhost&strengths=active&features=wiki&needs=commercial");
    const link = page.getByRole("link", { name: "OSSALT For Youで条件を調整する" });
    test.skip((await link.count()) === 0, "機能フラグ（NEXT_PUBLIC_FEATURE_FOR_YOU）が無効なビルド");
    await link.click();
    await expect(page).toHaveURL(/\/for-you\/\?saas=notion/);
    await expect(page.getByRole("checkbox", { name: "会社の業務で使う（商用利用）" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "保守状況を重視" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Wiki" })).toBeChecked();
  });
});
