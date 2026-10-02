import { markdown, toolMd } from "@/lib/agent-data";
import { getActiveTools } from "@/lib/data";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getActiveTools().map((t) => ({ file: `${t.id}.md` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const md = toolMd(file.replace(/\.md$/, ""));
  return md ? markdown(md) : new Response("Not found", { status: 404 });
}
