/**
 * 部品から呼ぶ送信の入口。同意・設定がなければ何もしない。
 * 同じイベント（名前＋対象）は、ページ遷移までの間に1回だけ。
 */
import { captureEvent, isActive } from "./client";
import { createDeduper, type EventName, type EventProps } from "./events";

const deduper = createDeduper();

export function resetTrackingForNavigation(): void {
  deduper.reset();
}

/** key を指定すると、同じkeyのイベントは1回だけ送る（省略時はその都度送る） */
export function track<N extends EventName>(name: N, props: EventProps[N], key?: string): void {
  try {
    if (!isActive()) return;
    if (key && !deduper.first(`${name}:${key}`)) return;
    captureEvent(name, props);
  } catch {
    /* 無視 */
  }
}
