/**
 * 計測（PostHog）のE2E。テスト専用のダミートークンを埋め込んだビルド（out-analytics-e2e/）を使う。
 * PostHog のサーバーには接続しない：ホストは http://127.0.0.1:4599 で、リクエストはここで受けて記録するだけ（モック）。
 * 実際のPostHogプロジェクトへの送信は、このテストの範囲外（運営者がトークンを設定した後に、実画面で確認する）。
 */
import { test as base, expect, type Page, type BrowserContext } from "@playwright/test";
import { gunzipSync } from "node:zlib";

const HOST = "http://127.0.0.1:4599";
type Captured = { url: string; path: string; events: Array<{ event: string; properties: Record<string, unknown> }>; raw: string };

function decodeBody(buf: Buffer | null, url: string): string {
  if (!buf || buf.length === 0) return "";
  try {
    // 圧縮あり（compression=gzip-js）のときはgzip。なければそのままか、data=<base64> の形
    if (buf[0] === 0x1f && buf[1] === 0x8b) return gunzipSync(buf).toString("utf8");
    const text = buf.toString("utf8");
    if (text.startsWith("data=")) return Buffer.from(decodeURIComponent(text.slice(5)), "base64").toString("utf8");
    return text;
  } catch {
    return buf.toString("utf8");
  }
}

function parseEvents(raw: string): Captured["events"] {
  if (!raw) return [];
  try {
    const j = JSON.parse(raw);
    const list = Array.isArray(j) ? j : Array.isArray(j?.batch) ? j.batch : [j];
    return list.filter((e: { event?: unknown }) => e && typeof e.event === "string");
  } catch {
    return [];
  }
}

const test = base.extend<{ posthog: { requests: Captured[]; events: () => Captured["events"]; clear: () => void } }>({
  posthog: async ({ context }, use) => {
    const requests: Captured[] = [];
    await context.route(`${HOST}/**`, async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      if (req.method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, GET" } });
      }
      const raw = decodeBody(req.postDataBuffer(), req.url());
      requests.push({ url: req.url(), path: u.pathname, events: parseEvents(raw), raw });
      return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "content-type": "application/json" }, body: JSON.stringify({ status: 1 }) });
    });
    // ほかの外部への通信は遮断（フォント等）
    await context.route("**/*", (route) => {
      const h = new URL(route.request().url()).hostname;
      return h === "127.0.0.1" || h === "localhost" ? route.fallback() : route.abort("blockedbyclient");
    });
    await use({ requests, events: () => requests.flatMap((r) => r.events), clear: () => requests.splice(0) });
  },
});

async function flush(page: Page) {
  // SDKは数百ミリ秒ごとにまとめて送る。送信が済むのを待つ
  await page.waitForTimeout(1500);
}
async function storageKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(window.localStorage));
}
const names = (evs: Captured["events"]) => evs.map((e) => e.event);

