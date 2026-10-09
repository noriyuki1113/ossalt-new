import { test } from "node:test";
import assert from "node:assert/strict";
import { runtimeKind, vpsPlacementFor } from "./affiliate-context.ts";

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
