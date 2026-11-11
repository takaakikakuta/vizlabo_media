"use client";

import { useEffect } from "react";

/* 出典（提供元の元記事）へのリンクのクリック＝送客を数える（app/api/views/route.ts に kind: "click"）。
   リンク側には data-case-src={事例ID} を付けるだけでよい（事例ページの出典ボタン、リンクのみの事例カード）。
   サイト全体で1つだけ置き、クリックをまとめて拾う。中クリック（新しいタブ）も数える。
   同じタブで同じ事例を何度押しても1回にする（閲覧と同じ数え方）。 */
export default function SourceClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.type === "auxclick" && e.button !== 1) return;
      const a = (e.target as Element | null)?.closest?.("a[data-case-src]");
      const id = a?.getAttribute("data-case-src");
      if (!id) return;
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
