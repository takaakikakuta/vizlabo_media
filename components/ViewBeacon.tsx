"use client";

import { useEffect } from "react";

/* 事例ページ（kind="case"）と記事ページ（kind="article"、id は記事の slug）の閲覧を数える通知（app/api/views/route.ts）。
   同じタブで同じページを開き直しても数えないよう、sessionStorage で1回に絞る。
   記事ページでは流入元の手がかり（utm_source・参照元のホスト名だけ・サイト内の画面遷移か）も添える（lib/slots.ts の classifyRef で分類）。
   URL 全体や個人を特定できる値は送らない。 */
export default function ViewBeacon({ id, kind = "case" }: { id: string; kind?: "case" | "article" }) {
  useEffect(() => {
    const key = kind === "article" ? `jm_viewed_article:${id}` : `jm_viewed:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // ストレージが使えない環境でも数えはする
    }
    const body = JSON.stringify(kind === "article" ? { id, kind: "article", r: refHint() } : { id });
    if (!navigator.sendBeacon?.("/api/views", new Blob([body], { type: "application/json" }))) {
      fetch("/api/views", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, [id, kind]);
  return null;
}

/** 流入元の手がかり。サイト内の画面遷移（Next のクライアント遷移）では document.referrer が最初の来訪時のままなので、
    ページを読み込んだときの URL と今の URL が違えばサイト内（n: 1）とする */
function refHint(): { u?: string; h?: string; n?: 1 } {
  const nav = performance.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined;
  if (nav && nav.name.split("#")[0] !== location.href.split("#")[0]) return { n: 1 };
  let h = "";
  try {
    h = document.referrer ? new URL(document.referrer).hostname : "";
  } catch {
    // 読めない参照元は「直接・不明」
  }
  return { u: new URLSearchParams(location.search).get("utm_source") ?? "", h };
}
