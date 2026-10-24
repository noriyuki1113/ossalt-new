import { test, expect } from "./fixtures";

test.describe("OSS診断", () => {
  test("最後まで答えると結果ページに移動し、戻る操作もできる", async ({ page }) => {
    await page.goto("/diagnosis/");
    const options = page.locator(".diag-option");

    await expect(page.locator("#diag-q-title")).toContainText("SaaS");
    await options.first().click(); // SaaS
    await expect(page.locator(".diag-progress__label")).toContainText("2 /");

    await page.getByRole("button", { name: "← 戻る" }).click();
    await expect(page.locator(".diag-progress__label")).toContainText("1 /");
    await options.first().click();

    await options.first().click(); // 人数
    await options.first().click(); // 技術レベル
    await options.first().click(); // ホスティング

    // 重視するもの：2つまで。3つ目は選べない
    const strengths = page.locator(".diag-option");
    await strengths.nth(0).click();
    await strengths.nth(1).click();
    await expect(strengths.nth(2)).toBeDisabled();
    await page.getByRole("button", { name: "次へ" }).click();

    await page.locator(".diag-option--other").click(); // 絶対に必要な機能：特になし
    await page.getByRole("button", { name: "次へ" }).click();

    // 利用の条件（任意）：日本語と商用利用を選ぶ
    await expect(page.locator(".diag-progress__label")).toContainText("7 /");
    await page.getByRole("button", { name: "日本語の画面で使いたい" }).click();
    await page.getByRole("button", { name: /商用利用/ }).click();
    await page.getByRole("button", { name: "診断結果を見る" }).click();

    await expect(page).toHaveURL(/\/diagnosis\/result\/\?.*needs=ja%2Ccommercial/);
    await expect(page.locator("main")).toContainText(/一致|候補|診断結果/);
    await expect(page.locator("main a[href^='/tools/']").first()).toBeVisible();
    // 条件ごとの根拠（ライセンス・日本語）と、Cost Lab への導線
    await expect(page.locator("main")).toContainText(/ライセンス/);
    await expect(page.locator("main")).toContainText(/日本語/);
    await expect(page.locator("main a[href^='/cost-lab/?saas=']").first()).toBeVisible();
  });

  test("キーボードだけで選択・戻る操作ができる（Tab / Enter / Space）", async ({ page }) => {
    await page.goto("/diagnosis/");
    const label = page.locator(".diag-progress__label");
    const options = page.locator(".diag-option");

    // Tab で選択肢に到達でき、Enter で選べる
    const first = options.first();
    await expect(label).toContainText("1 /");
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(label).toContainText("2 /");

    // 戻るボタンへ Tab だけで到達でき、Enter で戻れる
    const back = page.getByRole("button", { name: "← 戻る" });
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    let reached = false;
    for (let i = 0; i < 30 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await back.evaluate((el) => el === document.activeElement);
    }
    expect(reached).toBe(true);
    await page.keyboard.press("Enter");
    await expect(label).toContainText("1 /");

    // Space でも選べる
    await options.first().focus();
    await page.keyboard.press("Space");
    await expect(label).toContainText("2 /");
  });

  test("結果ページは検索に載せない（noindex）", async ({ page }) => {
    await page.goto("/diagnosis/result/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("Cost Lab", () => {
  test("入力前は結果を出さず、例の値で計算できる", async ({ page }) => {
    await page.goto("/cost-lab/");
    await expect(page.locator(".costlab__verdict")).toHaveCount(0);
    await page.getByRole("button", { name: /例の値を入れる/ }).click();
    await expect(page.getByText("仮入力です。").first()).toBeVisible();
    // 例の値: 1,000円×20人 ×36か月 = 720,000円（SaaS）
    await expect(page.locator(".costlab__verdict")).toBeVisible();
    await expect(page.locator(".stat__num").first()).toHaveText("720,000円");
  });

  test("手入力で計算し、期間を変えると結果が変わる", async ({ page }) => {
    await page.goto("/cost-lab/");
    const fill = (label: string, v: string) => page.getByLabel(label, { exact: false }).first().fill(v);
    await fill("SaaSの1人あたりの月額", "1000");
    await fill("使う人数", "10");
    await fill("サーバー（VPSなど）の月額", "1500");
    await fill("運用にかける時間", "2");
    await fill("運用する人の時間あたりの費用", "3000");
    await fill("移行・構築にかかる時間", "10");
    await expect(page.locator(".costlab__verdict")).toBeVisible();
    await expect(page.locator(".stat__num").first()).toHaveText("360,000円"); // 10,000円×36か月
    await page.locator("select.select").last().selectOption("1");
    await expect(page.locator(".stat__num").first()).toHaveText("120,000円");
  });

  test("不正な値はエラーを出して結果を出さない", async ({ page }) => {
    await page.goto("/cost-lab/");
    await page.getByRole("button", { name: /例の値を入れる/ }).click();
    const users = page.getByLabel("使う人数", { exact: false }).first();
    await users.fill("-5");
    await expect(users).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".costlab__verdict")).toHaveCount(0);
  });

  test("URLのパラメータから値を読み込める（不正値は無視）", async ({ page }) => {
    await page.goto("/cost-lab/?pu=abc&u=7");
    await expect(page.getByLabel("使う人数", { exact: false }).first()).toHaveValue("7");
    await expect(page.getByLabel("SaaSの1人あたりの月額", { exact: false }).first()).toHaveValue("");
  });
});
