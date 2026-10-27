"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolCard, ToolRow } from "@/components/tool-views";
import {
  filterAndSort,
  licenseFacets,
  type SortKey,
  type Tool,
} from "@/lib/tools";
import { t } from "@/lib/site";
import { LICENSE_GROUP_LABELS, LICENSE_GROUP_ORDER, licenseGroupOf } from "@/lib/compare";

// ライセンス欄の値。「group:osi」のように区分で絞り込むか、個別のライセンス表記で絞り込む
const GROUP_PREFIX = "group:";

type Props = {
  tools: Tool[];
  categories?: Array<{ slug: string; nameJa: string; count: number }>;
  showCategoryFilter?: boolean;
  showLicenseFilter?: boolean;
  defaultSort?: SortKey;
};

// 絞り込み後も一度に数百件を描画しないよう、常に50件ずつ追加表示する。
const PAGE_SIZE = 50;

export function ToolBrowser({
  tools,
  categories = [],
  showCategoryFilter = true,
  showLicenseFilter = true,
  defaultSort = "health",
}: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [license, setLicense] = useState("");
  const [dockerOnly, setDockerOnly] = useState(false);
  const [japaneseOnly, setJapaneseOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>(defaultSort);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [view, setView] = useState<"list" | "cards">("list");

  // トップの検索ボックスや、サイトの検索（WebSite の SearchAction）から /tools/?q=〜 で来たとき、検索語を入れる
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q && q.trim()) setQuery(q.trim().slice(0, 100));
    } catch { /* URLが読めなくても、空の検索で表示する */ }
  }, []);

  const licenses = useMemo(() => licenseFacets(tools), [tools]);
  const groups = useMemo(() => {
    const m = new Map<string, number>();
    for (const tool of tools) {
      const g = licenseGroupOf(tool.license);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return LICENSE_GROUP_ORDER.filter((g) => m.has(g)).map((g) => ({ value: g, count: m.get(g)! }));
  }, [tools]);

  const results = useMemo(() => {
    const group = license.startsWith(GROUP_PREFIX) ? license.slice(GROUP_PREFIX.length) : "";
    const base = group ? tools.filter((tool) => licenseGroupOf(tool.license) === group) : tools;
    return filterAndSort(base, { query, category, license: group ? "" : license, dockerOnly, japaneseOnly, sort });
  }, [tools, query, category, license, dockerOnly, japaneseOnly, sort]);

  const dirty = Boolean(query || category || license || dockerOnly || japaneseOnly);
  const shown = results.slice(0, visibleCount);
  const remaining = Math.max(0, results.length - shown.length);

  const activeFilters: Array<{ key: string; label: string }> = [];
  if (query.trim()) activeFilters.push({ key: "query", label: `検索: ${query.trim().slice(0, 40)}` });
  if (category) activeFilters.push({ key: "category", label: categories.find((c) => c.slug === category)?.nameJa ?? category });
  if (license) activeFilters.push({
    key: "license",
    label: license.startsWith(GROUP_PREFIX)
      ? (LICENSE_GROUP_LABELS[license.slice(GROUP_PREFIX.length) as keyof typeof LICENSE_GROUP_LABELS] ?? license)
      : license,
  });
  if (dockerOnly) activeFilters.push({ key: "docker", label: "Docker対応" });
  if (japaneseOnly) activeFilters.push({ key: "japanese", label: "日本語対応" });

  function clearFilter(key: string) {
    if (key === "query") setQuery("");
    if (key === "category") setCategory("");
    if (key === "license") setLicense("");
    if (key === "docker") setDockerOnly(false);
    if (key === "japanese") setJapaneseOnly(false);
    setVisibleCount(PAGE_SIZE);
  }

  function reset() {
    setQuery("");
    setCategory("");
    setLicense("");
    setDockerOnly(false);
    setJapaneseOnly(false);
    setSort(defaultSort);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div className="panel">
      <div className="toolbar">
        <div className="toolbar__row">
          <label className="field" style={{ flex: "1 1 22rem" }}>
            <span className="field__label">{t("search.label")}</span>
            <input
              className="input input--search"
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
              placeholder={t("search.placeholder")}
              aria-describedby="browser-count"
            />
          </label>
          <label className="field">
            <span className="field__label">{t("filter.sort")}</span>
            <select
              className="select"
              value={sort}
              onChange={(e) => { setSort(e.target.value as SortKey); setVisibleCount(PAGE_SIZE); }}
            >
              <option value="health">{t("sort.health")}</option>
              <option value="stars">{t("sort.stars")}</option>
              <option value="recent">{t("sort.recent")}</option>
              <option value="name">{t("sort.name")}</option>
            </select>
          </label>
        </div>

        {showCategoryFilter && categories.length > 0 && (
          <div className="field">
            <span className="field__label">{t("filter.category")}</span>
            <div className="chips">
              <button
                type="button"
                className="chip"
                aria-pressed={category === ""}
                onClick={() => { setCategory(""); setVisibleCount(PAGE_SIZE); }}
              >
                {t("filter.all")}
                <span className="chip__n">{tools.length}</span>
              </button>
              {categories.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  className="chip"
                  aria-pressed={category === c.slug}
                  onClick={() => { setCategory(category === c.slug ? "" : c.slug); setVisibleCount(PAGE_SIZE); }}
                >
                  {c.nameJa}
                  <span className="chip__n">{c.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="toolbar__row">
          {showLicenseFilter && (
            <label className="field">
              <span className="field__label">{t("filter.license")}</span>
              <select
                className="select"
                value={license}
                onChange={(e) => { setLicense(e.target.value); setVisibleCount(PAGE_SIZE); }}
              >
                <option value="">{t("filter.all")}</option>
                <optgroup label="種類で絞り込む">
                  {groups.map((g) => (
                    <option key={g.value} value={GROUP_PREFIX + g.value}>
                      {LICENSE_GROUP_LABELS[g.value]}（{g.count}）
                    </option>
                  ))}
                </optgroup>
                <optgroup label="ライセンス名で絞り込む">
                  {licenses.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.value}（{l.count}）
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          )}
          <label className="field" style={{ alignSelf: "end" }}>
            <span className="field__label">&nbsp;</span>
            <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={dockerOnly}
                onChange={(e) => { setDockerOnly(e.target.checked); setVisibleCount(PAGE_SIZE); }}
                id="docker-only"
                style={{ width: 16, height: 16 }}
              />
              <label htmlFor="docker-only" style={{ cursor: "pointer" }}>
                {t("filter.selfhost")}
              </label>
            </span>
          </label>
          <label className="field" style={{ alignSelf: "end" }}>
            <span className="field__label">&nbsp;</span>
            <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={japaneseOnly}
                onChange={(e) => { setJapaneseOnly(e.target.checked); setVisibleCount(PAGE_SIZE); }}
                id="japanese-only"
                style={{ width: 16, height: 16 }}
              />
              <label htmlFor="japanese-only" style={{ cursor: "pointer" }}>
                {t("filter.japanese")}
              </label>
            </span>
          </label>
          <span
            id="browser-count"
            aria-live="polite"
            className="mono muted"
            style={{ marginLeft: "auto", alignSelf: "end", paddingBottom: "0.5rem" }}
          >
            {t("search.count", { n: results.length })}
            {dirty && (
              <>
                {" "}
                <button
                  type="button"
                  className="chip"
                  onClick={reset}
                  style={{ marginLeft: "0.5rem" }}
                >
                  {t("search.clear")}
                </button>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="browser-results-header">
        <p className="browser-results-summary">
          {results.length}件中 {shown.length}件を表示
        </p>
        <div className="browser-view-switch" role="group" aria-label="表示形式">
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >一覧</button>
          <button
            type="button"
            aria-pressed={view === "cards"}
            onClick={() => setView("cards")}
          >カード</button>
        </div>
      </div>
      {activeFilters.length > 0 && (
        <div className="browser-active-filters" aria-label="適用中の検索条件">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              className="browser-active-filters__item"
              onClick={() => clearFilter(f.key)}
              aria-label={`${f.label}を解除`}
            >{f.label} <span aria-hidden="true">×</span></button>
          ))}
        </div>
      )}

      {results.length === 0 ? (
        <div className="empty">
          <p style={{ margin: "0 0 0.5rem", color: "var(--ink-2)", fontWeight: 700 }}>
            {t("search.empty")}
          </p>
          <p style={{ margin: 0 }}>{t("search.emptyHint")}</p>
        </div>
      ) : (
        <>
          <div className={view === "cards" ? "browse-grid" : "ledger browser-ledger"}>
            {shown.map((tool) => (
              view === "cards"
                ? <ToolCard key={tool.id} tool={tool} />
                : <ToolRow key={tool.id} tool={tool} />
            ))}
          </div>
          {remaining > 0 && (
            <div style={{ padding: "0 1.15rem 1.15rem", textAlign: "center" }}>
              <button
                type="button"
                className="btn"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              >
                もっと見る（残り{remaining}件）
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
