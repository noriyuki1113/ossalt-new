import { compareMd, guidedComparePairs, markdown } from "@/lib/agent-data";

export const dynamic = "force-static";

export function generateStaticParams() {
  return guidedComparePairs().map((p) => ({ file: `${p.slug}.md` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const md = compareMd(file.replace(/\.md$/, ""));
  return md ? markdown(md) : new Response("Not found", { status: 404 });
}
