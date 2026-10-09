import { useEffect, useRef, type RefObject } from "react";

/**
 * 画面内で実際に見られたか（viewable）を、1回の表示につき1回だけ知らせる。
 * 基準：要素の50%以上が、続けて1秒以上画面に入ったとき（一般的な広告の閲覧の基準に合わせる）。
 * 「ページに表示された（描画された）」こととは区別する。描画だけでは計測しない。
 * IntersectionObserver が使えないブラウザでは何もしない（計測しないほうを選ぶ）。
 */
export function useViewable<T extends Element>(onView: () => void, enabled = true): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const cb = useRef(onView);
  cb.current = onView;

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let done = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (done) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timer ??= setTimeout(() => {
            timer = null;
            // 裏のタブで開かれただけのときは数えない（次に画面に入り直したときに数え直す）
            if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
            done = true;
            io.disconnect();
            cb.current();
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);

  return ref;
}
