"use client";

import { useState } from "react";

export function CopyButton({ text, label = "コピー" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn--sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // クリップボードが使えない環境では、表示中のURLを手で選択してもらう
        }
      }}
    >
      {copied ? "コピーしました" : label}
    </button>
  );
}
