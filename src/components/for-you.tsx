"use client";

/**
 * OSSALT For You：条件を選ぶと、推薦エンジン（src/lib/recommend）で候補を並べ、理由を表示する。
 *
 * - 条件は URL のクエリに保存する（共有・再現できる。個人を特定する情報は含めない）。
 * - 推薦用データは /for-you/catalog.json（ビルド時に作る静的なJSON）を1回だけ読む。
 * - 計算はすべてブラウザ内で行い、外部のAPIは呼ばない。
 */
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { compareSlug, LICENSE_GROUP_LABELS } from "@/lib/compare";
import { SAAS_FEATURES, TECHNICAL_LEVEL_LABELS, type SaasId, type TechnicalLevel } from "@/lib/diagnosis-types";
import { recommend } from "@/lib/recommend/pipeline";
import { decodeQuery, DEFAULT_QUERY, encodeQuery } from "@/lib/recommend/query";
import { EMPHASIS_LABELS, EXPLAIN, PROFILE_LABELS } from "@/lib/recommend/ranking-config";
import type { Emphasis, LicensePolicy, Profile, RankedItem, RecCatalog, RecQuery } from "@/lib/recommend/types";

export type PurposeOption = { slug: string; label: string; count: number };

type Props = {
  saasOptions: PurposeOption[];
  /** 診断データがあり、機能を選べるSaaS */
  featureSaas: string[];
  categoryOptions: PurposeOption[];
};

const LICENSE_LABELS: Record<LicensePolicy, string> = {
  any: "こだわらない",
  osi: "OSI承認のオープンソースだけ",
  permissive: "許容型（MIT・Apacheなど）だけ",
  "no-network-copyleft": "AGPLなどネットワーク型コピーレフトを避ける",
};
const PAGE = 8;

export function ForYou(props: Props) {
  return (
    <Suspense fallback={<ForYouSkeleton />}>
      <ForYouInner {...props} />
    </Suspense>
  );
}

type Load = { state: "loading" } | { state: "error" } | { state: "ok"; data: RecCatalog };

function useCatalog(): [Load, () => void] {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoad({ state: "loading" });
    fetch("/for-you/catalog.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: RecCatalog) => {
        if (!alive) return;
        if (!data || !Array.isArray(data.tools)) throw new Error("invalid");
        setLoad({ state: "ok", data });
      })
      .catch(() => alive && setLoad({ state: "error" }));
    return () => {
      alive = false;
    };
  }, [attempt]);
  return [load, () => setAttempt((n) => n + 1)];
}

