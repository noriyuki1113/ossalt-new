"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { encodeAnswersToSearchParams, TOTAL_STEPS, type DiagnosisAnswers } from "@/lib/diagnosis";
import {
  HOSTING_PREFERENCES,
  HOSTING_PREFERENCE_LABELS,
  MAX_STRENGTHS,
  NO_REQUIRED_FEATURE,
  SAAS_FEATURES,
  SAAS_IDS,
  SAAS_LABELS,
  STRENGTHS,
  STRENGTH_LABELS,
  TEAM_SIZES,
  TEAM_SIZE_LABELS,
  TECHNICAL_LEVELS,
  TECHNICAL_LEVEL_LABELS,
  type HostingPreference,
  type SaasId,
  type Strength,
  type TeamSize,
  type TechnicalLevel,
} from "@/lib/diagnosis-types";

type Answers = Partial<DiagnosisAnswers>;

const STEP_TITLES = [
  "今使っている・置き換えたいSaaSは？",
  "何人くらいで使いますか？",
  "セルフホストについて、どれに近いですか？",
  "データをどこで管理したいですか？",
  "特に重視するものを2つまで選んでください",
  "絶対に必要な機能はありますか？",
];

/**
 * 質問に答えるだけのウィザード。ここでは判定を行わない
 * （評価は /diagnosis/result 側で、URLパラメータから同じロジックを使って再計算する。
 *  これによりブラウザ更新・共有された結果URLと、ここでの遷移結果が必ず一致する）。
 */
export function DiagnosisWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  useEffect(() => {
    trackEvent("diagnosis_start");
  }, []);

  const requiredFeatureOptions = answers.saas ? SAAS_FEATURES[answers.saas] : [];

  function goNext() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function selectSaas(saas: SaasId) {
    trackEvent("saas_selected", { saas });
    setAnswers((a) => ({ ...a, saas, requiredFeatures: [] }));
    goNext();
  }
  function selectTeamSize(teamSize: TeamSize) {
    setAnswers((a) => ({ ...a, teamSize }));
    goNext();
  }
  function selectTechnicalLevel(technicalLevel: TechnicalLevel) {
    setAnswers((a) => ({ ...a, technicalLevel }));
    goNext();
  }
  function selectHosting(hosting: HostingPreference) {
    setAnswers((a) => ({ ...a, hosting }));
    goNext();
  }
  function toggleStrength(s: Strength) {
    setAnswers((a) => {
      const cur = a.strengths ?? [];
      if (cur.includes(s)) return { ...a, strengths: cur.filter((x) => x !== s) };
      if (cur.length >= MAX_STRENGTHS) return a;
      return { ...a, strengths: [...cur, s] };
    });
  }
  function toggleFeature(id: string) {
    setAnswers((a) => {
      const cur = a.requiredFeatures ?? [];
      if (cur.includes(id)) return { ...a, requiredFeatures: cur.filter((x) => x !== id) };
      return { ...a, requiredFeatures: [...cur, id] };
    });
  }
  function selectNoFeature() {
    setAnswers((a) => ({ ...a, requiredFeatures: [] }));
  }

  function submit() {
    if (!isFullyAnswered(answers)) return;
    trackEvent("diagnosis_completed", { saas: answers.saas });
    const params = encodeAnswersToSearchParams(answers);
    router.push(`/diagnosis/result/?${params.toString()}`);
  }

  const progressPct = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  return (
    <div className="diag">
      <div className="diag-progress" aria-hidden="true">
        <span className="diag-progress__label">
          OSS診断 {step + 1} / {TOTAL_STEPS}
        </span>
        <span className="diag-progress__bar">
          <span className="diag-progress__fill" style={{ width: `${progressPct}%` }} />
        </span>
      </div>

      {step > 0 && (
        <button type="button" className="diag-back" onClick={goBack}>
          ← 戻る
        </button>
      )}

      <div role="group" aria-labelledby="diag-q-title">
        <h1 id="diag-q-title" className="diag-q__title">
          {STEP_TITLES[step]}
        </h1>

        {step === 0 && (
          <>
            <div className="diag-options">
              {SAAS_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="diag-option"
                  aria-pressed={answers.saas === id}
                  onClick={() => selectSaas(id)}
                >
                  {SAAS_LABELS[id]}
                </button>
              ))}
            </div>
            <p className="diag-note">
              {"対象のSaaSがここに無い場合は、"}
              <Link href="/tools/">ツール一覧の検索</Link>
              {"から探すこともできます。"}
            </p>
          </>
        )}

        {step === 1 && (
          <div className="diag-options">
            {TEAM_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                className="diag-option"
                aria-pressed={answers.teamSize === size}
                onClick={() => selectTeamSize(size)}
              >
                {TEAM_SIZE_LABELS[size]}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="diag-options">
            {TECHNICAL_LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                className="diag-option"
                aria-pressed={answers.technicalLevel === lv}
                onClick={() => selectTechnicalLevel(lv)}
              >
                {TECHNICAL_LEVEL_LABELS[lv]}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="diag-options">
            {HOSTING_PREFERENCES.map((h) => (
              <button
                key={h}
                type="button"
                className="diag-option"
                aria-pressed={answers.hosting === h}
                onClick={() => selectHosting(h)}
              >
                {HOSTING_PREFERENCE_LABELS[h]}
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <>
            <p className="diag-q__hint">
              {"最大"}
              {MAX_STRENGTHS}
              {"個まで選べます（現在"}
              {answers.strengths?.length ?? 0}
              {"個選択中）"}
            </p>
            <div className="diag-options">
              {STRENGTHS.map((s) => {
                const disabled =
                  !answers.strengths?.includes(s) && (answers.strengths?.length ?? 0) >= MAX_STRENGTHS;
                return (
                  <button
                    key={s}
                    type="button"
                    className="diag-option"
                    aria-pressed={answers.strengths?.includes(s) ?? false}
                    disabled={disabled}
                    style={disabled ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
                    onClick={() => toggleStrength(s)}
                  >
                    {STRENGTH_LABELS[s]}
                  </button>
                );
              })}
            </div>
            <div className="diag-actions">
              <button
                type="button"
                className="btn btn--primary"
                disabled={(answers.strengths?.length ?? 0) === 0}
                onClick={goNext}
              >
                次へ
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className="diag-options">
              {requiredFeatureOptions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="diag-option"
                  aria-pressed={answers.requiredFeatures?.includes(f.id) ?? false}
                  onClick={() => toggleFeature(f.id)}
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                className="diag-option diag-option--other"
                aria-pressed={(answers.requiredFeatures?.length ?? 0) === 0}
                onClick={selectNoFeature}
              >
                特になし
              </button>
            </div>
            <div className="diag-actions">
              <button type="button" className="btn btn--primary" onClick={submit}>
                診断結果を見る
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function isFullyAnswered(a: Answers): a is DiagnosisAnswers {
  return (
    a.saas != null &&
    a.teamSize != null &&
    a.technicalLevel != null &&
    a.hosting != null &&
    Array.isArray(a.strengths) &&
    Array.isArray(a.requiredFeatures)
  );
}
