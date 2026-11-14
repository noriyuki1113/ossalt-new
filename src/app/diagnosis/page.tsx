import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DiagnosisWizard } from "@/components/diagnosis-wizard";
import { getMeta } from "@/lib/data";
import { encodeAnswersToSearchParams, evaluateDiagnosis, type DiagnosisAnswers } from "@/lib/diagnosis";
import { getAllDiagnosisToolInputs, getHealthPercentiles } from "@/lib/diagnosis-tools";
import {
  DIAGNOSIS_STEP_TITLES,
  HOSTING_PREFERENCES,
  HOSTING_PREFERENCE_LABELS,
  MAX_STRENGTHS,
  SAAS_FEATURES,
  SAAS_IDS,
  SAAS_LABELS,
  STRENGTHS,
  STRENGTH_LABELS,
  TEAM_SIZES,
  TEAM_SIZE_LABELS,
  TECHNICAL_LEVELS,
  TECHNICAL_LEVEL_LABELS,
  USAGE_CONDITIONS,
  USAGE_CONDITION_LABELS,
} from "@/lib/diagnosis-types";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "あなたに合うOSS診断",
  description:
    "7つの質問に答えるだけで、今使っているSaaSに合うオープンソースの代替候補を探せます。ログイン不要・無料・約2分。",
  path: "/diagnosis/",
});

// 「結果のサンプル」に使う回答（実際の診断と同じ計算で、掲載データから結果を出す）
const SAMPLE: DiagnosisAnswers = {
  saas: "notion",
  teamSize: "small",
  technicalLevel: 1,
  hosting: "selfhost",
  strengths: ["privacy", "cost"],
  requiredFeatures: [],
  conditions: ["ja"],
};

// 点数の内訳（src/lib/diagnosis.ts の scoreCandidate と同じ配点）
const SCORE_PARTS: Array<[string, number]> = [
  ["必須の機能があるか", 30],
  ["運用の方法（自前のサーバーか、クラウドか）が合うか", 20],
  ["重視することが、そのOSSの強みと合うか", 20],
  ["必要な技術のレベルが、回答の範囲に収まるか", 15],
  ["利用する人数の規模に向いているか", 10],
  ["健全度（掲載中のOSSの中での位置）", 5],
];

/** 各質問の選択肢（ウィザードと同じ定義から作る） */
function optionsFor(step: number): string {
  switch (step) {
    case 0: return SAAS_IDS.map((id) => SAAS_LABELS[id]).join("／");
    case 1: return TEAM_SIZES.map((s) => TEAM_SIZE_LABELS[s]).join("／");
    case 2: return TECHNICAL_LEVELS.map((l) => TECHNICAL_LEVEL_LABELS[l]).join("／");
    case 3: return HOSTING_PREFERENCES.map((h) => HOSTING_PREFERENCE_LABELS[h]).join("／");
    case 4: return `${STRENGTHS.map((s) => STRENGTH_LABELS[s]).join("／")}（${MAX_STRENGTHS}つまで）`;
    case 5: return `選んだSaaSの主な機能から選びます（例：Notionなら${SAAS_FEATURES.notion.map((f) => f.label).join("・")}）。「特になし」も選べます`;
    case 6: return `${USAGE_CONDITIONS.map((c) => USAGE_CONDITION_LABELS[c]).join("／")}（任意・複数選べます。点数には加えません）`;
    default: return "";
  }
}