function ForYouInner({ saasOptions, featureSaas, categoryOptions }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [load, retry] = useCatalog();
  const [shown, setShown] = useState(PAGE);

  const valid = useMemo(
    () => ({ saas: new Set(saasOptions.map((o) => o.slug)), categories: new Set(categoryOptions.map((o) => o.slug)) }),
    [saasOptions, categoryOptions]
  );
  const query = useMemo(() => decodeQuery(new URLSearchParams(params.toString()), valid), [params, valid]);

  const update = useCallback(
    (next: RecQuery, field: string) => {
      setShown(PAGE);
      router.replace(`${pathname}?${encodeQuery(next).toString()}`, { scroll: false });
      trackEvent("for_you_update", { field });
    },
    [router, pathname]
  );

  const result = useMemo(
    () => (query && load.state === "ok" ? recommend(query, load.data) : null),
    [query, load]
  );

  return (
    <div className="fy">
      <ConditionPanel
        query={query}
        saasOptions={saasOptions}
        categoryOptions={categoryOptions}
        featureSaas={featureSaas}
        onChange={update}
      />

      <section className="fy-results" aria-labelledby="fy-results-h" aria-live="polite" aria-busy={load.state === "loading"}>
        <h2 id="fy-results-h" className="h3">
          おすすめのOSS
        </h2>
        {!query ? (
          <div className="notice notice--info">
            {"まず「何の代わりを探すか」を選んでください。選ぶとすぐに、あなたの条件に合う候補を理由つきで表示します。"}
            <br />
            {"質問に答えて選びたい場合は、"}
            <Link href="/diagnosis/">OSS診断</Link>
            {"から始めることもできます。"}
          </div>
        ) : load.state === "loading" ? (
          <ForYouSkeleton />
        ) : load.state === "error" ? (
          <div className="notice notice--warn" role="alert">
            <strong>推薦用のデータを読み込めませんでした。</strong>
            <br />
            {"通信の状態を確認して、もう一度お試しください。"}
            <div className="mt2">
              <button type="button" className="btn" onClick={retry}>
                もう一度読み込む
              </button>
            </div>
          </div>
        ) : result && load.state === "ok" ? (
          <Results
            query={query}
            items={result.items}
            excluded={result.excluded}
            catalog={load.data}
            shown={shown}
            onMore={() => setShown((n) => n + PAGE)}
            onChange={update}
          />
        ) : null}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 条件の入力
 * ------------------------------------------------------------------ */

function ConditionPanel({
  query,
  saasOptions,
  categoryOptions,
  featureSaas,
  onChange,
}: {
  query: RecQuery | null;
  saasOptions: PurposeOption[];
  categoryOptions: PurposeOption[];
  featureSaas: string[];
  onChange: (q: RecQuery, field: string) => void;
}) {
  const q: RecQuery = query ?? { ...DEFAULT_QUERY, purpose: { kind: "saas", slug: "" } };
  const set = (patch: Partial<RecQuery>, field: string) => {
    const next = { ...q, ...patch };
    if (!next.purpose.slug) return; // 用途が未選択のうちは、URLを書き換えない
    onChange(next, field);
  };
  const [kind, setKind] = useState<"saas" | "category">(q.purpose.kind);
  const toggle = (list: Emphasis[], e: Emphasis) => (list.includes(e) ? list.filter((x) => x !== e) : [...list, e]);
  const features = q.purpose.kind === "saas" && featureSaas.includes(q.purpose.slug) ? SAAS_FEATURES[q.purpose.slug as SaasId] : null;

  return (
    <form className="fy-panel panel" onSubmit={(e) => e.preventDefault()} aria-label="推薦の条件">
      <div className="panel__head">
        <h2 className="panel__title">あなたの条件</h2>
        <span className="panel__meta">変えるとすぐに結果が変わります</span>
      </div>
      <div className="panel__body fy-panel__body">
        <fieldset className="fy-field">
          <legend>何の代わりを探す？（利用目的）</legend>
          <div className="fy-seg" role="radiogroup" aria-label="探し方">
            {(["saas", "category"] as const).map((k) => (
              <label key={k} className="fy-seg__opt">
                <input type="radio" name="fy-kind" checked={kind === k} onChange={() => setKind(k)} />
                <span>{k === "saas" ? "SaaSの名前から" : "カテゴリから"}</span>
              </label>
            ))}
          </div>
          {kind === "saas" ? (
            <label className="fy-label">
              <span className="sr-only">置き換えたいSaaS</span>
              <select
                className="fy-select"
                value={q.purpose.kind === "saas" ? q.purpose.slug : ""}
                onChange={(e) => e.target.value && onChange({ ...q, purpose: { kind: "saas", slug: e.target.value }, features: [] }, "purpose")}
              >
                <option value="">SaaSを選ぶ</option>
                {saasOptions.map((o) => (
                  <option key={o.slug} value={o.slug}>{`${o.label}（${o.count}件）`}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="fy-label">
              <span className="sr-only">カテゴリ</span>
              <select
                className="fy-select"
                value={q.purpose.kind === "category" ? q.purpose.slug : ""}
                onChange={(e) => e.target.value && onChange({ ...q, purpose: { kind: "category", slug: e.target.value }, features: [] }, "purpose")}
              >
                <option value="">カテゴリを選ぶ</option>
                {categoryOptions.map((o) => (
                  <option key={o.slug} value={o.slug}>{`${o.label}（${o.count}件）`}</option>
                ))}
              </select>
            </label>
          )}
        </fieldset>

        {query && (
          <a className="fy-jump" href="#fy-results-h">
            結果へ移動
          </a>
        )}

        <fieldset className="fy-field">
          <legend>あなたは？</legend>
          <div className="fy-seg">
            {(Object.keys(PROFILE_LABELS) as Profile[]).map((p) => (
              <label key={p} className="fy-seg__opt">
                <input type="radio" name="fy-profile" checked={q.profile === p} onChange={() => set({ profile: p }, "profile")} />
                <span>{PROFILE_LABELS[p]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="fy-field fy-label">
          <span className="fy-legend">技術レベル（利用環境）</span>
          <select
            className="fy-select"
            value={q.skill}
            onChange={(e) => set({ skill: Number(e.target.value) as TechnicalLevel }, "skill")}
          >
            {([0, 1, 2, 3] as TechnicalLevel[]).map((l) => (
              <option key={l} value={l}>
                {TECHNICAL_LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        </label>

        <label className="fy-field fy-label">
          <span className="fy-legend">ライセンス</span>
          <select className="fy-select" value={q.license} onChange={(e) => set({ license: e.target.value as LicensePolicy }, "license")}>
            {(Object.keys(LICENSE_LABELS) as LicensePolicy[]).map((l) => (
              <option key={l} value={l}>
                {LICENSE_LABELS[l]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="fy-field">
          <legend>必須の条件</legend>
          <div className="fy-checks">
            <Check label="自分のサーバーで動かす（セルフホスト）" checked={q.selfHost} onChange={(v) => set({ selfHost: v }, "selfhost")} />
            <Check label="Dockerで動かしたい" checked={q.needDocker} onChange={(v) => set({ needDocker: v }, "docker")} />
            <Check label="日本語の画面・資料が必要" checked={q.needJa} onChange={(v) => set({ needJa: v }, "ja")} />
            <Check label="会社の業務で使う（商用利用）" checked={q.commercial} onChange={(v) => set({ commercial: v }, "commercial")} />
          </div>
        </fieldset>

        <fieldset className="fy-field">
          <legend>重視すること</legend>
          <div className="fy-checks">
            {(Object.keys(EMPHASIS_LABELS) as Emphasis[]).map((e) => (
              <Check key={e} label={EMPHASIS_LABELS[e]} checked={q.emphasis.includes(e)} onChange={() => set({ emphasis: toggle(q.emphasis, e) }, "focus")} />
            ))}
          </div>
        </fieldset>

        {features && (
          <fieldset className="fy-field">
            <legend>必要な機能（診断データがあるSaaSだけ）</legend>
            <div className="fy-checks">
              {features.map((f) => (
                <Check
                  key={f.id}
                  label={f.label}
                  checked={q.features.includes(f.id)}
                  onChange={(v) => set({ features: v ? [...q.features, f.id] : q.features.filter((x) => x !== f.id) }, "features")}
                />
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </form>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="fy-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/* ------------------------------------------------------------------ *
 * 結果
 * ------------------------------------------------------------------ */

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86_400_000);
}

function Results({
  query,
  items,
  excluded,
  catalog,
  shown,
  onMore,
  onChange,
}: {
  query: RecQuery;
  items: RankedItem[];
  excluded: ReturnType<typeof recommend>["excluded"];
  catalog: RecCatalog;
  shown: number;
  onMore: () => void;
  onChange: (q: RecQuery, field: string) => void;
}) {
  const purposeName =
    query.purpose.kind === "saas" ? catalog.saas[query.purpose.slug] ?? query.purpose.slug : catalog.categories[query.purpose.slug] ?? query.purpose.slug;
  const age = daysSince(catalog.observedAt);
  const observed = catalog.observedAt ? catalog.observedAt.slice(0, 10) : "不明";
  const compare = new Set(catalog.compareSlugs);
  const top = items[0];

  return (
    <>
      <p className="fy-summary">
        {`「${purposeName}」${query.purpose.kind === "saas" ? "の代わり" : "のOSS"}・${PROFILE_LABELS[query.profile]}の条件で、${items.length}件が当てはまりました`}
        {excluded.length > 0 ? `（条件に合わず${excluded.length}件を除外）` : ""}
        {`。データの取得日：${observed}`}
      </p>
      {age != null && age > EXPLAIN.staleDays && (
        <div className="notice notice--warn" role="status">
          {`Starや更新状況などのデータは${age}日前に取得したものです。最新の状況は各リポジトリで確認してください。`}
        </div>
      )}

      {items.length === 0 ? (
        <div className="notice notice--info">
          <strong>条件に合うOSSが見つかりませんでした。</strong>
          <br />
          {"必須の条件を1つ外すと、候補が見つかることがあります。"}
          <div className="fy-relax">
            {query.license !== "any" && (
              <button type="button" className="btn" onClick={() => onChange({ ...query, license: "any" }, "relax")}>
                ライセンスの条件を外す
              </button>
            )}
            {query.needDocker && (
              <button type="button" className="btn" onClick={() => onChange({ ...query, needDocker: false }, "relax")}>
                Dockerの条件を外す
              </button>
            )}
            {query.needJa && (
              <button type="button" className="btn" onClick={() => onChange({ ...query, needJa: false }, "relax")}>
                日本語の条件を外す
              </button>
            )}
            {query.features.length > 0 && (
              <button type="button" className="btn" onClick={() => onChange({ ...query, features: [] }, "relax")}>
                必要な機能の条件を外す
              </button>
            )}
          </div>
        </div>
      ) : (
        <ol className="fy-list">
          {items.slice(0, shown).map((it) => (
            <RecCard
              key={it.tool.id}
              item={it}
              compareWith={top && top.tool.id !== it.tool.id && compare.has(compareSlug(top.tool.id, it.tool.id)) ? top : null}
            />
          ))}
        </ol>
      )}
      {items.length > shown && (
        <button type="button" className="btn fy-more" onClick={onMore}>
          {`さらに表示（残り${items.length - shown}件）`}
        </button>
      )}

      {excluded.length > 0 && (
        <details className="fy-excluded">
          <summary>{`条件に合わず除外した候補（${excluded.length}件）`}</summary>
          <ul>
            {excluded.map((e) => (
              <li key={e.tool.id}>
                <Link href={`/tools/${e.tool.id}/`}>{e.tool.name}</Link>
                {`：${e.reason}`}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="fy-links">
        {query.purpose.kind === "saas" && (
          <Link href={`/alternatives/${query.purpose.slug}/`}>{`${purposeName}の代替OSSの一覧と比較`}</Link>
        )}
        <Link href="/diagnosis/">質問に答えて選ぶ（OSS診断）</Link>
        <Link href="/rankings/">人気・急成長・おすすめランキング</Link>
      </p>
    </>
  );
}

function RecCard({ item, compareWith }: { item: RankedItem; compareWith: RankedItem | null }) {
  const t = item.tool;
  const lic = t.license ? `${t.license}（${LICENSE_GROUP_LABELS[t.licenseGroup]}）` : LICENSE_GROUP_LABELS.unknown;
  return (
    <li className="fy-card panel">
      <div className="fy-card__head">
        <span className="fy-card__rank" aria-label={`${item.rank}位`}>
          {item.rank}
        </span>
        <div className="fy-card__title">
          <h3 className="fy-card__name">
            <Link href={`/tools/${t.id}/`} onClick={() => trackEvent("for_you_click", { rank: item.rank })}>
              {t.name}
            </Link>
          </h3>
          {t.desc && <p className="fy-card__desc">{t.desc}</p>}
        </div>
      </div>
      <ul className="fy-facts" aria-label="基本の情報">
        <li>{`ライセンス：${lic}`}</li>
        <li>{`Docker：${t.docker === true ? "確認済み" : t.docker === false ? "確認できず" : "未確認"}`}</li>
        <li>{`日本語：${t.jaUi === true ? "画面あり" : t.jaDocs === "official" ? "公式資料あり" : t.jaDocs === "community" ? "有志の資料あり" : t.jaUi === false && t.jaDocs === "none" ? "なし（確認済み）" : "未確認"}`}</li>
        {t.stars != null && <li>{`★${t.stars.toLocaleString("ja-JP")}`}</li>}
      </ul>

      <div className="fy-card__cols">
        <div>
          <h4 className="fy-h">おすすめする理由</h4>
          {item.reasons.length > 0 ? (
            <ul className="fy-reasons">
              {item.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">条件に合うことを示す確認済みの情報は、まだ少ない候補です。</p>
          )}
        </div>
        {item.cautions.length > 0 && (
          <div>
            <h4 className="fy-h">確認しておきたい点</h4>
            <ul className="fy-cautions">
              {item.cautions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {item.diversityNote && <p className="fy-note muted">{item.diversityNote}</p>}

      <details className="rank-why">
        <summary>{`評価の内訳（適合度${item.score}点・根拠の確認率${item.evidence}%）`}</summary>
        <table className="rank-why__table">
          <thead>
            <tr>
              <th scope="col">項目</th>
              <th scope="col">重み</th>
              <th scope="col">点</th>
              <th scope="col">加重</th>
            </tr>
          </thead>
          <tbody>
            {item.signals.map((s) => (
              <tr key={s.key} className={s.known ? undefined : "rank-why__unknown"}>
                <th scope="row">
                  {s.label}
                  <small>{s.known ? s.basis : `未確認（中立の${s.used}点で計算）：${s.basis}`}</small>
                </th>
                <td>{`${Math.round(s.weight * 100)}%`}</td>
                <td>{s.known ? s.value : "—"}</td>
                <td>{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <p className="fy-card__links">
        <Link href={`/tools/${t.id}/`}>詳細を見る</Link>
        {compareWith && <Link href={`/compare/${compareSlug(compareWith.tool.id, t.id)}/`}>{`${compareWith.tool.name}と比較`}</Link>}
      </p>
    </li>
  );
}

function ForYouSkeleton() {
  return (
    <div className="fy-skeleton" role="status">
      <span className="sr-only">読み込み中</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="fy-skeleton__card" aria-hidden="true">
          <div className="fy-skeleton__line fy-skeleton__line--title" />
          <div className="fy-skeleton__line" />
          <div className="fy-skeleton__line fy-skeleton__line--short" />
        </div>
      ))}
    </div>
  );
}
