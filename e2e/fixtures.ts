import { test as base, expect, type Page } from "@playwright/test";

/**
 * 全テスト共通の土台。
 *  - localhost 以外への通信を遮断する（本番・計測・外部サイトに触らない。再現性のため）
 *  - JavaScript の例外と console.error を集め、テストの最後に1件でもあれば失敗にする
 */
export type PageProblems = string[];

export const test = base.extend<{ problems: PageProblems }>({
  problems: async ({ page }, use) => {
    const problems: PageProblems = [];
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "127.0.0.1" || url.hostname === "localhost") return route.continue();
      return route.abort("blockedbyclient"); // 外部への通信は遮断（エラーとしては数えない）
    });
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/ERR_BLOCKED_BY_CLIENT/.test(m.text())) {
        problems.push(`console.error: ${m.text()} (${m.location().url})`);
      }
    });
    await use(problems);
    expect(problems, "JavaScriptエラー／console.error").toEqual([]);
  },
});

export { expect };

/** 横スクロール（はみ出し）の幅を返す。0 なら問題なし。 */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
}

/** ページ内のJSON-LDをすべて読み取る（構文が壊れていれば例外）。 */
export async function readJsonLd(page: Page): Promise<Array<Record<string, unknown>>> {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  return raw.map((t) => JSON.parse(t));
}
