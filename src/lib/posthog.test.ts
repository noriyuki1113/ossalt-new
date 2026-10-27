import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePostHogConfig } from "./posthog/config-core.ts";
import { stripUrl, originOf, sanitizeProperties, linkDomain } from "./posthog/privacy.ts";
import { buildEvent, createDeduper, EVENT_NAMES } from "./posthog/events.ts";
import { CONSENT_KEY, readConsent, writeConsent, clearStoredIdentifiers } from "./posthog/consent.ts";

const ok = { token: "phc_abcDEF123", host: "https://us.i.posthog.com/", nodeEnv: "production", siteUrl: "https://ossalt.jp" };

/* ---- 設定 ---- */
test("設定: トークンとホストがそろい、本番ビルドのときだけ有効", () => {
  const c = resolvePostHogConfig(ok);
  assert.equal(c.enabled, true);
  assert.equal(c.host, "https://us.i.posthog.com"); // 末尾の / は落とす
  assert.deepEqual(c.allowedHosts, ["ossalt.jp", "www.ossalt.jp"]);
});

test("設定: 未設定・片方だけ・不正な値は、完全に無効（ビルドを壊さない）", () => {
  for (const env of [
    { ...ok, token: undefined },
    { ...ok, host: undefined },
    { ...ok, token: "" },
    { ...ok, token: "phx_personalApiKey123" }, // Personal API Key は受け付けない
    { ...ok, token: "not a token" },
    { ...ok, host: "javascript:alert(1)" },
    { ...ok, host: "https://example.com/path" },
  ]) {
    assert.equal(resolvePostHogConfig(env).enabled, false, JSON.stringify(env));
  }
});

test("設定: 開発（production以外）は、ENABLE_DEV=1のときだけ有効", () => {
  assert.equal(resolvePostHogConfig({ ...ok, nodeEnv: "development" }).enabled, false);
  assert.equal(resolvePostHogConfig({ ...ok, nodeEnv: "development", enableDev: "1" }).enabled, true);
  assert.equal(resolvePostHogConfig({ ...ok, nodeEnv: "test" }).enabled, false);
});

test("設定: ボット・自動操作の許可は、明示したときだけ（既定は送らない）", () => {
  assert.equal(resolvePostHogConfig(ok).allowAutomation, false);
  assert.equal(resolvePostHogConfig({ ...ok, allowAutomation: "1" }).allowAutomation, true);
  assert.equal(resolvePostHogConfig({ ...ok, allowAutomation: "true" }).allowAutomation, false);
});

test("設定: 許可ホストは、指定があればそれだけ（テスト用）", () => {
  assert.deepEqual(resolvePostHogConfig({ ...ok, allowedHosts: "127.0.0.1, LOCALHOST" }).allowedHosts, ["127.0.0.1", "localhost"]);
});

/* ---- URLの無害化 ---- */
test("URL: クエリ・ハッシュ・認証情報を落とし、オリジン＋パスだけにする", () => {
  assert.equal(stripUrl("https://ossalt.jp/tools/?q=notion&x=1#top"), "https://ossalt.jp/tools/");
  assert.equal(stripUrl("https://user:pw@ossalt.jp/cost-lab/?users=50&price=1200"), "https://ossalt.jp/cost-lab/");
  assert.equal(stripUrl("javascript:alert(1)"), "");
  assert.equal(stripUrl("not a url"), "");
  assert.equal(stripUrl(undefined), "");
});

test("URL: リファラはオリジンだけ", () => {
  assert.equal(originOf("https://www.google.com/search?q=secret+word"), "https://www.google.com");
  assert.equal(originOf("android-app://com.google.android.googlequicksearchbox"), "");
});

test("プロパティ: URL系・リファラ・IP・位置情報・$setを無害化する", () => {
  const out = sanitizeProperties({
    $current_url: "https://ossalt.jp/tools/?q=%E6%A9%9F%E5%AF%86",
    $referrer: "https://www.google.com/search?q=secret",
    $initial_referrer: "https://bing.com/search?q=x",
    $pathname: "/tools/?q=abc",
    $ip: "203.0.113.9",
    $geoip_city_name: "Tokyo",
    $set: { email: "a@example.com" },
    custom: "kept",
  });
  assert.equal(out.$current_url, "https://ossalt.jp/tools/");
  assert.equal(out.$referrer, "https://www.google.com");
  assert.equal(out.$initial_referrer, "https://bing.com");
  assert.equal(out.$pathname, "/tools/");
  for (const k of ["$ip", "$geoip_city_name", "$set"]) assert.equal(k in out, false, k);
  assert.equal(out.custom, "kept");
  assert.deepEqual(sanitizeProperties(undefined), {});
});

test("プロパティ: SDKが付ける未知のURL項目（$session_entry_url など）も、クエリ・ハッシュを落とす", () => {
  const out = sanitizeProperties({
    $session_entry_url: "https://ossalt.jp/tools/immich/?q=%E7%A4%BE%E5%A4%96%E7%A7%98&secret=abc#frag",
    $session_entry_referrer: "https://www.google.com/search?q=x",
    $some_future_url_prop: "https://ossalt.jp/x/?token=abc",
    $some_future_referrer_prop: "https://example.com/a/b?c=d",
    note: "https は文字列として残る（URLではない）",
  });
  assert.equal(out.$session_entry_url, "https://ossalt.jp/tools/immich/");
  assert.equal(out.$session_entry_referrer, "https://www.google.com");
  assert.equal(out.$some_future_url_prop, "https://ossalt.jp/x/");
  assert.equal(out.$some_future_referrer_prop, "https://example.com");
  assert.equal(out.note, "https は文字列として残る（URLではない）");
});

