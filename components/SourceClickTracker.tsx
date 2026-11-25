"use client";

import { useEffect } from "react";
import { VIA_PREFIX, VIA_TTL_MS, sendSlotEvents } from "./SlotTracker";

/* 出典（提供元の元記事）へのリンクのクリック＝送客を数える（app/api/views/route.ts に kind: "click"）。
   リンク側には data-case-src={事例ID} を付けるだけでよい（事例ページの出典ボタン、リンクのみの事例カード）。
   サイト全体で1つだけ置き、クリックをまとめて拾う。中クリック（新しいタブ）も数える。
   同じタブで同じ事例を何度押しても1回にする（閲覧と同じ数え方）。
   あわせて、事例ページ（/cases/<id>）で押されたクリックが事例セレクションの枠から来たもの（SlotTracker が30分だけ控える）なら、
   その記事の枠の「経由」の送客として app/api/slots に1回だけ送る。 */
export default function SourceClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.type === "auxclick" && e.button !== 1) return;
      const a = (e.target as Element | null)?.closest?.("a[data-case-src]");
      const id = a?.getAttribute("data-case-src");
      if (!id) return;
      reportVia(id);
      const key = `jm_clicked:${id}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // ストレージが使えなくても数える
      }
      const body = JSON.stringify({ id, kind: "click" });
      if (!navigator.sendBeacon?.("/api/views", new Blob([body], { type: "application/json" }))) {
        fetch("/api/views", { method: "POST", body, keepalive: true }).catch(() => {});
      }
    }
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);
  return null;
}

/** 事例ページで元記事が押されたとき、記事の枠から来ていれば「経由」として数える。控えは使ったら消す（1回だけ） */
function reportVia(id: string) {
  if (location.pathname !== `/cases/${id}` && decodeURIComponent(location.pathname) !== `/cases/${id}`) return;
  try {
    const raw = localStorage.getItem(VIA_PREFIX + id);
    if (!raw) return;
    localStorage.removeItem(VIA_PREFIX + id);
    const v = JSON.parse(raw) as { s?: string; p?: number; at?: number };
    if (!v.s || !v.p || !v.at || Date.now() - v.at > VIA_TTL_MS) return;
    sendSlotEvents(v.s, [{ t: "via", p: v.p, c: id }]);
  } catch {
    // ストレージが使えない環境では経由が分からないので数えない
  }
}
