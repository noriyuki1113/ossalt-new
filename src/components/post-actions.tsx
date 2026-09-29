"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * ブログ記事末尾の「参考になった」ボタンと共有ボタン。
 *
 * - 「参考になった」はUmamiのイベントとして記録するだけで、押された数は画面に出さない
 *   （数が少ないうちは逆効果になりやすく、数を保存するサーバーも持たないため）。
 * - 押した状態は表示中のページ内だけで持つ。Cookie・localStorageには保存しない
 *   （プライバシーポリシー第3節「Cookieを使用しない」と整合させるため）。
 * - 共有は各サービスの共有用URLを開くだけで、外部スクリプトは読み込まない。
 */
export function PostActions({ slug, title, url }: { slug: string; title: string; url: string }) {
  const [helpful, setHelpful] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = `${title} | ossalt.jp`;
  const shares = [
    {
      network: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      network: "bluesky",
      label: "Bluesky",
      href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text}\n${url}`)}`,
    },
    {
      network: "hatena",
      label: "はてなブックマーク",
      href: `https://b.hatena.ne.jp/entry/panel/?url=${encodeURIComponent(url)}`,
    },
    {
      network: "line",
      label: "LINE",
      href: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <section className="post-actions" aria-label="この記事について">
      <div className="post-actions__helpful">
        <p className="post-actions__q">この記事は参考になりましたか？</p>
        <button
          type="button"
          className={`btn${helpful ? "" : " btn--primary"}`}
          aria-pressed={helpful}
          disabled={helpful}
          onClick={() => {
            setHelpful(true);
            trackEvent("blog_helpful", { slug });
          }}
        >
          {helpful ? "ありがとうございます" : "参考になった"}
        </button>
      </div>

      <div className="post-actions__share">
        <p className="post-actions__q">記事を共有する</p>
        <div className="post-actions__buttons">
          {shares.map((s) => (
            <a
              key={s.network}
              className="btn btn--sm"
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("blog_share", { slug, network: s.network })}
            >
              {s.label}
            </a>
          ))}
          <button
            type="button"
            className="btn btn--sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                trackEvent("blog_share", { slug, network: "copy" });
              } catch {
                // クリップボードが使えない環境では何もしない（アドレスバーからコピーできる）
              }
            }}
          >
            {copied ? "コピーしました" : "リンクをコピー"}
          </button>
        </div>
      </div>
    </section>
  );
}
