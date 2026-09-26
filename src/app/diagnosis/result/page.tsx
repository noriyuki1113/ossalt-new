import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DiagnosisResult, type ToolFact } from "@/components/diagnosis-result";
import { getMeta, getTools } from "@/lib/data";
import { getAllDiagnosisToolInputs, getHealthPercentiles } from "@/lib/diagnosis-tools";

export const metadata: Metadata = {
  title: "診断結果",
  description: "OSS診断の結果。あなたの条件との一致度が高い順に、オープンソースの代替候補を表示します。",
  alternates: { canonical: "/diagnosis/result/" },
  robots: { index: false, follow: true },
};

export default function DiagnosisResultPage() {
  const meta = getMeta();
  const toolInputs = getAllDiagnosisToolInputs();
  const healthPercentiles = getHealthPercentiles();

  const toolFacts: Record<string, ToolFact> = {};
  const byId = new Map(getTools().map((t) => [t.id, t]));
  for (const input of toolInputs) {
    const tool = byId.get(input.meta.toolId);
    toolFacts[input.meta.toolId] = {
      name: input.name,
      license: tool?.license ?? null,
      dockerAvailable: tool?.docker_available ?? null,
    };
  }

  return (
    <>
      <SiteHeader current="/diagnosis" />
      <main className="wrap page">
        <DiagnosisResult
          toolInputs={toolInputs}
          healthPercentiles={healthPercentiles}
          toolFacts={toolFacts}
        />
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
