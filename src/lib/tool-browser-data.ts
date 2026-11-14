/**
 * ツール一覧（/tools/）の初期HTMLを軽くするための、データの分け方。
 *
 * 一覧は、絞り込みや並び替えに全件のデータを使う。全件をサーバーから props で渡すと、
 * そのデータがHTMLの中（RSCのペイロード）に入り、ページが重くなる。
 * そこで、初期HTMLには「最初に表示する分」と、件数・ライセンスの選択肢だけを入れ、
 * 全件は公開済みのデータファイル（/data/tools.json）をブラウザで読み込む。
 *
 * サーバーとブラウザで同じ並び（初期の並び替え）になるよう、絞り込みと並び替えは
 * どちらも filterAndSort を使う。
 */
import { filterAndSort, licenseFacets, type SortKey, type Tool } from "./tools.ts";
import { LICENSE_GROUP_ORDER, licenseGroupOf, type LicenseGroup } from "./compare.ts";

/** 全件のデータを読み込む先（public/data/tools.json。ビルド時にそのまま公開される） */
export const BROWSER_DATA_PATH = "/data/tools.json";

export type BrowserFacets = {
  /** 掲載中（アーカイブ以外）の件数 */
  total: number;
  licenses: Array<{ value: string; count: number }>;
  groups: Array<{ value: LicenseGroup; count: number }>;
};

export function browserFacets(tools: Tool[]): BrowserFacets {
  const m = new Map<LicenseGroup, number>();
  for (const tool of tools) {
    const g = licenseGroupOf(tool.license);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return {
    total: tools.length,
    licenses: licenseFacets(tools),
    groups: LICENSE_GROUP_ORDER.filter((g) => m.has(g)).map((g) => ({ value: g, count: m.get(g)! })),
  };
}

/** 初期HTMLに入れる分：条件なし・初期の並び替えで、先頭 n 件 */
export function initialBrowserTools(tools: Tool[], n: number, sort: SortKey = "health"): Tool[] {
  return filterAndSort(tools, { query: "", category: "", license: "", dockerOnly: false, japaneseOnly: false, sort }).slice(0, n);
}

/**
 * /data/tools.json の中身から、一覧に並べるツール（アーカイブ以外）を取り出す。
 * 形が想定と違うときは null（呼び出し側で「読み込めなかった」と表示する）。
 */
export function parseBrowserTools(json: unknown): Tool[] | null {
  const tools = parseBrowserData(json);
  return tools ? tools.filter((t) => !t.github_archived) : null;
}

/** /data/tools.json の中身を、そのまま（アーカイブ済みも含めて）取り出す。形が違えば null */
export function parseBrowserData(json: unknown): Tool[] | null {
  const list = Array.isArray(json)
    ? json
    : json && typeof json === "object" && Array.isArray((json as { tools?: unknown }).tools)
      ? (json as { tools: unknown[] }).tools
      : null;
  if (!list) return null;
  return list.filter(
    (t): t is Tool => Boolean(t) && typeof t === "object" && typeof (t as Tool).id === "string" && typeof (t as Tool).name === "string"
  );
}
