"use client";

import { useEffect } from "react";

/* 計測ビーコン（/api/track へ送る）。画面には何も描かない。
   ・課題ページ／事例ページは ISR でキャッシュされるため、サーバー側では数えられない。
     ブラウザで実際に表示されたときにここから1回だけ送る。
   ・同じセッションでの再読込・戻るは sessionStorage で重複排除する（PVを水増ししない）。
   ・送信失敗は黙って捨てる（計測のために閲覧体験を落とさない）。 */

const KEY = "vz:track";

function sent(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function remember(s: Set<string>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...s].slice(-200)));
  } catch { /* プライベートモード等。重複排除なしで続行 */ }
}

/** 一度だけ送る。dedupeKey が既送なら送らない */
function send(dedupeKey: string, payload: Record<string, unknown>) {
  const s = sent();
  if (s.has(dedupeKey)) return;
  s.add(dedupeKey);
  remember(s);
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch { /* noop */ }
}

/* 初回表示（通常のページ読み込み）用のインラインスクリプト。
   課題ページは事例カードが数千枚になることがあり、React の水和（hydration）が終わるまで数秒かかる。
   その前に離脱した閲覧も数えられるよう、HTMLに埋めたスクリプトで水和を待たずに送る。
   サイト内リンクでの遷移（client navigation）では React が挿入した script は実行されないので、
   その場合は下の useEffect が送る。両方が走っても sessionStorage のキーで1回に収まる。 */
const INLINE = (dedupeKey: string, payload: Record<string, unknown>) =>
  `(function(k,p){try{var s=JSON.parse(sessionStorage.getItem(${JSON.stringify(KEY)})||"[]");if(s.indexOf(k)>=0)return;s.push(k);sessionStorage.setItem(${JSON.stringify(KEY)},JSON.stringify(s.slice(-200)))}catch(e){}try{fetch("/api/track",{method:"POST",headers:{"Content-Type":"application/json"},body:p,keepalive:true}).catch(function(){})}catch(e){}})(${JSON.stringify(dedupeKey)},${JSON.stringify(JSON.stringify(payload))})`
    .replace(/</g, "\\u003c");

/** ページ閲覧（課題ページ・事例ページ） */
export function TrackView({ kind, target }: { kind: "view:challenge" | "view:case"; target: string }) {
  useEffect(() => {
    send(`${kind}:${target}`, { kind, target });
  }, [kind, target]);
  return <script dangerouslySetInnerHTML={{ __html: INLINE(`${kind}:${target}`, { kind, target }) }} />;
}

/* ファインダー。状態はURLクエリにあるので、回答が増えるたびにこのコンポーネントが再描画される。
   ・新しく答えた軸だけを finder:answer として送る（スキップ "-" は送らない）
   ・結果一覧に到達したら、その回答の組み合わせを finder:result として1回送る
   ・「最初からやり直す」で回答が空になったら、送信済みの記録を消して次の周回を数えられるようにする */
export function TrackFinder({ answers, showResults, count }: {
  answers: Record<string, string>;
  showResults: boolean;
  count: number;
}) {
  const sig = Object.entries(answers).sort().map(([k, v]) => `${k}=${v}`).join("&");
  useEffect(() => {
    if (!sig) {
      const s = sent();
      for (const k of [...s]) if (k.startsWith("finder:")) s.delete(k);
      remember(s);
      return;
    }
    for (const [k, v] of Object.entries(answers)) {
      if (v === "-") continue;
      send(`finder:answer:${k}=${v}`, { kind: "finder:answer", target: `${k}=${v}`, answers });
    }
    if (showResults) {
      send(`finder:result:${sig}`, { kind: "finder:result", answers, count });
    }
    // answers は sig で同一性を判定する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, showResults, count]);
  return null;
}
