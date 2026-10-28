"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { TrackView } from "@/components/track-view";
import { FEATURES } from "@/lib/site";
import { encodeQuery, queryFromDiagnosis } from "@/lib/recommend/query";
import {
  DIFFICULTY_LABELS,
  decodeAnswersFromSearchParams,
  evaluateDiagnosis,
  type CandidateResult,
  type DiagnosisToolInput,
  type HealthPercentiles,
} from "@/lib/diagnosis";
import { SAAS_LABELS } from "@/lib/diagnosis-types";
import { licenseLabel, dockerLabel } from "@/lib/tools";
import { LICENSE_GROUP_LABELS, compareSlug, licenseGroupOf } from "@/lib/compare";

export type ToolFact = {
  name: string;
  license: string | null;
  dockerAvailable: boolean | null;
};

type Props = {
  toolInputs: DiagnosisToolInput[];
  healthPercentiles: HealthPercentiles | null;
  toolFacts: Record<string, ToolFact>;
  /** 実在する比較ページ（/compare/<slug>/）。無いページへはリンクしない */
  compareSlugs: string[];
};

export function DiagnosisResult(props: Props) {
  return (
    <Suspense fallback={null}>
      <DiagnosisResultInner {...props} />
    </Suspense>
  );
}

function DiagnosisResultInner({ toolInputs, healthPercentiles, toolFacts, compareSlugs }: Props) {
  const searchParams = useSearchParams();
  const answers = useMemo(() => decodeAnswersFromSearchParams(searchParams), [searchParams]);

  if (!answers) {
    return (
      <div className="diag-result">
        <h1 className="diag-q__title">結果を表示できませんでした</h1>
        <p className="diag-q__hint">URLの内容が正しくないか、壊れている可能性があります。</p>
        <Link className="btn btn--primary" href="/diagnosis/">
          もう一度診断する
        </Link>
      </div>
    );
  }

  const candidates = toolInputs.filter((t) => t.meta.saas === answers.saas);
  const result = evaluateDiagnosis(answers, candidates, healthPercentiles);
  const shareUrl = "https://ossalt.jp/diagnosis/";
  const saasLabel = SAAS_LABELS[answers.saas];

  if (!result.primary) {
    return (
      <div className="diag-result">
        <h1 className="diag-q__title">条件に合うOSSは見つかりませんでした</h1>
        <p className="diag-q__hint">
          {saasLabel}
          {"の代替候補の中に、今回の条件に一致するものがありませんでした。"}
        </p>
        <Link className="btn btn--primary" href="/diagnosis/">
          条件を変えてもう一度診断する
        </Link>
      </div>
    );
  }

  const all = [result.primary, ...result.others];
  // 匿名の分類だけ（どのSaaSか・条件の種類）。自由記述はない。形が合わないものは送らない
  const conditions = [
    `team_${answers.teamSize}`,
    `skill_${answers.technicalLevel}`,
    `hosting_${answers.hosting}`,
    ...answers.strengths.map((s) => `strength_${s}`),
    ...(answers.conditions ?? []).map((c) => `need_${c}`),
  ]
    .map((c) => c.toLowerCase())
    .filter((c) => /^[a-z0-9_-]{1,40}$/.test(c));

  return (
    <div className="diag-result">
      <TrackView
        event="oss_diagnosis_completed"
        props={{ saas: String(answers.saas), recommended_count: all.length, conditions }}
        dedupeKey={`${String(answers.saas)}:${conditions.join(",")}`}
      />
      <p className="diag-q__hint" style={{ marginBottom: "0.3rem" }}>
        {saasLabel}
        {"の代替として、"}
        {all.length}
        {"件見つかりました"}
      </p>
      <h1 className="diag-q__title">あなたに合いそうなOSSが見つかりました</h1>

      {result.relaxedNote && (
        <p className="notice notice--info" style={{ marginBottom: "1.25rem" }}>
          {result.relaxedNote}
        </p>
      )}

      <CandidateCard candidate={result.primary} primary saas={answers.saas} />

      {result.others.length > 0 && (
        <div className="diag-others">
          <h2 className="panel__title" style={{ fontSize: "var(--step-1)" }}>
            その他の候補
          </h2>
          {result.others.map((c) => (
            <CandidateCard key={c.toolId} candidate={c} saas={answers.saas} />
          ))}
        </div>
      )}

      {all.length > 1 && <CompareTable candidates={all} toolFacts={toolFacts} />}
      {all.length > 1 && <CompareLinks candidates={all} compareSlugs={compareSlugs} />}

      <div className="diag-share">
        <ShareButton
          network="x"
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
            shareText(saasLabel, result.primary.name, shareUrl)
          )}`}
        />
        <ShareButton
          network="bluesky"
          href={`https://bsky.app/intent/compose?text=${encodeURIComponent(
            shareText(saasLabel, result.primary.name, shareUrl)
          )}`}
        />
      </div>

      {FEATURES.forYou && (
        <div className="notice notice--info mt2">
          <strong>条件を少しずつ変えて比べたい場合</strong>
          <br />
          {"この診断の回答を引き継いで、ライセンス・Docker・日本語などの条件を画面で切り替えながら、理由つきの候補を見られます。"}
          <br />
          <Link href={`/for-you/?${encodeQuery(queryFromDiagnosis(answers)).toString()}`}>OSSALT For Youで条件を調整する</Link>
        </div>
      )}

      <p className="diag-note">
        <Link
          href="/diagnosis/"
          onClick={() => trackEvent("diagnosis_restart")}
        >
          もう一度診断する
        </Link>
      </p>
    </div>
  );
}

function shareText(saasLabel: string, toolName: string, url: string): string {
  return `${saasLabel}の代替OSS診断をやってみたら、${toolName}が条件に合いそうでした。\n\nあなたに合うOSSは？\n${url}`;
}

function ShareButton({ network, href }: { network: "x" | "bluesky"; href: string }) {
  const label = network === "x" ? "Xでシェア" : "Blueskyでシェア";
  return (
    <a
      className="btn"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("share_click", { network })}
    >
      {label}
    </a>
  );
}

function CandidateCard({ candidate, primary, saas }: { candidate: CandidateResult; primary?: boolean; saas: string }) {
  return (
    <div className={`panel${primary ? " diag-result__primary" : ""}`} style={{ marginBottom: "1rem" }}>
      <div className="panel__head">
        <h3 className="panel__title">
          <Link href={`/tools/${candidate.toolId}/`}>{candidate.name}</Link>
        </h3>
        <span className="panel__meta">導入難易度：{DIFFICULTY_LABELS[candidate.difficulty]}</span>
      </div>
      <div className="panel__body">
        <div className="diag-score">
          <span className="diag-score__num">{candidate.score}%</span>
          <span className="diag-score__label">あなたの条件との一致度</span>
        </div>
        {candidate.completeness < 100 && (
          <p className="diag-completeness">
            {"一部の情報が未確認です（データ充足率 "}
            {candidate.completeness}
            {"%）"}
          </p>
        )}

        <div className="diag-reasons">
          {candidate.good.length > 0 && (
            <div>
              <h4>あなたの条件と合っている点</h4>
              <ul className="diag-reasons--good">
                {candidate.good.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {candidate.check.length > 0 && (
            <div>
              <h4>不向きな条件・確認しておきたい点</h4>
              <ul className="diag-reasons--check">
                {candidate.check.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="hero__actions" style={{ marginTop: "0.75rem" }}>
          <Link
            className="btn btn--primary"
            href={`/tools/${candidate.toolId}/`}
            onClick={() => trackEvent("result_detail_click", { toolId: candidate.toolId })}
          >
            詳しく見る
          </Link>
          <Link
            className="btn"
            href={`/cost-lab/?saas=${encodeURIComponent(saas)}&oss=${encodeURIComponent(candidate.toolId)}`}
            onClick={() => trackEvent("cost_lab_link_click", { from: "diagnosis", toolId: candidate.toolId })}
          >
            費用をCost Labで試算
          </Link>
        </div>
      </div>
    </div>
  );
}

function CompareTable({
  candidates,
  toolFacts,
}: {
  candidates: CandidateResult[];
  toolFacts: Record<string, ToolFact>;
}) {
  return (
    <section className="mt2">
      <h2 className="h3" style={{ fontSize: "var(--step-1)" }}>
        候補を比較
      </h2>
      <div
        className="ctable-scroll"
        onClickCapture={() => trackEvent("compare_click")}
      >
        <table className="ctable">
          <caption className="skip">診断候補の比較表</caption>
          <thead>
            <tr>
              <th scope="col">ツール</th>
              <th scope="col" style={{ textAlign: "right" }}>
                条件一致
              </th>
              <th scope="col">Docker</th>
              <th scope="col">導入難易度</th>
              <th scope="col">必須機能一致</th>
              <th scope="col">ライセンス</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const fact = toolFacts[c.toolId];
              return (
                <tr key={c.toolId} className="ctable__row">
                  <td className="name">
                    <Link href={`/tools/${c.toolId}/`} className="ctable__link">
                      {c.name}
                    </Link>
                  </td>
                  <td className="num">{c.score}%</td>
                  <td>{dockerLabel(fact?.dockerAvailable)}</td>
                  <td>{DIFFICULTY_LABELS[c.difficulty]}</td>
                  <td>
                    {c.totalRequired > 0 ? `${c.matchedRequired}/${c.totalRequired}` : "—"}
                  </td>
                  <td>
                    {licenseLabel(fact?.license)}
                    <br />
                    <small className="muted">{LICENSE_GROUP_LABELS[licenseGroupOf(fact?.license)]}</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** 候補どうしの比較ページ（実在するものだけ）へのリンク */
function CompareLinks({ candidates, compareSlugs }: { candidates: CandidateResult[]; compareSlugs: string[] }) {
  const exists = new Set(compareSlugs);
  const links: { slug: string; label: string }[] = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const slug = compareSlug(candidates[i].toolId, candidates[j].toolId);
      if (exists.has(slug)) links.push({ slug, label: `${candidates[i].name} と ${candidates[j].name} を詳しく比較` });
    }
  }
  if (links.length === 0) return null;
  return (
    <ul className="mt1" aria-label="候補どうしの比較ページ">
      {links.map((l) => (
        <li key={l.slug}>
          <Link href={`/compare/${l.slug}/`} onClick={() => trackEvent("compare_click")}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
