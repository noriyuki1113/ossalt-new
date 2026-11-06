import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DiagnosisWizard } from "@/components/diagnosis-wizard";
import { getMeta } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { SAAS_IDS, SAAS_LABELS } from "@/lib/diagnosis-types";
import { FEATURES } from "@/lib/site";


export const metadata: Metadata = pageMeta({
  title: "あなたに合うOSS診断",
  description:
    "7つの質問に答えるだけで、今使っているSaaSに合うオープンソースの代替候補を探せます。ログイン不要・無料・約2分。",
  path: "/diagnosis/",
});

export default function DiagnosisPage() {
  const meta = getMeta();
  return (
    <>
      <SiteHeader current="/diagnosis" />
      <main className="wrap page">
        <p className="muted diag-scope">
          {`OSS診断は、${SAAS_IDS.map((id) => SAAS_LABELS[id]).join("・")}の代替を、7つの質問に答えて絞り込むページです。`}
          {FEATURES.forYou ? (
            <>
              {"ほかのSaaSや、ライセンスなどの条件をまとめて選んで候補を一覧で比べたい場合は、"}
              <Link href="/for-you/">For You</Link>
              {"を使えます。"}
            </>
          ) : (
            <>
              {"ほかのSaaSの代替は、"}
              <Link href="/">トップの検索</Link>
              {"や"}
              <Link href="/categories/">カテゴリ一覧</Link>
              {"から探せます。"}
            </>
          )}
        </p>
        <DiagnosisWizard />
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
