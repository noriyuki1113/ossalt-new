"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { POSTHOG } from "@/lib/posthog/config";
import { analyticsAvailable, capturePageview, startAnalytics, stopAnalytics } from "@/lib/posthog/client";
import { CONSENT_EVENT, OPEN_SETTINGS_EVENT, readConsent, writeConsent, type ConsentState } from "@/lib/posthog/consent";
import { linkDomain } from "@/lib/posthog/privacy";
import { isSlug, type LinkKind } from "@/lib/posthog/events";
import { resetTrackingForNavigation, track } from "@/lib/posthog/track";

/**
 * 計測（PostHog）の同意バナーと、ページ表示・外部リンクの送信。
 * 設定（トークン・ホスト）が無いビルドでは、何も表示せず何もしない。
 */
export function AnalyticsConsent() {
  if (!POSTHOG.enabled) return null;
  return <AnalyticsConsentInner />;
}

function AnalyticsConsentInner() {
  const pathname = usePathname();
  const [state, setState] = useState<ConsentState>("unset");
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const lastSent = useRef<string | null>(null);

  // 初回：保存済みの同意を読む。同意済みならSDKを読み込む
  useEffect(() => {
    const ok = analyticsAvailable();
    setAvailable(ok);
    const c = readConsent();
    setState(c);
    setReady(true);
  }, []);

  // フッターの「計測の設定」から開く
  useEffect(() => {
    const open = () => setPanelOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
  }, []);

  const choose = useCallback((next: "granted" | "denied") => {
    writeConsent(next);
    setState(next);
    setPanelOpen(false);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: next }));
    if (next === "denied") {
      lastSent.current = null;
      stopAnalytics();
    }
  }, []);

  // 同意中：SDKを読み込み、いま見ているページの表示を1回だけ送る（遷移のたびに、新しいページだけ。クエリは送らない）
  useEffect(() => {
    if (!ready || !available || state !== "granted") return;
    let cancelled = false;
    void startAnalytics().then(() => {
      if (cancelled || lastSent.current === pathname) return;
      lastSent.current = pathname;
      resetTrackingForNavigation();
      capturePageview();
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, ready, available, state]);

  // 外部リンク：data-ph-link を付けたリンクだけを、公開先ドメインとslugで数える
  useEffect(() => {
    if (!available) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[data-ph-link]") as HTMLAnchorElement | null;
      if (!a) return;
      const kind = a.dataset.phLink as LinkKind;
      const slug = a.dataset.phSlug ?? "";
      const domain = linkDomain(a.getAttribute("href"));
      if (!domain || !isSlug(slug)) return;
      track("external_oss_link_clicked", { link_kind: kind, slug, domain });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [available]);

  if (!ready || !available) return null;
  const show = state === "unset" || panelOpen;
  if (!show) return null;

  return (
    <div className="consent" role="dialog" aria-labelledby="consent-title" aria-describedby="consent-body">
      <div className="consent__text">
        <strong id="consent-title" className="consent__title">サイトの改善のための計測について</strong>
        <p id="consent-body" className="consent__body">
          どのページやOSSが見られたかを集計するため、PostHog を使います。検索した言葉・入力内容・個人情報は送らず、録画やCookieも使いません。同意しない場合は何も送りません。
          <Link href="/privacy/">詳しく</Link>
          {state !== "unset" && <> いまの設定：{state === "granted" ? "同意している" : "同意していない"}</>}
        </p>
      </div>
      <div className="consent__actions">
        <button type="button" className="btn" onClick={() => choose("denied")}>同意しない</button>
        <button type="button" className="btn btn--primary" onClick={() => choose("granted")}>同意する</button>
      </div>
    </div>
  );
}

/** フッターに置く「計測の設定」リンク。計測が無効なビルド・許可されないホストでは出さない */
export function AnalyticsSettingsLink() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(POSTHOG.enabled && analyticsAvailable());
  }, []);
  if (!show) return null;
  return (
    <button type="button" className="consent-link" onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}>
      計測の設定
    </button>
  );
}
