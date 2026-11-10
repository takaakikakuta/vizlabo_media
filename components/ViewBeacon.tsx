"use client";

import { useEffect } from "react";

/* 事例ページの閲覧を数える通知（app/api/views/route.ts）。
   同じタブで同じ事例を開き直しても数えないよう、sessionStorage で1回に絞る。 */
export default function ViewBeacon({ id }: { id: string }) {
  useEffect(() => {
    const key = `jm_viewed:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // ストレージが使えない環境でも数えはする
    }
    const body = JSON.stringify({ id });
    if (!navigator.sendBeacon?.("/api/views", new Blob([body], { type: "application/json" }))) {
      fetch("/api/views", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, [id]);
  return null;
}