export default function DiagnosisPage() {
  const meta = getMeta();
  const sample = evaluateDiagnosis(SAMPLE, getAllDiagnosisToolInputs(), getHealthPercentiles());
  const sampleRows = [sample.primary, ...sample.others].filter((c): c is NonNullable<typeof c> => c !== null);
  const sampleUrl = `/diagnosis/result/?${encodeAnswersToSearchParams(SAMPLE).toString()}`;
  const sampleSummary = [
    SAAS_LABELS[SAMPLE.saas],
    TEAM_SIZE_LABELS[SAMPLE.teamSize],
    TECHNICAL_LEVEL_LABELS[SAMPLE.technicalLevel],
    HOSTING_PREFERENCE_LABELS[SAMPLE.hosting],
    SAMPLE.strengths.map((s) => STRENGTH_LABELS[s]).join("・"),
    "必須の機能は特になし",
    (SAMPLE.conditions ?? []).map((c) => USAGE_CONDITION_LABELS[c]).join("・"),
  ].join("／");

  return (
    <>
      <SiteHeader current="/diagnosis" />
      <main className="wrap page">
        <DiagnosisWizard />

        <section className="section" aria-labelledby="diag-about">
          <h2 className="h3" id="diag-about">この診断で分かること</h2>
          <ul>
            <li>{`対象の${SAAS_IDS.length}つのSaaS（${SAAS_IDS.map((id) => SAAS_LABELS[id]).join("・")}）について、回答の条件に近いオープンソースの代替を、最大3件まで示します。`}</li>
            <li>点数は「OSSの優劣」ではなく、「回答した条件との一致度」です。判定は決まったルールで行い、AIや外部のAPIは使っていません。</li>
            <li>候補ごとに「合っている点」と「確認しておきたい点」、導入の難しさの目安を示します。確認できていない項目は「未確認」として扱い、「対応していない」とはみなしません。</li>
          </ul>
          <h3>点数の内訳（100点満点）</h3>
          <ul>
            {SCORE_PARTS.map(([label, pts]) => <li key={label}>{`${label}：${pts}点`}</li>)}
          </ul>
        </section>

        <section className="section" aria-labelledby="diag-questions">
          <h2 className="h3" id="diag-questions">実際の設問（7問）</h2>
          <ol>
            {DIAGNOSIS_STEP_TITLES.map((title, i) => (
              <li key={title}>
                <strong>{title}</strong>
                <br />
                <span className="muted">{optionsFor(i)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="section" aria-labelledby="diag-sample">
          <h2 className="h3" id="diag-sample">結果のサンプル</h2>
          <p className="muted">{`回答の例：${sampleSummary}`}</p>
          {sampleRows.length > 0 ? (
            <ol>
              {sampleRows.map((c) => (
                <li key={c.toolId}>
                  <Link href={`/tools/${c.toolId}/`}>{c.name}</Link>
                  {` — 一致度 ${c.score}%`}
                </li>
              ))}
            </ol>
          ) : <p>この回答の例では、条件に合う候補がありませんでした。</p>}
          <p className="muted" style={{ fontSize: "0.8125rem" }}>
            {"上の結果は、掲載データ（"}{meta.built_at.slice(0, 10)}{"時点）から、実際の診断と同じ計算で出したものです。データが更新されると変わります。"}
            <Link href={sampleUrl}>この例の結果ページを開く</Link>
          </p>
        </section>

        <section className="section" aria-labelledby="diag-faq">
          <h2 className="h3" id="diag-faq">よくある質問</h2>
          <dl className="faq">
            <div>
              <dt>使っているSaaSが、対象の5つに無い場合は？</dt>
              <dd>
                {"診断の対象は5つのSaaSだけです。それ以外は、"}
                <Link href="/tools/">ツール一覧の検索</Link>
                {"や、"}
                <Link href="/alternatives/">SaaSの代替の一覧</Link>
                {"から探せます。"}
              </dd>
            </div>
            <div>
              <dt>点数が高いほど、良いOSSですか？</dt>
              <dd>いいえ。点数は、回答した条件との一致度です。同じOSSでも、回答が変われば点数も変わります。</dd>
            </div>
            <div>
              <dt>必須の機能を満たす候補が無いときは？</dt>
              <dd>必須の機能の条件をゆるめた候補を、その旨を明記して示します。自前のサーバーで動かす条件でも同じです。</dd>
            </div>
            <div>
              <dt>最後の質問（利用の条件）は、点数に影響しますか？</dt>
              <dd>影響しません。日本語の画面や商用の利用などの条件は、掲載データから「合っている点」「確認しておきたい点」として示すだけです。</dd>
            </div>
            <div>
              <dt>結果を人に共有できますか？</dt>
              <dd>結果ページのURLに回答の内容が入るので、URLを共有すると同じ結果を開けます。</dd>
            </div>
          </dl>
        </section>

        <section className="section" aria-labelledby="diag-alternatives">
          <h2 className="h3" id="diag-alternatives">対象のSaaSの代替を一覧で見る</h2>
          <ul>
            {SAAS_IDS.map((id) => (
              <li key={id}><Link href={`/alternatives/${id}/`}>{`${SAAS_LABELS[id]}の代替OSS`}</Link></li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
