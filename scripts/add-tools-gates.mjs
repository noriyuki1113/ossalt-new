/**
 * 掲載基準（docs/listing-criteria.md）のうち、GitHub の情報だけで機械的に判定できるもの。
 *
 *   却下（reject）：アーカイブ済み／ライセンスが不明／最終pushが2年以上前
 *   警告（warn）  ：ソース公開型・ライセンスが「Other」／最終pushが1年以上前／Star 500未満（理由の記録が要る）
 *                   ／ライブラリ・SDKの可能性／権限の広い種類（AIエージェント）で説明に【注意】が無い
 *
 * 判定できないもの（「代わりになるSaaSが特定できる」「注意の事実が正しい」など）は、人が確認する。
 * 純粋関数（evaluateGates）と、取得（fetchRepoInfo）を分け、テストでは取得を差し替える。
 */

const DAY = 86400000;

/** ソース公開型（OSIの承認ではない）として扱うSPDX。注意を説明に書く必要がある */
const SOURCE_AVAILABLE = [/^BUSL/i, /^FSL/i, /^Elastic/i, /^PolyForm/i, /^SSPL/i, /^Commons-Clause/i, /^Sustainable/i];
const LIBRARY_TOPICS = ["library", "sdk", "framework", "component-library", "ui-library", "npm-package"];
const AGENT_TOPICS = ["ai-agent", "ai-agents", "agent", "agents", "llm-agent", "autonomous-agents", "coding-agent"];

/**
 * @param {null | {archived:boolean, license:string|null, pushedAt:string|null, stars:number|null, topics:string[]}} info
 * @param {{ description?: string, now?: number }} ctx
 */
export function evaluateGates(info, { description = "", now = Date.now() } = {}) {
  const reject = [];
  const warn = [];
  if (!info) return { verified: false, reject, warn };

  if (info.archived) reject.push("アーカイブ（開発終了）されています");

  const lic = (info.license ?? "").trim();
  if (!lic || lic === "NOASSERTION") {
    reject.push("ライセンスが不明です（GitHubがライセンスを判定できない）");
  } else if (lic.toUpperCase() === "OTHER") {
    warn.push("ライセンスが「Other」です。LICENSEを読み、条件を説明に【注意】として書いてください");
  } else if (SOURCE_AVAILABLE.some((re) => re.test(lic))) {
    warn.push(`ソース公開型のライセンス（${lic}）です。OSI承認ではない旨を説明に【注意】として書いてください`);
  }

  if (info.pushedAt) {
    const days = Math.floor((now - Date.parse(info.pushedAt)) / DAY);
    if (days >= 730) reject.push(`最終のpushが${Math.floor(days / 365)}年以上前です（2年以上は掲載の見直し対象）`);
    else if (days >= 365) warn.push("最終のpushが1年以上前です（詳細ページの先頭に「更新が1年以上ありません」が出ます）");
  }

  if (info.stars != null && info.stars < 500) {
    warn.push(`Starが${info.stars}です。掲載の理由を decisions.json の note に記録してください`);
  }

  const topics = (info.topics ?? []).map((t) => t.toLowerCase());
  if (LIBRARY_TOPICS.some((t) => topics.includes(t))) {
    warn.push("トピックにライブラリ・SDK・フレームワークがあります。対象外（SaaSの置き換え先として使えない）でないか確認してください");
  }
  if (AGENT_TOPICS.some((t) => topics.includes(t)) && !description.includes("【注意】")) {
    warn.push("AIエージェントの可能性があります。権限が広い点を説明に【注意】として書いてください");
  }

  return { verified: true, reject, warn };
}

/** GitHub API から、判定に必要な項目だけを取る。取れなければ null（未検証） */
export async function fetchRepoInfo(gh, { token, fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${gh}`, {
      signal: ctl.signal,
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "ossalt-add-tools/1.0",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      archived: !!d.archived,
      license: d.license?.spdx_id ?? null,
      pushedAt: d.pushed_at ?? null,
      stars: typeof d.stargazers_count === "number" ? d.stargazers_count : null,
      topics: Array.isArray(d.topics) ? d.topics : [],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
