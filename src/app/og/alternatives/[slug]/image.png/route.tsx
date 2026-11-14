import { ImageResponse } from "next/og";
import { getCompetitor, getCompetitors } from "@/lib/data";
import { alternativeOgText, ALT_OG_SIZE } from "@/lib/alternative-og";
import { ogFonts } from "@/lib/og-font";

export const dynamic = "force-static";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getCompetitors().map((c) => ({ slug: c.slug }));
}

/**
 * 代替ページ（/alternatives/<slug>/）の共有用画像（1200×630）。ビルド時に1回だけ作る静的なPNG。
 * SaaSの名前・候補の件数・健全度の上位の候補を入れる（すべて掲載データから。手で書いた文言は入れない）。
 */
export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const c = getCompetitor(slug);
  if (!c) return new Response("Not found", { status: 404 });
  const o = alternativeOgText(c.name, c.tools.map((t) => t.name));
  const { fonts, family } = ogFonts(o.allText, 700);
  const navy = "#1f3a6e";
  const red = "#d9472b";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#eef0ea", borderTop: `8px solid ${navy}`, borderLeft: `8px solid ${red}`, padding: "64px 80px 52px", fontFamily: family, color: "#16191d" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: red }}>{o.eyebrow}</div>
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 28, fontSize: o.titleSize, fontWeight: 700, lineHeight: 1.15 }}>
          <span style={{ color: navy }}>{o.saas}</span>
          <span>の代わりになるOSS</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 26, fontSize: 44, fontWeight: 700 }}>
          <span>候補</span>
          <span style={{ color: red, fontSize: 76, fontWeight: 700, margin: "0 10px" }}>{o.count}</span>
          <span>件を比較</span>
        </div>
        {o.top && (
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 18, fontSize: 30, fontWeight: 700, color: "#4a525c" }}>{o.top}</div>
        )}
        <div style={{ display: "flex", marginTop: "auto", justifyContent: "flex-end", alignItems: "baseline", fontSize: 40, fontWeight: 700, color: navy }}>
          <span>ossalt</span><span style={{ fontSize: 24, fontWeight: 700, color: "#6b7280" }}>.jp</span>
        </div>
      </div>
    ),
    { ...ALT_OG_SIZE, fonts }
  );
}
