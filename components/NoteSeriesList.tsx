import Link from "next/link";
import CoverImg from "./CoverImg";
import { ListHead } from "./CaseGrid";
import { NOTE_URL } from "./NoteBanner";
import type { NoteEntry, NotePost } from "../lib/note";

/* note 連載（この事例がスゴイ／事例コラム）の一覧。本文は note にあるので、
   ここはアイキャッチ・見出し・1〜2行の説明だけ出して note に飛ばす。
   2つの連載は上のタブで行き来できる。 */

export const SERIES: Record<NotePost["kind"], { href: string; title: string; sub: string }> = {
  sugoi: {
    href: "/sugoi",
    title: "この事例がスゴイ",
    sub: "他社が公開している導入事例の記事を1本選び、何が読み手を動かしているのかを分析する連載。",
  },
  column: {
    href: "/column",
    title: "事例コラム",
    sub: "導入事例をつくる側・使う側に向けて、事例の書き方と活かし方を書くコラム。",
  },
};

export default function NoteSeriesList({ kind, posts }: { kind: NotePost["kind"]; posts: NoteEntry[] }) {
  const s = SERIES[kind];
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <nav aria-label="note連載" className="mb-8 flex gap-5 border-b border-line text-[13px]">
        {(Object.keys(SERIES) as NotePost["kind"][]).map((k) => (
          <Link key={k} href={SERIES[k].href} aria-current={k === kind ? "page" : undefined}
            className={`-mb-px border-b-2 pb-2 font-bold no-underline ${k === kind
              ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {SERIES[k].title}
          </Link>
        ))}
      </nav>

      <ListHead eyebrow="noteで連載中" title={s.title} sub={s.sub} count={posts.length} />

      {posts.length === 0 ? (
        <p className="text-[13px] text-muted">準備中です。</p>
      ) : (
        <div className="border-t border-line">
          {posts.map((p) => {
            // 見出しの頭の「【この事例がスゴイ！ #012】」は番号欄と重なるので外す
            const title = p.title.replace(/^【[^】]*】\s*/, "");
            return (
              <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer"
                className="row group flex flex-col gap-4 border-b border-line2 px-2 py-6 no-underline sm:flex-row sm:gap-5">
                {/* note のアイキャッチは 1.91:1。文字入りなので比率を保って端を切らない */}
                <div className="relative aspect-[1.91/1] w-full shrink-0 self-start overflow-hidden rounded-[3px] border border-line2 bg-soft sm:w-48">
                  {p.image && <CoverImg src={p.image} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11.5px] text-muted">
                    {p.no != null && <span className="num text-[12px] text-ink">#{String(p.no).padStart(3, "0")}</span>}
                    <span>note</span>
                    {p.date && <span className="num ml-auto">{p.date.replace(/-/g, ".")}</span>}
                  </div>
                  <h2 className="font-display mt-2 text-[18px] leading-[1.5] text-ink group-hover:text-brand">{title}</h2>
                  {p.desc && <p className="mt-2.5 line-clamp-3 text-[12.5px] leading-[1.9] text-muted">{p.desc}</p>}
                  <p className="mt-2.5 text-[12px] font-bold text-ink">noteで読む →</p>
                </div>
              </a>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-right text-[12px] text-muted">
        <a href={NOTE_URL} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-ink">noteのアカウントを見る →</a>
      </p>
    </div>
  );
}