test.describe("同意前・拒否", () => {
  test("同意前：バナーが出て、通信ゼロ・端末への保存ゼロ・Cookieゼロ", async ({ page, context, posthog }) => {
    await page.goto("/tools/immich/?q=社外秘");
    await expect(page.getByRole("dialog", { name: /計測/ })).toBeVisible();
    await page.getByRole("link", { name: "公式サイト" }).first().evaluate((a) => a.addEventListener("click", (e) => e.preventDefault()));
    await page.getByRole("link", { name: "公式サイト" }).first().click();
    await flush(page);
    expect(posthog.requests, "同意前に PostHog へ通信してはいけない").toEqual([]);
    expect((await storageKeys(page)).filter((k) => /ph_/.test(k))).toEqual([]);
    expect(await context.cookies()).toEqual([]);
  });

  test("拒否：バナーが閉じ、以後ページを移動しても通信ゼロ。再読み込みしてもバナーは出ない", async ({ page, posthog }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "同意しない" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto("/tools/immich/");
    await page.goto("/alternatives/notion/");
    await page.goto("/tools/?q=notion");
    await flush(page);
    expect(posthog.requests).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem("ossalt_analytics_consent_v1"))).toBe("denied");
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("同意後", () => {
  test("同意：ページ表示が1回だけ送られ、詳細閲覧・外部リンクのイベントが正しい属性で届く。クエリは含まれない", async ({ page, context, posthog }) => {
    await page.goto("/tools/immich/?q=社外秘&secret=abc#frag");
    await page.getByRole("button", { name: "同意する" }).click();
    await flush(page);
    const evs = posthog.events();
    expect(names(evs).filter((n) => n === "$pageview")).toHaveLength(1);
    const detail = evs.filter((e) => e.event === "oss_detail_viewed");
    expect(detail, "詳細閲覧は同意した時点で1回").toHaveLength(1);
    expect(detail[0].properties).toMatchObject({ slug: "immich", category: expect.any(String), license_class: expect.any(String) });

    // 外部リンク（遷移はさせない）
    await page.getByRole("link", { name: "公式サイト" }).first().evaluate((a) => a.addEventListener("click", (e) => e.preventDefault()));
    await page.getByRole("link", { name: "公式サイト" }).first().click();
    await page.getByRole("link", { name: "GitHub", exact: true }).first().evaluate((a) => a.addEventListener("click", (e) => e.preventDefault()));
    await page.getByRole("link", { name: "GitHub", exact: true }).first().click();
    await flush(page);
    const links = posthog.events().filter((e) => e.event === "external_oss_link_clicked");
    expect(links.map((l) => l.properties.link_kind).sort()).toEqual(["github", "official"]);
    for (const l of links) {
      expect(l.properties.slug).toBe("immich");
      expect(String(l.properties.domain)).toMatch(/^[a-z0-9.-]+$/);
    }

    // どのイベントにも、検索語・クエリ・ハッシュが入っていない
    const everything = posthog.requests.map((r) => r.raw).join("\n");
    for (const forbidden of ["社外秘", "%E7%A4%BE", "secret=abc", "#frag", "?q="]) {
      expect(everything, `送信内容に「${forbidden}」が含まれている`).not.toContain(forbidden);
    }
    // Cookie は使わない（localStorageのみ）
    expect(await context.cookies()).toEqual([]);
  });

  test("同意後に再読み込み：バナーは出ず、ページ表示・詳細閲覧は1回ずつ（二重送信なし）", async ({ page, posthog }) => {
    await page.goto("/tools/gitea/");
    await page.getByRole("button", { name: "同意する" }).click();
    await flush(page);
    posthog.clear();
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await flush(page);
    const evs = posthog.events();
    expect(names(evs).filter((n) => n === "$pageview")).toHaveLength(1);
    expect(names(evs).filter((n) => n === "oss_detail_viewed")).toHaveLength(1);
  });

  test("サイト内の移動（ルート遷移）：新しいページごとに1回ずつ。同じページに戻っても重複しない", async ({ page, posthog }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "同意する" }).click();
    await flush(page);
    posthog.clear();
    await page.getByRole("link", { name: "ツール一覧" }).first().click();
    await expect(page).toHaveURL(/\/tools\/$/);
    await flush(page);
    expect(names(posthog.events()).filter((n) => n === "$pageview")).toHaveLength(1);
  });

  test("代替ページ：saas_alternative_viewed に slug と候補数", async ({ page, posthog }) => {
    await page.goto("/alternatives/notion/");
    await page.getByRole("button", { name: "同意する" }).click();
    await flush(page);
    const ev = posthog.events().filter((e) => e.event === "saas_alternative_viewed");
    expect(ev).toHaveLength(1);
    expect(ev[0].properties).toMatchObject({ slug: "notion", candidate_count: expect.any(Number) });
    expect(Number(ev[0].properties.candidate_count)).toBeGreaterThan(0);
  });

  test("一覧の絞り込み：oss_search_performed は種類と件数だけ。検索語は送らない", async ({ page, posthog }) => {
    await page.goto("/tools/");
    await page.getByRole("button", { name: "同意する" }).click();
    await flush(page);
    posthog.clear();
    await page.getByRole("searchbox").fill("immich");
    await page.waitForTimeout(2500);
    const ev = posthog.events().filter((e) => e.event === "oss_search_performed");
    expect(ev).toHaveLength(1);
    expect(ev[0].properties).toMatchObject({ filter_kinds: ["query"], page_type: "tools_list", result_count: expect.any(Number) });
    expect(posthog.requests.map((r) => r.raw).join("\n")).not.toMatch(/immich"\s*[,}]\s*$|"query":\s*"immich/);
    expect(JSON.stringify(ev)).not.toContain("immich");
  });

  test("診断の完了：oss_diagnosis_completed に、SaaS・件数・条件の分類だけ（URLの答えの文字列は含めない）", async ({ page, posthog }) => {
    await page.goto("/diagnosis/result/?saas=notion&team=solo&skill=1&hosting=selfhost&strengths=active&features=wiki&needs=commercial");
    await page.getByRole("button", { name: "同意する" }).click();
    await flush(page);
    const ev = posthog.events().filter((e) => e.event === "oss_diagnosis_completed");
    expect(ev).toHaveLength(1);
    expect(ev[0].properties).toMatchObject({ saas: "notion", recommended_count: expect.any(Number) });
    expect(ev[0].properties.conditions).toEqual(expect.arrayContaining(["team_solo", "hosting_selfhost", "need_commercial"]));
    expect(posthog.requests.map((r) => r.raw).join("\n")).not.toContain("features=wiki");
  });
});

