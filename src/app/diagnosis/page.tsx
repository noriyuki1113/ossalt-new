import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DiagnosisWizard } from "@/components/diagnosis-wizard";
import { getMeta } from "@/lib/data";

export const metadata: Metadata = {
  title: "あなたに合うOSS診断",
  description:
    "6つの質問に答えるだけで、今使っているSaaSに合うオープンソースの代替候補を探せます。ログイン不要・無料・約2分。",
  alternates: { canonical: "/diagnosis/" },
};

export default function DiagnosisPage() {
  const meta = getMeta();
  return (
    <>
      <SiteHeader current="/diagnosis" />
      <main className="wrap page">
        <DiagnosisWizard />
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
