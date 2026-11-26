/**
 * ツールの詳細ページに、国内VPSの紹介枠（アフィリエイト）を出すかどうかの判定（純粋関数のみ）
 *
 * 2026-10-09 の監査で、紹介枠が全ツールのページに条件なしで出ていた
 * （GIMPやShareXのような、パソコンで使うアプリにまでVPSを勧めていた）ことが分かったため、
 * 「そのツールを自分のサーバーで動かすのが普通か」で出し分ける。
 *
 * 出さないもの:
 *   - client : パソコンやスマホで使うアプリ、エディタの拡張機能
 *   - tool   : コマンドの道具・ライブラリ・CIで使う検査ツールなど（常駐のサーバーとして置くものではない）
 *   - gpu    : 快適に動かすのにGPUが要るもの（紹介している国内VPSの一般的なプランでは足りない）
 *   - アーカイブ済み（開発が終わったツールの導入は勧めない）
 * 一覧にないツールは「サーバーで動かすもの」として扱う（docker_available が未確認でも出す。
 * 未確認は「非対応」ではないため。例：Nextcloud、Matomo は Docker が未確認だがサーバー用）。
 *
 * 一覧は、ツールを追加したときに見直す（tool-faq と同じく、推測でなく公式の説明で分類する）。
 */
import type { Tool } from "./tools.ts";

export type RuntimeKind = "server" | "client" | "tool" | "gpu";

const CLIENT = new Set([
  "obs", "gpt4all", "dbeaver", "jan", "lossless-cut", "sharex", "continue", "insomnia", "flameshot",
  "keepassxc", "blender", "handbrake", "audacity", "mailspring", "shotcut", "krita", "gimp", "tigervnc",
  "anytype", "openshot", "rancher-desktop", "gnucash", "kdenlive", "greenshot", "pdfsam", "libreoffice",
  "bruno", "drawio", "devpod", "cline", "aider", "beekeeper-studio",
]);

const TOOL = new Set([
  "whisper", "whisper-cpp", "faster-whisper", "tesseract", "ffmpeg", "paddleocr", "ocrmypdf", "kokoro",
  "argos-translate", "llama-cpp", "pgvector", "tldraw", "surveyjs", "docusaurus", "mkdocs", "vitepress",
  "pulumi", "opentofu", "sops", "kamal", "podman", "robotframework", "beancount", "hledger", "borg",
  "restic", "kopia", "trivy", "grype", "semgrep", "nuclei", "zap", "velero", "headlamp", "unlighthouse",
  "siteone-crawler",
]);

const GPU = new Set([
  "stable-diffusion-webui", "comfyui", "invokeai", "vllm", "text-generation-webui", "whisperx",
]);

export function runtimeKind(id: string): RuntimeKind {
  if (CLIENT.has(id)) return "client";
  if (TOOL.has(id)) return "tool";
  if (GPU.has(id)) return "gpu";
  return "server";
}

/**
 * 紹介枠の前置きを、ツールの用途に合わせて1文だけ変える（Revenue Council R4 の小規模な検証。TEST）。
 * CPU・メモリの必要量のデータは持っていないので、数値は書かない。どのツールにも言える一般的な注意だけ。
 * 効果は affiliate_viewable / affiliate_click の variant で、general と比べて確かめる。
 */
export type VpsVariant = "storage" | "monitoring" | "always_on" | "general";

const VARIANT_BY_CATEGORY: Record<string, VpsVariant> = {
  files: "storage",
  video: "storage",
  observability: "monitoring",
  automation: "always_on",
};

const VARIANT_NOTE: Record<VpsVariant, string> = {
  storage:
    "写真・動画・ファイルを保存するツールは、使うほどデータが増えます。メモリやCPUに加えて、ディスクの容量と、別の場所へのバックアップの方法も確かめてください。",
  monitoring:
    "監視のツールは、監視する対象と同じサーバーに置くと、そのサーバーが止まったときに知らせることができません。別のサーバーに置くことも検討してください。",
  always_on:
    "ワークフローを決まった時刻や外部からの通知で動かすには、常に起動しているサーバーが必要です。",
  general: "",
};

export function vpsVariantFor(category: string | undefined): VpsVariant {
  return (category && VARIANT_BY_CATEGORY[category]) || "general";
}

export type VpsPlacement =
  | { show: true; title: string; lede: string; variant: VpsVariant }
  | { show: false; reason: RuntimeKind | "archived" | "no_eligible_tool" };

const VPS_LEDE_BASE =
  "セルフホストでよく選ばれる国内のVPSです。必要なメモリやCPUはツールによって違うため、プランは公式のドキュメントの推奨に合わせて選んでください。";

/** 紹介枠の前置き。variant の1文（あれば）＋共通の文。詳細ページと比較ページで同じ文言を使う */
export function vpsLedeFor(variant: VpsVariant): string {
  return VARIANT_NOTE[variant] ? `${VARIANT_NOTE[variant]}${VPS_LEDE_BASE}` : VPS_LEDE_BASE;
}

/** ツールの詳細ページにVPSの紹介枠を出すかと、その見出し */
export function vpsPlacementFor(tool: Pick<Tool, "id" | "name" | "github_archived"> & { category?: string }): VpsPlacement {
  if (tool.github_archived) return { show: false, reason: "archived" };
  const kind = runtimeKind(tool.id);
  if (kind !== "server") return { show: false, reason: kind };
  const variant = vpsVariantFor(tool.category);
  return {
    show: true,
    title: `${tool.name}を自分のサーバーで動かすには`,
    lede: vpsLedeFor(variant),
    variant,
  };
}

type VpsTool = Pick<Tool, "id" | "name" | "github_archived"> & { category?: string };
type ShownVpsPlacement = Extract<VpsPlacement, { show: true }>;

export type VpsPlacementForTools<T extends VpsTool> =
  | { show: true; variant: VpsVariant; eligible: Array<{ tool: T; placement: ShownVpsPlacement }> }
  | { show: false; reason: "no_eligible_tool" };

/**
 * 複数のツールを並べるページ（比較ページ）にVPSの紹介枠を出すかの判定。
 * 各ツールに vpsPlacementFor を適用し、出してよいもの（show: true）を対象とする。
 * 対象が1件でもあれば枠を出し、0件なら出さない。
 * variant は、対象ツール全員で一致すればその variant、割れれば general。
 * 見出し・前置きの組み立ては呼び出し側が行う（対象でないツールの名前を見出しに入れないため、対象の一覧を返す）。
 */
export function vpsPlacementForTools<T extends VpsTool>(tools: readonly T[]): VpsPlacementForTools<T> {
  const eligible: Array<{ tool: T; placement: ShownVpsPlacement }> = [];
  for (const tool of tools) {
    const placement = vpsPlacementFor(tool);
    if (placement.show) eligible.push({ tool, placement });
  }
  if (eligible.length === 0) return { show: false, reason: "no_eligible_tool" };
  const first = eligible[0].placement.variant;
  const variant = eligible.every((e) => e.placement.variant === first) ? first : "general";
  return { show: true, variant, eligible };
}
