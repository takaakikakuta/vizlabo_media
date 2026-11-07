import type { CaseStudy } from "./types";

/* 元記事（出典ページ）にある動画。cases.json の video（YouTube のURL か true）を読み、
   事例セレクション（選記事）と要約ページに「動画あり」の印を出す。
   動画は元記事の説明と一緒に見てもらうものなので、動画への直リンクは出さない（読者は出典ボタンから元記事へ）。
   video は scripts/video/detect.mjs が元記事を走査して付ける（手で true と書いてもよい）。 */

/** 元記事に動画があるか（video が URL か true なら真。印の表示に使う） */
export function hasVideo(c: CaseStudy): boolean {
  return c.video === true || (typeof c.video === "string" && c.video.trim() !== "");
}
