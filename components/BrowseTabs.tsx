"use client";

import { useState } from "react";
import Link from "next/link";

/* 「課題から／困りごとから／業種から」をタブで切り替える索引。
   3セクションに分けると縦に長くなるので、1枠にまとめて切り替える。
   中身はサーバー側で集計済みのものを受け取るだけ（このコンポーネントは表示と切り替えだけ）。 */

export type BrowseChallenge = { slug: string; label: string; desc?: string; count: number; color: string };
export type BrowseIndustry = { slug: string; label: string; count: number };
export type BrowseTag = { tag: string; count: number };

type TabKey = "challenge" | "tag" | "industry";

export default function BrowseTabs({ challenges, tags, industries }: {
  challenges: BrowseChallenge[];
  tags: BrowseTag[];
  industries: BrowseIndustry[];
}) {
  const [tab, setTab] = useState<TabKey>("challenge");

  const TABS: { key: TabKey; label: string; count: number; sub: string; href: string }[] = [
    { key: "challenge", label: "課題から", count: challenges.length,
      sub: "業種をまたぐ困りごとの型から、解決事例をたどる", href: "/challenges" },
    { key: "tag", label: "困りごとから", count: tags.length,
      sub: "カテゴリより細かい粒度。「うちと同じだ」と思う一言から事例へ", href: "/tags" },
    { key: "industry", label: "業種から", count: industries.length,
      sub: "自社と近い業種の実例に絞る", href: "/industries" },
  ];
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-ink">
        <div role="tablist" aria-label="事例の探し方" className="flex flex-wrap items-end">
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <button key={t.key} type="button" role="tab" aria-selected={on}
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 px-3.5 pb-3 pt-1 text-[15px] transition first:pl-0 ${
                  on ? "font-display border-ink text-ink"
                     : "border-transparent text-muted hover:text-ink"}`}>
                {t.label}
                <span className="num ml-1.5 text-[11.5px] text-muted">{t.count}</span>
              </button>
            );
          })}
        </div>
        <Link href={current.href}
          className="mb-3 shrink-0 border-b border-ink pb-0.5 text-[12.5px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
          一覧 →
        </Link>
      </div>

      <p className="mt-4 text-[12.5px] text-muted">{current.sub}</p>

      <div className="mt-5" role="tabpanel">
        {tab === "challenge" && (
          <div className="grid gap-x-12 border-t border-line md:grid-cols-2">
            {challenges.map((ch) => (
              <Link key={ch.slug} href={`/challenge/${ch.slug}`}
                className="row group flex items-baseline gap-4 border-b border-line2 px-2 py-4 no-underline">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: ch.color }} />
                <span className="min-w-0 flex-1">
                  <span className="font-display block text-[16px] text-ink group-hover:text-brand">{ch.label}</span>
                  {ch.desc && <span className="mt-1 block text-[12px] text-muted">{ch.desc}</span>}
                </span>
                <span className="num shrink-0 text-[15px] text-ink2">{ch.count}</span>
              </Link>
            ))}
          </div>
        )}

        {tab === "tag" && (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3.5 border-t border-line pt-6">
            {tags.map((t) => (
              <Link key={t.tag} href={`/tag/${encodeURIComponent(t.tag)}`}
                className="group inline-flex items-baseline gap-1.5 no-underline">
                <span className="border-b border-transparent text-[15px] text-ink group-hover:border-ink">#{t.tag}</span>
                <span className="num text-[11.5px] text-muted">{t.count}</span>
              </Link>
            ))}
          </div>
        )}

        {tab === "industry" && (
          <div className="grid gap-x-12 border-t border-line md:grid-cols-2">
            {industries.map((ind) => (
              <Link key={ind.slug} href={`/industry/${ind.slug}`}
                className="row group flex items-baseline justify-between gap-4 border-b border-line2 px-2 py-3.5 no-underline">
                <span className="font-display text-[16px] text-ink group-hover:text-brand">{ind.label}</span>
                <span className="num text-[15px] text-ink2">{ind.count}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
