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

export type VpsPlacement = { show: true; title: string; lede: string } | { show: false; reason: RuntimeKind | "archived" };

/** ツールの詳細ページにVPSの紹介枠を出すかと、その見出し */
export function vpsPlacementFor(tool: Pick<Tool, "id" | "name" | "github_archived">): VpsPlacement {
  if (tool.github_archived) return { show: false, reason: "archived" };
  const kind = runtimeKind(tool.id);
  if (kind !== "server") return { show: false, reason: kind };
  return {
    show: true,
    title: `${tool.name}を自分のサーバーで動かすには`,
    lede: "セルフホストでよく選ばれる国内のVPSです。必要なメモリやCPUはツールによって違うため、プランは公式のドキュメントの推奨に合わせて選んでください。",
  };
}