test("外部リンク: 公開先はドメイン名だけ。http(s)以外は null", () => {
  assert.equal(linkDomain("https://Immich.app/docs?x=1"), "immich.app");
  assert.equal(linkDomain("mailto:a@example.com"), null);
  assert.equal(linkDomain(""), null);
  assert.equal(linkDomain(null), null);
});

/* ---- イベント定義 ---- */
test("イベント: 仕様どおりの5つ", () => {
  assert.deepEqual([...EVENT_NAMES], ["oss_search_performed", "oss_detail_viewed", "saas_alternative_viewed", "external_oss_link_clicked", "oss_diagnosis_completed"]);
});

test("イベント: 検索は、絞り込みの種類と件数だけ。種類が空なら送らない。検索語は属性に存在しない", () => {
  const ev = buildEvent("oss_search_performed", { result_count: 12, filter_kinds: ["query", "docker", "query"], page_type: "tools_list" });
  assert.deepEqual(ev, { name: "oss_search_performed", props: { result_count: 12, filter_kinds: ["docker", "query"], page_type: "tools_list" } });
  assert.equal(buildEvent("oss_search_performed", { result_count: 3, filter_kinds: [], page_type: "tools_list" }), null);
  // 実行時に検索語が紛れ込んでも、出力に含まれない
  const leaked = buildEvent("oss_search_performed", { result_count: 1, filter_kinds: ["query"], page_type: "tools_list", query: "社外秘" } as never);
  assert.ok(!JSON.stringify(leaked).includes("社外秘"));
});

test("イベント: 詳細閲覧・代替ページ閲覧・外部リンク・診断。slugの形でない値（検索語など）は送らない", () => {
  assert.deepEqual(buildEvent("oss_detail_viewed", { slug: "immich", category: "files", license_class: "copyleft-network" })?.props, { slug: "immich", category: "files", license_class: "copyleft-network" });
  assert.equal(buildEvent("oss_detail_viewed", { slug: "社外秘 メモ", category: "files", license_class: "mit" }), null);
  assert.equal(buildEvent("oss_detail_viewed", { slug: "a@example.com", category: "files", license_class: "mit" }), null);
  assert.deepEqual(buildEvent("saas_alternative_viewed", { slug: "notion", candidate_count: 6 })?.props, { slug: "notion", candidate_count: 6 });
  assert.equal(buildEvent("saas_alternative_viewed", { slug: "Not Valid", candidate_count: 6 }), null);
  assert.deepEqual(buildEvent("external_oss_link_clicked", { link_kind: "official", slug: "immich", domain: "immich.app" })?.props, { link_kind: "official", slug: "immich", domain: "immich.app" });
  assert.equal(buildEvent("external_oss_link_clicked", { link_kind: "official", slug: "immich", domain: "https://immich.app/?q=x" }), null);
  assert.equal(buildEvent("external_oss_link_clicked", { link_kind: "evil" as never, slug: "immich", domain: "immich.app" }), null);
  assert.deepEqual(buildEvent("oss_diagnosis_completed", { saas: "notion", recommended_count: 4, conditions: ["japanese_true", "budget_low", "japanese_true"] })?.props, { saas: "notion", recommended_count: 4, conditions: ["budget_low", "japanese_true"] });
  assert.equal(buildEvent("oss_diagnosis_completed", { saas: "notion", recommended_count: 4, conditions: ["自由記述 です"] }), null);
});

test("イベント: 件数は0以上の整数に丸める", () => {
  assert.equal(buildEvent("saas_alternative_viewed", { slug: "notion", candidate_count: -5 })?.props.candidate_count, 0);
  assert.equal(buildEvent("saas_alternative_viewed", { slug: "notion", candidate_count: 3.9 })?.props.candidate_count, 3);
  assert.equal(buildEvent("saas_alternative_viewed", { slug: "notion", candidate_count: Number.NaN })?.props.candidate_count, 0);
});

test("重複: 同じキーは1回だけ。resetで、遷移後に再び送れる", () => {
  const d = createDeduper();
  assert.equal(d.first("oss_detail_viewed:immich"), true);
  assert.equal(d.first("oss_detail_viewed:immich"), false); // StrictModeの二重実行・再レンダリング
  assert.equal(d.first("oss_detail_viewed:gitea"), true);
  d.reset();
  assert.equal(d.first("oss_detail_viewed:immich"), true);
});

/* ---- 同意 ---- */
function memoryStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    _m: m,
  };
}

test("同意: 未選択・不正な値・保存先なしは、すべて「未選択」（＝送らない）", () => {
  assert.equal(readConsent(memoryStorage()), "unset");
  assert.equal(readConsent(memoryStorage({ [CONSENT_KEY]: "yes" })), "unset");
  assert.equal(readConsent(null), "unset");
  assert.equal(readConsent({ getItem: () => { throw new Error("blocked"); }, setItem() {}, removeItem() {} }), "unset");
});

test("同意: 同意・拒否を保存して読み戻せる。保存できなければ false", () => {
  const st = memoryStorage();
  assert.equal(writeConsent("granted", st), true);
  assert.equal(readConsent(st), "granted");
  assert.equal(writeConsent("denied", st), true);
  assert.equal(readConsent(st), "denied");
  assert.equal(writeConsent("granted", null), false);
});

test("撤回: PostHogが端末に残したキー（ph_・__ph_）だけを消し、同意の記録とほかのキーは残す", () => {
  const st = memoryStorage({ ph_phc_x_posthog: "1", __ph_opt_in_out_phc_x: "0", [CONSENT_KEY]: "denied", theme: "light" });
  clearStoredIdentifiers(st);
  assert.deepEqual([...st._m.keys()].sort(), [CONSENT_KEY, "theme"].sort());
});
