/**
 * 2. 適格性の判定（Eligibility Filtering）
 *
 * 必須の条件に「明らかに」合わない候補は、減点ではなく候補から外す（理由つき）。
 * 未確認（null）は外さず、注意（flags）として残す。未確認を「非対応」とは扱わない。
 */
import type { Candidate, Exclusion, RecQuery } from "./types.ts";

export type EligibilityResult = { eligible: Array<Candidate & { flags: string[] }>; excluded: Exclusion[] };

const LICENSE_RULE_LABEL = {
  osi: "OSI承認のライセンスだけ",
  permissive: "許容型（MIT・Apacheなど）だけ",
  "no-network-copyleft": "AGPLなどネットワーク型コピーレフトを避ける",
} as const;

export function filterEligible(query: RecQuery, candidates: Candidate[]): EligibilityResult {
  const eligible: EligibilityResult["eligible"] = [];
  const excluded: Exclusion[] = [];
  for (const c of candidates) {
    const t = c.tool;
    const flags: string[] = [];
    const out = (rule: string, reason: string) => excluded.push({ tool: t, rule, reason });

    if (t.maintenanceNotice) { out("maintenance", "公式に保守停止などの告知が出ている"); continue; }

    // ライセンス
    if (query.license !== "any") {
      const label = LICENSE_RULE_LABEL[query.license];
      if (t.licenseGroup === "unknown") {
        flags.push(`ライセンスが未確認のため、「${label}」の条件に合うか確かめられていない`);
      } else if (t.licenseGroup === "source-available") {
        out("license", `${t.license}はOSI承認のオープンソースではない（条件：${label}）`); continue;
      } else if (t.licenseGroup === "mixed") {
        flags.push(`ライセンスが複数・混在（${t.license}）。使う部分が「${label}」に合うか確認が必要`);
      } else if (query.license === "permissive" && t.licenseClass !== "permissive" && t.licenseClass !== "dual") {
        out("license", `${t.license}は許容型ではない（条件：${label}）`); continue;
      } else if (query.license === "no-network-copyleft" && t.licenseClass === "network-copyleft") {
        out("license", `${t.license}はネットワーク型コピーレフト（条件：${label}）`); continue;
      } else if (t.licenseClass === "dual" && query.license !== "osi") {
        flags.push(`複数のライセンスから選ぶ形式（${t.license}）。「${label}」に合う選択肢で使えるか確認が必要`);
      }
    }

    // セルフホスト（診断データで「自前で動かせない」と確認できたものだけ外す）
    if (query.selfHost && t.diag && t.diag.selfHost === false) { out("selfhost", "自分のサーバーで動かせない（診断データ）"); continue; }

    // Docker
    if (query.needDocker) {
      if (t.docker === false) { out("docker", "Dockerで動かす手段を確認できなかった（確認済み）"); continue; }
      if (t.docker == null) flags.push("Dockerで動かせるかは未確認");
    }

    // 日本語
    if (query.needJa) {
      const confirmedNo = t.jaUi === false && t.jaDocs === "none";
      if (confirmedNo) { out("ja", "日本語の画面・ドキュメントが無いことを確認済み"); continue; }
      if (t.jaUi !== true && t.jaDocs !== "official" && t.jaDocs !== "community") flags.push("日本語対応は未確認");
    }

    // 必要な機能（診断データで「無い」と確認できたものだけ外す）
    if (query.features.length > 0 && t.diag && query.purpose.kind === "saas" && t.diag.saas === query.purpose.slug) {
      const missing = query.features.filter((f) => t.diag!.features[f] === false);
      if (missing.length > 0) { out("feature", `必要な機能のうち${missing.length}件が無いことを確認済み`); continue; }
    }

    // 商用利用：ソース公開型は条件があり得る（ライセンスの条件で外していない場合）
    if (query.commercial && t.licenseGroup === "source-available") {
      flags.push(`${t.license}はソース公開型。商用での提供などに条件が付くことがある`);
    }

    eligible.push({ ...c, flags });
  }
  return { eligible, excluded };
}
