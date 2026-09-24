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
  const [sort, setSort] = useState<SortKey>(defaultSort);

  const licenses = useMemo(() => licenseFacets(tools), [tools]);

  const results = useMemo(
    () => filterAndSort(tools, { query, category, license, dockerOnly, sort }),
    [tools, query, category, license, dockerOnly, sort]
  );

  const dirty = Boolean(query || category || license || dockerOnly);

  function reset() {
    setQuery("");
    setCategory("");
    setLicense("");
    setDockerOnly(false);
    setSort(defaultSort);
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
        <div className="ledger" style={{ padding: "0 1.15rem 0.5rem" }}>
          {results.map((tool) => (
            <ToolRow key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
