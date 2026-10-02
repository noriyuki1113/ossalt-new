import { DATA_NOTICE, builtAt, categoriesList, json } from "@/lib/agent-data";

export const dynamic = "force-static";

export function GET() {
  return json({ updated_at: builtAt(), notice: DATA_NOTICE, categories: categoriesList() });
}
