"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { VpsRecommendation } from "@/components/vps-recommendation";
import { CopyButton } from "@/components/copy-button";
import { trackEvent } from "@/lib/analytics";
import {
  calculate,
  EXAMPLE_INPUT,
  fromSearchParams,
  PERIOD_YEARS,
  toSearchParams,
  validateInput,
  type CostInput,
} from "@/lib/cost-lab";

export type CostLabSaas = {
  slug: string;
  name: string;
  tools: Array<{ id: string; name: string; selfHostable: boolean }>;
};

type FieldKey = Exclude<keyof CostInput, "years">;
type FormState = Record<FieldKey, string> & { years: string };

const EMPTY: FormState = {
  saasPerUserMonthly: "",
  users: "",
  saasFixedMonthly: "0",
  serverMonthly: "",
  backupMonthly: "0",
  opsHoursMonthly: "",
  hourlyRate: "",
  migrationHours: "",
  migrationOtherCost: "0",
  years: "3",
};

const FIELDS: Array<{ key: FieldKey; label: string; unit: string; hint: string; advanced?: boolean }> = [
  { key: "saasPerUserMonthly", label: "SaaSの1人あたりの月額", unit: "円", hint: "今の契約の金額。ドル建てなら、円に換算して入力します" },
  { key: "users", label: "使う人数", unit: "人", hint: "SaaSのアカウントの数" },
  { key: "serverMonthly", label: "サーバー（VPSなど）の月額", unit: "円", hint: "使う予定のプランの料金。ツールの推奨のメモリに合うものを選びます" },
  { key: "opsHoursMonthly", label: "運用にかける時間", unit: "時間/月", hint: "更新の適用、バックアップの確認、障害の対応など" },
  { key: "hourlyRate", label: "運用する人の時間あたりの費用", unit: "円/時間", hint: "担当者の人件費の目安。外部に頼むならその単価" },
  { key: "migrationHours", label: "移行・構築にかかる時間（初回）", unit: "時間", hint: "構築、データの移行、利用者への説明など" },
  { key: "saasFixedMonthly", label: "SaaSの人数によらない月額", unit: "円", hint: "基本料金など。なければ0", advanced: true },
  { key: "backupMonthly", label: "バックアップの保存先の月額", unit: "円", hint: "外部のストレージなど。なければ0", advanced: true },
  { key: "migrationOtherCost", label: "移行のその他の費用（初回）", unit: "円", hint: "外部への依頼費など。なければ0", advanced: true },
];

const yen = (n: number) => `${Math.round(n).toLocaleString("ja-JP")}円`;

