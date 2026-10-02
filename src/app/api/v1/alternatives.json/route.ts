import { DATA_NOTICE, alternativesList, builtAt, json } from "@/lib/agent-data";

export const dynamic = "force-static";

export function GET() {
  const items = alternativesList();
  return json({ count: items.length, updated_at: builtAt(), notice: DATA_NOTICE, alternatives: items });
}
