import { DATA_NOTICE, builtAt, json, toolsList } from "@/lib/agent-data";

export const dynamic = "force-static";

export function GET() {
  const tools = toolsList();
  return json({ count: tools.length, updated_at: builtAt(), notice: DATA_NOTICE, tools });
}
