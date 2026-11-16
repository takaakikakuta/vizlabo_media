"use client";

import { useEffect } from "react";

/* 流入元の計測（app/api/sources/route.ts）。URL に utm_source が付いた来訪を1件数える。
   サイト全体で1つだけ置く（app/layout.tsx）。UTM つきの来訪は必ずページの読み込みから始まるので、初回の表示時だけ見ればよい。
   同じタブで同じURLを読み込み直しても数えないよう、sessionStorage で1回に絞る。
   来訪元は sessionStorage に控えておき、同じタブでメルマガに登録したら reportSignup() がその来訪元に登録を1件足す。 */

const STORE = "jm_src";

type Src = { s: string; m: string; c: string; p: string };

function send(src: Src, kind: "visit" | "signup") {
  const body = JSON.stringify({ ...src, kind });
  if (!navigator.sendBeacon?.("/api/sources", new Blob([body], { type: "application/json" }))) {
    fetch("/api/sources", { method: "POST", body, keepalive: true }).catch(() => {});
  }
}

/** メルマガ登録が成立したときに呼ぶ。このタブが UTM つきで来ていたら、その来訪元の登録として数える */
export function reportSignup() {
  try {
    const raw = sessionStorage.getItem(STORE);
    if (!raw || sessionStorage.getItem(`${STORE}:signup`)) return;
    sessionStorage.setItem(`${STORE}:signup`, "1");
    send(JSON.parse(raw) as Src, "signup");
  } catch {
    // ストレージが使えない環境では来訪元が分からないので数えない
  }
}

export default function SourceBeacon() {
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const s = q.get("utm_source");
    if (!s) return;
    const src: Src = { s, m: q.get("utm_medium") ?? "", c: q.get("utm_campaign") ?? "", p: location.pathname };
    const seen = `${STORE}:seen:${[src.s, src.m, src.c, src.p].join("|")}`;
    try {
      sessionStorage.setItem(STORE, JSON.stringify(src));
      if (sessionStorage.getItem(seen)) return;
      sessionStorage.setItem(seen, "1");
    } catch {
      // ストレージが使えない環境でも数えはする
    }
    send(src, "visit");
  }, []);
  return null;
}
