"use client";

import { useMemo, useState } from "react";
import { ToolRow } from "@/components/tool-views";
import {
  filterAndSort,
  licenseFacets,
  type SortKey,
  type Tool,
} from "@/lib/tools";
import { t } from "@/lib/site";

type Props = {
  tools: Tool[];
  categories?: Array<{ slug: string; nameJa: string; count: number }>;
  showCategoryFilter?: boolean;
  showLicenseFilter?: boolean;
  defaultSort?: SortKey;
};

// 初期表示の件数。384件を一度に描画するとスマホで縦に長大なページになる
// ため、まずこの件数だけ出し「もっと見る」で追加表示する。
// 検索・絞り込み・並び替えを操作した場合は、この上限を無視して全件出す
// （絞り込んだのに途中で切れると使いにくいため）。
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

  const licenses = useMemo(() => licenseFacets(tools), [tools]);

  const results = useMemo(
    () => filterAndSort(tools, { query, category, license, dockerOnly, japaneseOnly, sort }),
    [tools, query, category, license, dockerOnly, japaneseOnly, sort]
  );

  const dirty = Boolean(query || category || license || dockerOnly || japaneseOnly);
  // 並び替えだけを変えた場合も「操作した」とみなし、全件表示に切り替える。
  const isCustomized = dirty || sort !== defaultSort;
  const shown = isCustomized ? results : results.slice(0, visibleCount);
  const remaining = isCustomized ? 0 : results.length - shown.length;

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
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              aria-describedby="browser-count"
            />
          </label>
          <label className="field">
            <span className="field__label">{t("filter.sort")}</span>
            <select
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
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
                onClick={() => setCategory("")}
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
                  onClick={() => setCategory(category === c.slug ? "" : c.slug)}
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
                onChange={(e) => setLicense(e.target.value)}
              >
                <option value="">{t("filter.all")}</option>
                {licenses.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.value}（{l.count}）
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field" style={{ alignSelf: "end" }}>
            <span className="field__label">&nbsp;</span>
            <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={dockerOnly}
                onChange={(e) => setDockerOnly(e.target.checked)}
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
                onChange={(e) => setJapaneseOnly(e.target.checked)}
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

      {results.length === 0 ? (
        <div className="empty">
          <p style={{ margin: "0 0 0.5rem", color: "var(--ink-2)", fontWeight: 700 }}>
            {t("search.empty")}
          </p>
          <p style={{ margin: 0 }}>{t("search.emptyHint")}</p>
        </div>
      ) : (
        <>
          <div className="ledger" style={{ padding: "0 1.15rem 0.5rem" }}>
            {shown.map((tool) => (
              <ToolRow key={tool.id} tool={tool} />
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
