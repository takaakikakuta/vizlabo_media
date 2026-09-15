import Link from "next/link";
import type { CaseStudy } from "../lib/types";
import { linkableTags } from "../lib/cases";

/* 困りごとタグ。12個の課題カテゴリより細かい粒度で、事例同士を横に繋ぐ索引。
   2件以上に付いたタグだけリンクにする（1件しかないタグは辿っても行き止まり）。

   linkable=false は、行やカード全体が既に <Link> になっている場所で使う。
   <a> の入れ子は不正なHTMLでハイドレーションエラーになるため、そこでは素のテキストで出す。 */
export default function Tags({ c, max = 6, size = "sm", linkable = true }:
  { c: CaseStudy; max?: number; size?: "sm" | "md"; linkable?: boolean }) {
  const all = c.tags ?? [];
  if (!all.length) return null;
  const nav = new Set(linkableTags(c));
  const cls = size === "md" ? "text-[13px]" : "text-[11.5px]";

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${cls}`}>
      {all.slice(0, max).map((t) =>
        linkable && nav.has(t) ? (
          <Link key={t} href={`/tag/${encodeURIComponent(t)}`}
            className="border-b border-line text-body no-underline transition hover:border-ink hover:text-ink">
            #{t}
          </Link>
        ) : (
          <span key={t} className="text-muted">#{t}</span>
        )
      )}
    </div>
  );
}
