/**
 * 日本語の短い文（見出し・導入文）を、語の途中で改行させない。
 * iOS Safari は word-break: auto-phrase に未対応で、「オー／プンソース」のように語の途中で折り返す。
 * ビルド時に Intl.Segmenter で語に分け、語ごとに改行しない塊（.nb）にする。
 * 長い本文には使わない（HTMLが増える）。見出しと、1〜2文の導入文だけに使う。
 */
import { jaSegments } from "@/lib/ja-segments";

export function Ja({ children }: { children: string }) {
  return (
    <>
      {jaSegments(children).map((w, i) => (w.trim() === "" ? w : <span key={i} className="nb">{w}</span>))}
    </>
  );
}
