import type { CaseStudy } from "./types";

/* 元記事（出典ページ）にある動画。cases.json の video（YouTube のURL）を読み、
   事例セレクション（選記事）と要約ページに「動画あり」の印と動画への導線を出す。
   video は scripts/video/detect.mjs が元記事を走査して付ける（手で書いてもよい）。 */

const YT_HOSTS = new Set(["youtube.com", "m.youtube.com", "youtube-nocookie.com", "youtu.be"]);

/** YouTube のURL（watch / youtu.be / embed / shorts / live）から動画IDを取り出す。YouTube 以外や壊れたURLは undefined */
export function youtubeId(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (!YT_HOSTS.has(host)) return undefined;
    const id = host === "youtu.be"
      ? u.pathname.slice(1).split("/")[0]
      : (u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1]);
    return id && /^[\w-]{11}$/.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

/** 元記事に動画があるか（video が URL か true なら真。印の表示に使う） */
export function hasVideo(c: CaseStudy): boolean {
  return c.video === true || (typeof c.video === "string" && c.video.trim() !== "");
}

/** 動画そのもののURL。YouTube なら埋め込みURLでも watch ページに揃える（それ以外のURLはそのまま）。
    video: true（URL不明・動画ありは確認済み）のときは undefined。導線は元記事に向ける */
export function videoUrl(c: CaseStudy): string | undefined {
  if (typeof c.video !== "string" || !c.video.trim()) return undefined;
  const id = youtubeId(c.video);
  return id ? `https://www.youtube.com/watch?v=${id}` : c.video.trim();
}
