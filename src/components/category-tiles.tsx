"use client";

import Link from "next/link";
import { useId, useState } from "react";

type Tile = { slug: string; nameJa: string; count: number };

/**
 * トップの「用途から探す」。スマートフォン（幅767px以下）では、既存の並び順（編集順）の先頭 initial 件だけを最初に出し、
 * 残りはボタンで開く。「人気」などの根拠のない順位づけはしない。
 * - ボタンは aria-expanded / aria-controls で開閉の状態を読み上げる（キーボードで操作できる）
 * - JavaScript が動かない場合も、見出しの「カテゴリ一覧」リンクから全カテゴリへ行ける
 * - 幅768px以上では、従来どおり全件を出す（CSS で制御）
 */
export function CategoryTiles({ tiles, initial = 8 }: { tiles: Tile[]; initial?: number }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rest = Math.max(0, tiles.length - initial);
  return (
    <>
      <ul id={id} className={`cat-tiles${open ? "" : " cat-tiles--collapsed"}`} data-initial={initial}>
        {tiles.map((c) => (
          <li key={c.slug}>
            <Link className="cat-tile" href={`/categories/${c.slug}/`}>
              <span>{c.nameJa}</span>
              <span className="cat-tile__n">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <button
          type="button"
          className="btn cat-tiles__toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "カテゴリを少なく表示する" : `すべてのカテゴリを見る（ほか${rest}件）`}
        </button>
      )}
    </>
  );
}
