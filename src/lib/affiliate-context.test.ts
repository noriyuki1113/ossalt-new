import { test } from "node:test";
import assert from "node:assert/strict";
import { runtimeKind, vpsLedeFor, vpsPlacementFor, vpsPlacementForTools } from "./affiliate-context.ts";

test("サーバーで動かすツールにだけVPSの紹介枠を出す", () => {
  const n8n = vpsPlacementFor({ id: "n8n", name: "n8n", github_archived: false });
  assert.equal(n8n.show, true);
  if (n8n.show) assert.match(n8n.title, /n8nを自分のサーバーで動かすには/);
  // Docker未確認でもサーバー用のもの（未確認は非対応ではない）
  assert.equal(vpsPlacementFor({ id: "nextcloud", name: "Nextcloud", github_archived: false }).show, true);
});

test("パソコンのアプリ・道具・GPUが要るもの・アーカイブ済みには出さない", () => {
  assert.deepEqual(vpsPlacementFor({ id: "gimp", name: "GIMP", github_archived: false }), { show: false, reason: "client" });
  assert.deepEqual(vpsPlacementFor({ id: "ffmpeg", name: "FFmpeg", github_archived: false }), { show: false, reason: "tool" });
  assert.deepEqual(vpsPlacementFor({ id: "comfyui", name: "ComfyUI", github_archived: false }), { show: false, reason: "gpu" });
  assert.deepEqual(vpsPlacementFor({ id: "n8n", name: "n8n", github_archived: true }), { show: false, reason: "archived" });
});

test("分類の一覧に重複がない", () => {
  for (const id of ["gimp", "ffmpeg", "comfyui"]) assert.notEqual(runtimeKind(id), "server");
});

test("前置きの文言は用途に合わせて1文だけ変え、数値は書かない", () => {
  const immich = vpsPlacementFor({ id: "immich", name: "Immich", github_archived: false, category: "files" });
  assert.equal(immich.show && immich.variant, "storage");
  if (immich.show) assert.match(immich.lede, /バックアップ/);
  const kuma = vpsPlacementFor({ id: "uptime-kuma", name: "Uptime Kuma", github_archived: false, category: "observability" });
  assert.equal(kuma.show && kuma.variant, "monitoring");
  const crm = vpsPlacementFor({ id: "twenty", name: "Twenty", github_archived: false, category: "crm" });
  assert.equal(crm.show && crm.variant, "general");
  for (const p of [immich, kuma, crm]) if (p.show) assert.doesNotMatch(p.lede, /\d+\s*(GB|MB|コア|vCPU)/);
});

const t = (id: string, name: string, extra: { category?: string; github_archived?: boolean } = {}) => ({
  id,
  name,
  github_archived: false,
  ...extra,
});

test("比較ページ：両方ともパソコンのアプリ・道具・GPUのときは枠を出さない", () => {
  assert.deepEqual(vpsPlacementForTools([t("gimp", "GIMP"), t("ffmpeg", "FFmpeg")]), { show: false, reason: "no_eligible_tool" });
  assert.deepEqual(vpsPlacementForTools([t("comfyui", "ComfyUI"), t("krita", "Krita")]), { show: false, reason: "no_eligible_tool" });
});

test("比較ページ：両方ともアーカイブ済みのときは枠を出さない", () => {
  assert.deepEqual(
    vpsPlacementForTools([t("n8n", "n8n", { github_archived: true }), t("nextcloud", "Nextcloud", { github_archived: true })]),
    { show: false, reason: "no_eligible_tool" },
  );
});

test("比較ページ：対象が1件だけなら枠を出し、対象外のツールは一覧に入らない", () => {
  const r = vpsPlacementForTools([t("gimp", "GIMP"), t("immich", "Immich", { category: "files" })]);
  assert.equal(r.show, true);
  if (r.show) {
    assert.equal(r.variant, "storage");
    assert.deepEqual(r.eligible.map((e) => e.tool.id), ["immich"]);
    // 見出しは対象のツールのものだけ（対象外のツールの名前を含まない）
    assert.equal(r.eligible[0].placement.title, "Immichを自分のサーバーで動かすには");
    assert.doesNotMatch(r.eligible[0].placement.title, /GIMP/);
  }
  // 順序を入れ替えても同じ
  const r2 = vpsPlacementForTools([t("immich", "Immich", { category: "files" }), t("gimp", "GIMP")]);
  assert.equal(r2.show && r2.eligible.length, 1);
  // アーカイブ済みが対象外になる場合も同じ
  const r3 = vpsPlacementForTools([t("n8n", "n8n", { github_archived: true }), t("nextcloud", "Nextcloud")]);
  assert.equal(r3.show && r3.eligible.map((e) => e.tool.id).join(), "nextcloud");
});

test("比較ページ：対象が2件で variant が一致すればその variant、割れれば general", () => {
  const same = vpsPlacementForTools([t("immich", "Immich", { category: "files" }), t("photoprism", "PhotoPrism", { category: "files" })]);
  assert.equal(same.show && same.variant, "storage");
  assert.equal(same.show && same.eligible.length, 2);
  const split = vpsPlacementForTools([t("immich", "Immich", { category: "files" }), t("uptime-kuma", "Uptime Kuma", { category: "observability" })]);
  assert.equal(split.show && split.variant, "general");
  assert.equal(split.show && split.eligible.length, 2);
  const generalOnly = vpsPlacementForTools([t("twenty", "Twenty", { category: "crm" }), t("espocrm", "EspoCRM", { category: "crm" })]);
  assert.equal(generalOnly.show && generalOnly.variant, "general");
});

test("比較ページ：前置きは既存の文言の再利用で、1件のときは詳細ページと同じ", () => {
  const immich = vpsPlacementFor(t("immich", "Immich", { category: "files" }));
  assert.equal(immich.show && immich.lede, vpsLedeFor("storage"));
  const crm = vpsPlacementFor(t("twenty", "Twenty", { category: "crm" }));
  assert.equal(crm.show && crm.lede, vpsLedeFor("general"));
});
