import { alternativeMd, markdown } from "@/lib/agent-data";
import { getCompetitors } from "@/lib/data";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getCompetitors().map((c) => ({ file: `${c.slug}.md` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const md = alternativeMd(file.replace(/\.md$/, ""));
  return md ? markdown(md) : new Response("Not found", { status: 404 });
}
