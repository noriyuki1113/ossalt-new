import { json, toolDetail } from "@/lib/agent-data";
import { getActiveTools } from "@/lib/data";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getActiveTools().map((t) => ({ file: `${t.id}.json` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const data = toolDetail(file.replace(/\.json$/, ""));
  return data ? json(data) : new Response("Not found", { status: 404 });
}
