import { alternativeDetail, json } from "@/lib/agent-data";
import { getCompetitors } from "@/lib/data";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getCompetitors().map((c) => ({ file: `${c.slug}.json` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const data = alternativeDetail(file.replace(/\.json$/, ""));
  return data ? json(data) : new Response("Not found", { status: 404 });
}
