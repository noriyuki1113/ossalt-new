"use client";

import { AFFILIATE_REL, AFFILIATE_VPS, getAffiliateHref, getTrackingImageUrl } from "@/lib/affiliates";
import { trackAffiliateClick } from "@/lib/affiliate-track";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";

export function VpsRecommendation({ path }: { path: string }) {
  return (
    <section className="mt2">
      <h2 className="h3">このツールを自前で動かすには</h2>
      <p className="muted" style={{ fontSize: "0.875rem" }}>
        OSSセルフホストでよく選ばれる4つのVPSをまとめました。
      </p>
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {AFFILIATE_VPS.map((v) => {
          const href = getAffiliateHref(v);
          const trackingImg = getTrackingImageUrl(v.id);
          return (
            <div key={v.id} className="panel">
              <div className="panel__head">
                <h3 className="panel__title">{v.name}</h3>
                <span className="panel__meta">{v.recommendedFor}</span>
              </div>
              <div className="panel__body">
                <p className="muted" style={{ fontSize: "0.875rem" }}>{v.description}</p>
                <a
                  className="btn"
                  href={href}
                  target="_blank"
                  rel={AFFILIATE_REL}
                  onClick={() =>
                    trackAffiliateClick({ provider: v.id, path, label: v.ctaLabel })
                  }
                >
                  {v.ctaLabel}
                </a>
                {trackingImg && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={trackingImg}
                    width={1}
                    height={1}
                    alt=""
                    style={{ position: "absolute", width: 1, height: 1 }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <AffiliateDisclosure className="mt1" />
    </section>
  );
}
