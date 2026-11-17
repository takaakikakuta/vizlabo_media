"use client";

import { useEffect } from "react";

/* 事例ページ（kind="case"）と記事ページ（kind="article"、id は記事の slug）の閲覧を数える通知（app/api/views/route.ts）。
   同じタブで同じページを開き直しても数えないよう、sessionStorage で1回に絞る。 */
export default function ViewBeacon({ id, kind = "case" }: { id: string; kind?: "case" | "article" }) {
  useEffect(() => {
    const key = kind === "article" ? `jm_viewed_article:${id}` : `jm_viewed:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // ストレージが使えない環境でも数えはする
    }
    const body = JSON.stringify(kind === "article" ? { id, kind: "article" } : { id });
    if (!navigator.sendBeacon?.("/api/views", new Blob([body], { type: "application/json" }))) {
      fetch("/api/views", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, [id, kind]);
  return null;
}
