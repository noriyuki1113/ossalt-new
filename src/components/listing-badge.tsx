import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { SITE } from "@/lib/site";

/**
 * 掲載バッジの貼り付け用コード。開発者がREADMEに貼ると、そのツールの
 * ossalt.jpのページへリンクする。バッジの有無で掲載順や評価は変わらない。
 */
export function badgeSnippets(toolId: string) {
  const base = SITE.url.replace(/\/$/, "");
  const page = `${base}/tools/${toolId}/`;
  const en = `${base}/badges/listed-en.svg`;
  const ja = `${base}/badges/listed-ja.svg`;
  return [
    { label: "Markdown（英語）", code: `[![Listed on ossalt.jp](${en})](${page})` },
    { label: "Markdown（日本語）", code: `[![ossalt.jp に掲載](${ja})](${page})` },
    { label: "HTML（英語）", code: `<a href="${page}"><img src="${en}" alt="Listed on ossalt.jp" height="28"></a>` },
  ];
}

export function ListingBadge({ toolId, toolName }: { toolId: string; toolName: string }) {
  return (
    <details className="badge-box">
      <summary>{`${toolName}の開発者の方へ：掲載バッジ`}</summary>
      <div className="badge-box__body">
        <p className="muted" style={{ fontSize: "0.8125rem", marginTop: 0 }}>
          {"READMEなどに貼ると、このページへのリンクになります。貼るかどうかで、掲載の順番や評価が変わることはありません。"}
        </p>
        <p className="badge-box__preview">
          <img src="/badges/listed-en.svg" alt="Listed on ossalt.jp" height={28} />
          <img src="/badges/listed-ja.svg" alt="ossalt.jp に掲載" height={28} />
        </p>
        {badgeSnippets(toolId).map((s) => (
          <div className="badge-box__snippet" key={s.label}>
            <div className="badge-box__label">
              <span>{s.label}</span>
              <CopyButton text={s.code} />
            </div>
            <code>{s.code}</code>
          </div>
        ))}
        <p className="muted" style={{ fontSize: "0.75rem", marginBottom: 0 }}>
          <Link href="/badge/">バッジについて</Link>
        </p>
      </div>
    </details>
  );
}