test.describe("自動取得・録画・フラグは無効", () => {
  test("同意後にページ内を操作しても、autocapture・セッション録画・フラグ取得の通信が無い", async ({ page, posthog }) => {
    await page.goto("/tools/");
    await page.getByRole("button", { name: "同意する" }).click();
    await flush(page);
    await page.getByRole("button", { name: "カード" }).click();
    await page.getByRole("button", { name: "一覧" }).click();
    await page.mouse.click(300, 300);
    await page.mouse.click(300, 300);
    await page.mouse.click(300, 300);
    await flush(page);
    const evs = names(posthog.events());
    expect(evs.filter((n) => n === "$autocapture")).toEqual([]);
    expect(evs.filter((n) => n === "$rageclick" || n === "$dead_click" || n === "$snapshot" || n === "$exception")).toEqual([]);
    const paths = posthog.requests.map((r) => r.path);
    expect(paths.filter((p) => /\/s\/|\/ses\/|\/flags|\/decide|\/surveys|\/array\//.test(p)), "録画・フラグ・アンケートの通信").toEqual([]);
    // 許可した種類のイベントだけ
    const allowed = new Set(["$pageview", "oss_search_performed", "oss_detail_viewed", "saas_alternative_viewed", "external_oss_link_clicked", "oss_diagnosis_completed", "$opt_in", "$identify"]);
    for (const n of evs) expect(allowed.has(n), `想定外のイベント: ${n}`).toBe(true);
  });
});

test.describe("撤回", () => {
  test("同意→フッターの「計測の設定」で同意しない：以後の送信が止まり、端末のPostHogのキーが消える", async ({ page, posthog }) => {
    await page.goto("/tools/immich/");
    await page.getByRole("button", { name: "同意する" }).click();
    await flush(page);
    expect(posthog.events().length).toBeGreaterThan(0);
    expect((await storageKeys(page)).some((k) => /ph_/.test(k))).toBe(true);

    await page.getByRole("button", { name: "計測の設定" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "同意しない" }).click();
    await flush(page);
    posthog.clear();
    expect((await storageKeys(page)).filter((k) => /ph_/.test(k))).toEqual([]);

    await page.goto("/tools/gitea/");
    await page.goto("/alternatives/notion/");
    await page.getByRole("link", { name: "公式サイト" }).first().count();
    await flush(page);
    expect(posthog.requests, "撤回後に PostHog へ通信してはいけない").toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem("ossalt_analytics_consent_v1"))).toBe("denied");
  });

  test("拒否→あとで同意に変更できる", async ({ page, posthog }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "同意しない" }).click();
    await page.getByRole("button", { name: "計測の設定" }).click();
    await page.getByRole("button", { name: "同意する" }).click();
    await flush(page);
    expect(names(posthog.events())).toContain("$pageview");
  });
});

test.describe("許可されたホストだけ", () => {
  test("許可リストにないホスト名では、バナーも通信も出ない", async ({ browser, baseURL }) => {
    const ctx: BrowserContext = await browser.newContext();
    const sent: string[] = [];
    await ctx.route(`${HOST}/**`, (route) => {
      sent.push(route.request().url());
      return route.fulfill({ status: 200, body: "{}" });
    });
    const page = await ctx.newPage();
    // ホスト名だけ「許可リストにない名前」にして、中身は同じビルドを返す
    await page.route("http://not-allowed.test/**", async (route) => {
      const u = new URL(route.request().url());
      const r = await ctx.request.get(`${baseURL}${u.pathname}`);
      await route.fulfill({ status: r.status(), headers: { "content-type": r.headers()["content-type"] ?? "text/html" }, body: await r.body() });
    });
    await page.goto("http://not-allowed.test/");
    await page.waitForTimeout(1200);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "計測の設定" })).toHaveCount(0);
    expect(sent).toEqual([]);
    await ctx.close();
  });
});
