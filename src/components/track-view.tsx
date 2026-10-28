"use client";

import { useEffect } from "react";
import { whenActive } from "@/lib/posthog/client";
import type { EventName, EventProps } from "@/lib/posthog/events";
import { track } from "@/lib/posthog/track";

/**
 * 「このページ（この結果）が表示された」ことを、1回だけ送る。表示は何も出さない。
 * 同意前は送らず、同意された時点で、いま見ている分を1回送る。再レンダリング・StrictModeの二重実行では増えない。
 */
export function TrackView<N extends EventName>({ event, props, dedupeKey }: { event: N; props: EventProps[N]; dedupeKey: string }) {
  const serialized = JSON.stringify(props);
  useEffect(() => {
    const cancel = whenActive(() => track(event, JSON.parse(serialized) as EventProps[N], dedupeKey));
    return cancel;
  }, [event, serialized, dedupeKey]);
  return null;
}
