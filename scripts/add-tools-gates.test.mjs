import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateGates, fetchRepoInfo } from "./add-tools-gates.mjs";

const NOW = Date.parse("2026-10-27T00:00:00Z");
const base = { archived: false, license: "MIT", pushedAt: "2026-10-20T00:00:00Z", stars: 5000, topics: [] };
const ev = (over, ctx) => evaluateGates({ ...base, ...over }, { now: NOW, ...ctx });

test("基準を満たす：却下も警告もない", () => {
  const r = ev({});
  assert.equal(r.verified, true);
  assert.deepEqual(r.reject, []);
  assert.deepEqual(r.warn, []);
});

test("取得できなければ未検証（却下でも合格でもない）", () => {
  const r = evaluateGates(null, { now: NOW });
  assert.equal(r.verified, false);
  assert.deepEqual(r.reject, []);
});

test("アーカイブ済みは却下", () => {
  assert.match(ev({ archived: true }).reject[0], /アーカイブ/);
});

test("ライセンス不明（null・NOASSERTION）は却下。Otherとソース公開型は警告で、却下しない", () => {
  assert.match(ev({ license: null }).reject[0], /ライセンスが不明/);
  assert.match(ev({ license: "NOASSERTION" }).reject[0], /ライセンスが不明/);
  const other = ev({ license: "Other" });
  assert.deepEqual(other.reject, []);
  assert.match(other.warn[0], /Other/);
  for (const l of ["BUSL-1.1", "FSL-1.1-MIT", "Elastic-2.0", "PolyForm-Noncommercial-1.0.0", "SSPL-1.0"]) {
    const r = ev({ license: l });
    assert.deepEqual(r.reject, [], l);
    assert.match(r.warn[0], /ソース公開型/, l);
  }
  assert.deepEqual(ev({ license: "AGPL-3.0" }).warn, []);
});

test("最終pushの線引き：364日はOK、365日で警告、730日で却下", () => {
  const at = (days) => new Date(NOW - days * 86400000).toISOString();
  assert.deepEqual(ev({ pushedAt: at(364) }).warn, []);
  const y = ev({ pushedAt: at(365) });
  assert.deepEqual(y.reject, []);
  assert.match(y.warn[0], /1年以上/);
  const z = ev({ pushedAt: at(729) });
  assert.deepEqual(z.reject, []);
  assert.match(ev({ pushedAt: at(730) }).reject[0], /2年以上前/);
});

test("Starが500未満は警告（理由の記録）。500以上は警告なし。Starが不明でも止めない", () => {
  assert.match(ev({ stars: 499 }).warn[0], /decisions\.json/);
  assert.deepEqual(ev({ stars: 500 }).warn, []);
  assert.deepEqual(ev({ stars: null }).warn, []);
});

test("ライブラリ・SDKのトピックは警告", () => {
  assert.match(ev({ topics: ["react", "Library"] }).warn[0], /ライブラリ/);
  assert.deepEqual(ev({ topics: ["react"] }).warn, []);
});

test("AIエージェントは、説明に【注意】が無ければ警告。あれば警告しない", () => {
  assert.match(ev({ topics: ["ai-agent"] }, { description: "説明" }).warn[0], /【注意】/);
  assert.deepEqual(ev({ topics: ["ai-agent"] }, { description: "【注意】権限が広い" }).warn, []);
});

test("却下の理由は複数まとめて返す", () => {
  const r = ev({ archived: true, license: null });
  assert.equal(r.reject.length, 2);
});

test("fetchRepoInfo：必要な項目だけ取り出し、失敗・例外は null", async () => {
  const ok = async () => ({
    ok: true,
    json: async () => ({ archived: false, license: { spdx_id: "MIT" }, pushed_at: "2026-10-01T00:00:00Z", stargazers_count: 12, topics: ["a"], secret: "x" }),
  });
  assert.deepEqual(await fetchRepoInfo("o/r", { fetchImpl: ok }), {
    archived: false, license: "MIT", pushedAt: "2026-10-01T00:00:00Z", stars: 12, topics: ["a"],
  });
  assert.equal(await fetchRepoInfo("o/r", { fetchImpl: async () => ({ ok: false, status: 403 }) }), null);
  assert.equal(await fetchRepoInfo("o/r", { fetchImpl: async () => { throw new Error("net"); } }), null);
});

test("fetchRepoInfo：トークンは Authorization にだけ載せ、無ければ付けない", async () => {
  let seen;
  const f = async (_u, init) => { seen = init.headers; return { ok: false }; };
  await fetchRepoInfo("o/r", { token: "tok", fetchImpl: f });
  assert.equal(seen.authorization, "Bearer tok");
  await fetchRepoInfo("o/r", { fetchImpl: f });
  assert.equal(seen.authorization, undefined);
});
