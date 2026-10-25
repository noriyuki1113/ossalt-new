"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { normalizeSearchText } from "@/lib/tools";

export type SaasEntry = { slug: string; name: string; aliases: string[]; count: number };

const MAX_SUGGESTIONS = 6;

/**
 * 「いま使っているSaaS」から代替のOSSを探す検索ボックス。
 * 入力に合う SaaS を候補に出し、選ぶとその代替ページ（/alternatives/<slug>/）へ移動する。
 * 候補に無い言葉は、ツール一覧の検索（/tools/?q=）へ送る。
 */
export function SaasSearch({ entries }: { entries: SaasEntry[] }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);

  const q = normalizeSearchText(query.trim());
  const matches = useMemo(() => {
    if (!q) return [];
    const scored = entries
      .map((e) => {
        const names = [e.name, ...e.aliases].map(normalizeSearchText);
        const starts = names.some((n) => n.startsWith(q));
        const has = names.some((n) => n.includes(q));
        return { e, rank: starts ? 0 : has ? 1 : 2 };
      })
      .filter((x) => x.rank < 2)
      .sort((a, b) => a.rank - b.rank || b.e.count - a.e.count);
    return scored.slice(0, MAX_SUGGESTIONS).map((x) => x.e);
  }, [entries, q]);

  const freeIndex = matches.length; // 最後の選択肢：ツール一覧の検索
  const optionCount = q ? matches.length + 1 : 0;

  function go(index: number) {
    if (index >= 0 && index < matches.length) router.push(`/alternatives/${matches[index].slug}/`);
    else if (q) router.push(`/tools/?q=${encodeURIComponent(query.trim().slice(0, 100))}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && optionCount) {
      e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % optionCount);
    } else if (e.key === "ArrowUp" && optionCount) {
      e.preventDefault(); setOpen(true); setActive((a) => (a <= 0 ? optionCount - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false); setActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(active >= 0 ? active : matches.length ? 0 : freeIndex);
    }
  }

  const expanded = open && optionCount > 0;
  return (
    <form
      className="saas-search"
      role="search"
      aria-label="使っているSaaSから探す"
      onSubmit={(e) => { e.preventDefault(); go(active >= 0 ? active : matches.length ? 0 : freeIndex); }}
    >
      <label className="saas-search__label" htmlFor={`${listId}-input`}>いま使っているSaaSの名前から探す</label>
      <div className="saas-search__box">
        <input
          id={`${listId}-input`}
          className="saas-search__input"
          type="search"
          inputMode="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="例：Notion、Slack、kintone、Zapier"
          value={query}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? `${listId}-opt-${active}` : undefined}
          onChange={(e) => { setQuery(e.target.value); setActive(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="btn btn--primary saas-search__submit">探す</button>
        {expanded && (
          <ul id={`${listId}-list`} className="saas-search__list" role="listbox">
            {matches.map((m, i) => (
              <li
                key={m.slug}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={active === i}
                className="saas-search__opt"
                onMouseDown={(e) => { e.preventDefault(); go(i); }}
              >
                <span>{m.name}の代わりになるOSS</span>
                <small>{m.count}件</small>
              </li>
            ))}
            <li
              id={`${listId}-opt-${freeIndex}`}
              role="option"
              aria-selected={active === freeIndex}
              className="saas-search__opt saas-search__opt--free"
              onMouseDown={(e) => { e.preventDefault(); go(freeIndex); }}
            >
              <span>「{query.trim()}」でツール名・説明から探す</span>
            </li>
          </ul>
        )}
      </div>
    </form>
  );
}

/** よく見られるSaaSへのすぐ使えるリンク */
export function PopularSaas({ entries, limit = 10 }: { entries: SaasEntry[]; limit?: number }) {
  return (
    <div className="chips saas-popular" aria-label="人気のSaaS">
      {entries.slice(0, limit).map((e) => (
        <Link key={e.slug} href={`/alternatives/${e.slug}/`} className="chip" style={{ textDecoration: "none" }}>
          {e.name}
          <span className="chip__n">{e.count}</span>
        </Link>
      ))}
      <Link href="/alternatives/" className="chip chip--more" style={{ textDecoration: "none" }}>すべてのSaaS →</Link>
    </div>
  );
}
