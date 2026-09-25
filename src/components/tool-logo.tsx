"use client";

import { useState } from "react";

/**
 * GitHub のオーナーアバターをロゴとして表示する。
 *
 * - 画像はビルド時に同梱せず、`https://github.com/<owner>.png` を都度ホットリンクする
 *   （336件のライセンス・帰属管理を避けるための意図的な選択。README参照）。
 * - 取得できない／404のときは、崩れた画像アイコンを出さず頭文字のプレースホルダに切り替える。
 * - alt="" はロゴが装飾であるため。ツール名は隣接テキストが既に伝えるので、
 *   alt に名前を入れるとスクリーンリーダーで二重に読み上げられる。
 */
export function ToolLogo({
  githubUrl,
  name,
  size = 40,
}: {
  githubUrl: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const owner = githubUrl?.match(/github\.com\/([^/]+)\//)?.[1] ?? null;
  const src = owner ? `https://github.com/${owner}.png` : null;

  if (!src || failed) {
    return (
      <span
        className="tool-logo tool-logo--fallback"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
        aria-hidden="true"
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="tool-logo"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