export function CostLab({ saasList }: { saasList: CostLabSaas[] }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saas, setSaas] = useState("");
  const [oss, setOss] = useState("");
  const [isExample, setIsExample] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const tracked = useRef(false);
  const started = useRef(false);

  // URLから入力値を読み込む（ツールのページ・代替ページからのリンクや、共有されたURL）
  useEffect(() => {
    const { input, saas: s, oss: o } = fromSearchParams(window.location.search);
    if (s && saasList.some((x) => x.slug === s)) setSaas(s);
    if (o) setOss(o);
    if (Object.keys(input).length) setForm((f) => ({ ...f, ...input }));
  }, [saasList]);

  const saasGroup = saasList.find((x) => x.slug === saas);
  const ossTool = saasGroup?.tools.find((t) => t.id === oss) ?? saasList.flatMap((x) => x.tools).find((t) => t.id === oss);

  const validation = useMemo(() => validateInput(form), [form]);
  const result = validation.ok ? calculate(validation.value) : null;

  useEffect(() => {
    if (!validation.ok) return;
    const qs = toSearchParams(validation.value, { saas: saas || undefined, oss: oss || undefined });
    // URLの書き換えはしない（共有したいときだけ、このURLをコピーしてもらう）
    setShareUrl(`${window.location.origin}${window.location.pathname}?${qs}`);
    if (!tracked.current && result) {
      tracked.current = true;
      trackEvent("cost_lab_result", { saas: saas || "-", oss: oss || "-", years: validation.value.years, verdict: result.verdict, example: isExample });
    }
  }, [validation, saas, oss, result, isExample]);

  const set = (key: keyof FormState, value: string) => {
    if (!started.current) {
      started.current = true;
      trackEvent("cost_lab_start", { saas: saas || "-", oss: oss || "-" });
    }
    setIsExample(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const errors = validation.ok ? {} : validation.errors;
  const touched = (key: FieldKey) => form[key] !== "";

  return (
    <div className="costlab">
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">比べる組み合わせ（任意）</h2>
        </div>
        <div className="panel__body costlab__grid">
          <label className="field">
            <span className="field__label">今使っているSaaS</span>
            <select
              className="select"
              value={saas}
              onChange={(e) => {
                setSaas(e.target.value);
                setOss("");
              }}
            >
              <option value="">選ばない</option>
              {saasList.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">移行先の候補のOSS</span>
            <select className="select" value={oss} onChange={(e) => setOss(e.target.value)} disabled={!saasGroup}>
              <option value="">{saasGroup ? "選ばない" : "先にSaaSを選んでください"}</option>
              {saasGroup?.tools.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="panel mt1">
        <div className="panel__head">
          <h2 className="panel__title">費用の入力</h2>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(EXAMPLE_INPUT).map(([k, v]) => [k, String(v)])) }));
              setIsExample(true);
              trackEvent("cost_lab_example");
            }}
          >
            例の値を入れる（仮入力）
          </button>
        </div>
        <div className="panel__body">
          {isExample && (
            <p className="notice notice--warn" role="status">
              <strong>仮入力です。</strong>実際の価格ではなく、計算の流れを試すための例の値です。ご自分の金額に書き換えてください。
            </p>
          )}
          <div className="costlab__grid mt1">
            {FIELDS.filter((f) => !f.advanced).map((f) => (
              <NumberField key={f.key} field={f} value={form[f.key]} error={touched(f.key) ? errors[f.key] : undefined} onChange={(v) => set(f.key, v)} />
            ))}
            <label className="field">
              <span className="field__label">比べる期間</span>
              <select className="select" value={form.years} onChange={(e) => set("years", e.target.value)}>
                {PERIOD_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
            </label>
          </div>
          <details className="more mt1">
            <summary>詳しく設定（基本料金・バックアップ・移行のその他の費用）</summary>
            <div className="costlab__grid mt1">
              {FIELDS.filter((f) => f.advanced).map((f) => (
                <NumberField key={f.key} field={f} value={form[f.key]} error={errors[f.key]} onChange={(v) => set(f.key, v)} />
              ))}
            </div>
          </details>
        </div>
      </section>

      {!result ? (
        <p className="notice mt2">すべての項目を入力すると、結果が表示されます。金額は税込・税抜のどちらかにそろえて入力してください。</p>
      ) : (
        <section className="mt2" aria-live="polite">
          <h2 className="h3">結果（{result.months}か月）</h2>
          {isExample && <p className="notice notice--warn">仮入力の値での結果です。</p>}
          <p className="costlab__verdict">
            {result.verdict === "about_same"
              ? "この条件では、ほぼ同じ費用です"
              : result.verdict === "oss_cheaper"
                ? `この条件では、OSSに移ると約${yen(result.difference)}安くなります`
                : `この条件では、SaaSのままのほうが約${yen(-result.difference)}安くなります`}
          </p>
          <div className="stats costlab__stats">
            <div className="stat">
              <span className="stat__num">{yen(result.saas.total)}</span>
              <span className="stat__label">SaaSを使い続けた場合</span>
            </div>
            <div className="stat">
              <span className="stat__num">{yen(result.oss.total)}</span>
              <span className="stat__label">OSSに移った場合</span>
            </div>
            <div className="stat">
              <span className="stat__num">
                {result.breakEvenMonths === null ? "取り戻せない" : result.breakEvenMonths === 0 ? "初月から" : `${result.breakEvenMonths}か月`}
              </span>
              <span className="stat__label">初期費用を取り戻すまで</span>
            </div>
            {result.breakEvenUsers !== null && (
              <div className="stat">
                <span className="stat__num">{result.breakEvenUsers}人</span>
                <span className="stat__label">月の費用が同じになる人数の目安</span>
              </div>
            )}
          </div>

          <div className="table-scroll mt1">
            <table className="costlab__table">
              <thead>
                <tr>
                  <th scope="col">内訳</th>
                  <th scope="col">月あたり</th>
                  <th scope="col">期間の合計</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">SaaSの料金</th>
                  <td>{yen(result.saas.monthly)}</td>
                  <td>{yen(result.saas.total)}</td>
                </tr>
                <tr>
                  <th scope="row">OSS：サーバーとバックアップ</th>
                  <td>{yen(result.oss.monthlyCash)}</td>
                  <td>{yen(result.oss.monthlyCash * result.months)}</td>
                </tr>
                <tr>
                  <th scope="row">OSS：運用の手間（時間×時給）</th>
                  <td>{yen(result.oss.monthlyLabor)}</td>
                  <td>{yen(result.oss.monthlyLabor * result.months)}</td>
                </tr>
                <tr>
                  <th scope="row">OSS：移行・構築（初回）</th>
                  <td>—</td>
                  <td>{yen(result.oss.initial)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="h3 mt2">注意</h3>
          <ul className="costlab__cautions">
            {result.cautions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>

          <details className="more mt1">
            <summary>計算式と前提</summary>
            <ul>
              <li>SaaSの総額 ＝（1人あたりの月額 × 人数 ＋ 人数によらない月額）× 月数</li>
              <li>OSSの総額 ＝ 初回の費用（移行の時間 × 時給 ＋ その他の費用）＋（サーバー ＋ バックアップ ＋ 運用の時間 × 時給）× 月数</li>
              <li>差が、SaaSとOSSの大きいほうの総額の5%以内なら「ほぼ同じ」としています。</li>
              <li>値上げ・人数の増減・為替の変化・ライセンスの費用（有料版を使う場合）は含みません。</li>
              <li>ここでの計算は入力した値だけにもとづく目安で、当サイトは価格を確認していません。</li>
            </ul>
          </details>

          {shareUrl && (
            <div className="costlab__share mt1">
              <span className="muted">この条件のURL：</span>
              <CopyButton text={shareUrl} label="URLをコピー" />
            </div>
          )}

          <NextSteps saas={saasGroup} oss={ossTool} />
        </section>
      )}
    </div>
  );
}

function NumberField({
  field,
  value,
  error,
  onChange,
}: {
  field: (typeof FIELDS)[number];
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const id = `cl-${field.key}`;
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">
        {field.label}（{field.unit}）
      </span>
      <input
        id={id}
        className="input"
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint`}
        onChange={(e) => onChange(e.target.value)}
      />
      <span id={`${id}-hint`} className={error ? "costlab__error" : "costlab__hint"}>
        {error ?? field.hint}
      </span>
    </label>
  );
}

function NextSteps({ saas, oss }: { saas?: CostLabSaas; oss?: CostLabSaas["tools"][number] }) {
  const click = (to: string) => () => trackEvent("cost_lab_link_click", { to });
  return (
    <section className="mt2">
      <h3 className="h3">次に確かめること</h3>
      <ul className="costlab__next">
        {oss && (
          <li>
            <Link href={`/tools/${oss.id}/`} onClick={click("tool")}>
              {oss.name}の詳細（ライセンス・更新の状況・日本語対応）
            </Link>
          </li>
        )}
        {saas && (
          <li>
            <Link href={`/alternatives/${saas.slug}/`} onClick={click("alternative")}>
              {saas.name}の代わりになるほかの候補
            </Link>
          </li>
        )}
        <li>
          <Link href="/guide/" onClick={click("guide")}>
            OSSの選び方と、運用の費用の考え方
          </Link>
        </li>
      </ul>
      {oss?.selfHostable && (
        <VpsRecommendation
          path="/cost-lab/"
          placement="cost_lab"
          title="サーバー代を調べる"
          lede="セルフホストでよく選ばれる国内のVPSです。料金は各社の公式サイトで確認し、上の「サーバーの月額」に入れて計算し直してください。"
        />
      )}
    </section>
  );
}
