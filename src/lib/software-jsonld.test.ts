import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSoftwareApplicationJsonLd, checkSoftwareApplication, offersFor, CATEGORY_TO_GOOGLE, GOOGLE_APP_CATEGORIES, type PricingFact } from "./software-jsonld.ts";

const fact = (extra: Partial<PricingFact> = {}): PricingFact => ({ free_to_obtain: true, paid_options: true, basis: "official-statement", source_url: "https://example.com/pricing", checked_at: "2026-10-31", ...extra });
const tool = (extra = {}) => ({ id: "x", name: "X", url: "https://x.example.com", github_url: "https://github.com/o/x", description_ja: "説明", license: "MIT", category: "project", ...extra });
const build = (t = tool(), pricing: PricingFact | null = fact()) => buildSoftwareApplicationJsonLd({ tool: t, siteName: "ossalt.jp", siteUrl: "https://ossalt.jp", pricing });

test("価格の事実が無ければ、offers（価格）を出さない（推測で0を補わない）", () => {
  assert.equal("offers" in build(tool(), null), false);
  assert.equal("offers" in buildSoftwareApplicationJsonLd({ tool: tool(), siteName: "ossalt.jp", siteUrl: "https://ossalt.jp" }), false); // pricing を渡さない
  assert.equal("offers" in build(tool(), fact({ free_to_obtain: false })), false);
});

test("無料と確認できたOSIライセンスのツールだけ、price: 0（数値）を出す。有料の選択肢があれば、説明に書く（金額は書かない）", () => {
  const o = build().offers as Record<string, unknown>;
  assert.equal(o.price, 0);
  assert.equal(o.priceCurrency, "JPY");
  assert.match(String(o.description), /有料の選択肢/);
  assert.doesNotMatch(String(o.description), /[0-9０-９]+\s*(円|ドル|\$|€)/);
  const free = offersFor("MIT", fact({ paid_options: false }))!;
  assert.doesNotMatch(String(free.description), /有料/);
});

test("OSI承認でないライセンス（ソース公開型・混在・未確認）には、価格を付けない", () => {
  for (const lic of ["Sustainable Use License", "BUSL 1.1", "AGPL-3.0 / Metabase Commercial", null, ""]) {
    assert.equal(offersFor(lic as string | null, fact()), null, String(lic));
  }
});

test("出典のURLが https でない・確認日が不正な事実は、採用しない", () => {
  assert.equal(offersFor("MIT", fact({ source_url: "http://example.com" })), null);
  assert.equal(offersFor("MIT", fact({ checked_at: "昨日" })), null);
});

test("review・aggregateRating は決して付けない", () => {
  const ld = build();
  assert.equal("review" in ld, false);
  assert.equal("aggregateRating" in ld, false);
  const c = checkSoftwareApplication({ ...ld, aggregateRating: { ratingValue: 5 } });
  assert.ok(c.problems.some((p) => /レビュー/.test(p)));
});

test("applicationCategory は、Googleが対応する値だけ。対応が曖昧なら出さない", () => {
  assert.equal(build(tool({ category: "security" })).applicationCategory, "SecurityApplication");
  assert.equal("applicationCategory" in build(tool({ category: "nonexistent" })), false);
  for (const v of Object.values(CATEGORY_TO_GOOGLE)) if (v) assert.ok((GOOGLE_APP_CATEGORIES as readonly string[]).includes(v), String(v));
  const bad = checkSoftwareApplication({ "@type": "SoftwareApplication", name: "X", applicationCategory: "ノート・ドキュメント" });
  assert.ok(bad.problems.some((p) => /対応する値でない/.test(p)));
});

test("空・不正な URL は出さない（公式サイトが無いツール）", () => {
  assert.equal("url" in build(tool({ url: "" })), false);
  assert.equal("url" in build(tool({ url: "javascript:alert(1)" })), false);
  assert.equal(build(tool({ url: "https://x.example.com" })).url, "https://x.example.com");
});

test("検査：offers が無くても問題ではない（注記）。リッチリザルトの条件は、評価が無いため満たさない（方針どおり）", () => {
  const c = checkSoftwareApplication(build(tool({ license: "Sustainable Use License" }), fact()));
  assert.deepEqual(c.problems, []);
  assert.equal(c.richResultEligible, false);
  assert.ok(c.notes.some((n) => /offers なし/.test(n)));
  assert.ok(c.notes.some((n) => /実在しないレビューを作らない/.test(n)));
});

test("検査：価格の型・通貨の誤りを見つける", () => {
  assert.ok(checkSoftwareApplication({ "@type": "SoftwareApplication", name: "X", offers: { "@type": "Offer", price: "無料" } }).problems.some((p) => /数として読めない/.test(p)));
  const str = checkSoftwareApplication({ "@type": "SoftwareApplication", name: "X", offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" } });
  assert.deepEqual(str.problems, []); // 文字列の "0" は誤りではない（注記にとどめる）
  assert.ok(str.notes.some((n) => /文字列/.test(n)));
  assert.ok(checkSoftwareApplication({ "@type": "SoftwareApplication", name: "X", offers: { "@type": "Offer", price: 5 } }).problems.some((p) => /priceCurrency/.test(p)));
  assert.ok(checkSoftwareApplication({ "@type": "SoftwareApplication", name: "" }).problems.some((p) => /name/.test(p)));
});
