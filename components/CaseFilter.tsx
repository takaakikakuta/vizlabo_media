"use client";

import Link from "next/link";
import { useState } from "react";

/* 事例一覧の検索＋絞り込み（サーバー処理版）。
   以前は全件をDOMに描画してクライアントで表示/非表示を切り替えていたが、
   事例数の増加でHTMLが30MBを超えたため、絞り込みとページングをサーバー側に移した。
   チップはリンク（URLパラメータ）、キーワードはGETフォーム。UIの見た目は旧版を踏襲。 */

export type FacetChallenge = { slug: string; label: string; count: number; color: string };
export type FacetIndustry = { slug: string; label: string; count: number };
export type FacetTag = { tag: string; count: number };

export type CaseQuery = { q?: string; ch?: string; ind?: string; tag?: string };

type TabKey = "keyword" | "challenge" | "industry" | "tag";

/** 現在の条件からURLを組み立てる（pはリセット） */
function href(cur: CaseQuery, patch: Partial<CaseQuery>): string {
  const next = { ...cur, ...patch };
  const p = new URLSearchParams();
  if (next.q?.trim()) p.set("q", next.q.trim());
  if (next.ch) p.set("ch", next.ch);
  if (next.ind) p.set("ind", next.ind);
  if (next.tag) p.set("tag", next.tag);
  const s = p.toString();
  return s ? `/cases?${s}` : "/cases";
}

export default function CaseFilter({ query, hits, challenges, industries, tags }: {
  query: CaseQuery;
  hits: number;
  challenges: FacetChallenge[];
  industries: FacetIndustry[];
  tags: FacetTag[];
}) {
  // 開くタブの初期値は、いま効いている条件に合わせる
  const initial: TabKey = query.ch ? "challenge" : query.ind ? "industry" : query.tag ? "tag" : "keyword";
  const [tab, setTab] = useState<TabKey>(initial);

  const active: { label: string; href: string }[] = [];
  if (query.ch) {
    const c = challenges.find((x) => x.slug === query.ch);
    active.push({ label: c?.label ?? query.ch, href: href(query, { ch: undefined }) });
  }
  if (query.ind) {
    const i = industries.find((x) => x.slug === query.ind);
    active.push({ label: i?.label ?? query.ind, href: href(query, { ind: undefined }) });
  }
  if (query.tag) active.push({ label: `#${query.tag}`, href: href(query, { tag: undefined }) });
  if (query.q?.trim()) active.push({ label: `「${query.q.trim()}」`, href: href(query, { q: undefined }) });

  const filtering = active.length > 0;

  const TABS: { key: TabKey; label: string }[] = [
    { key: "keyword", label: "キーワード" },
    { key: "challenge", label: "課題" },
    { key: "industry", label: "業種" },
    { key: "tag", label: "困りごと" },
  ];

  return (
    <div>
      <div className="border-b border-line pb-5">
        <div role="tablist" aria-label="探し方" className="flex items-baseline gap-1 border-b border-line">
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <button key={t.key} type="button" role="tab" aria-selected={on}
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 px-3.5 pb-2.5 pt-1 text-[13.5px] transition first:pl-0 ${
                  on ? "font-display border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2.5" role="tabpanel">
          {tab === "keyword" && (
            <form action="/cases" method="GET" className="w-full">
              {/* いま効いているチップ条件は隠しフィールドで維持する */}
              {query.ch && <input type="hidden" name="ch" value={query.ch} />}
              {query.ind && <input type="hidden" name="ind" value={query.ind} />}
              {query.tag && <input type="hidden" name="tag" value={query.tag} />}
              <input
                type="search" name="q" defaultValue={query.q ?? ""}
                placeholder="会社名・製品名・キーワードで検索（スペース区切りでAND・Enterで検索）"
                aria-label="事例を検索"
                className="w-full border-2 border-ink bg-white px-5 py-3 text-[15px] text-ink outline-none placeholder:text-muted"
              />
            </form>
          )}
          {tab === "challenge" && challenges.map((c) => (
            <Chip key={c.slug} on={query.ch === c.slug} count={c.count} dot={c.color}
              href={href(query, { ch: query.ch === c.slug ? undefined : c.slug })}>{c.label}</Chip>
          ))}
          {tab === "industry" && industries.map((i) => (
            <Chip key={i.slug} on={query.ind === i.slug} count={i.count}
              href={href(query, { ind: query.ind === i.slug ? undefined : i.slug })}>{i.label}</Chip>
          ))}
          {tab === "tag" && tags.map((t) => (
            <Chip key={t.tag} on={query.tag === t.tag} count={t.count}
              href={href(query, { tag: query.tag === t.tag ? undefined : t.tag })}>#{t.tag}</Chip>
          ))}
        </div>
      </div>

      {/* 状態表示 */}
      <p className="mb-8 mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-[12px] text-muted" aria-live="polite">
        {filtering ? (
          <>
            <span><span className="num text-[14px] text-ink">{hits}</span> 件がヒット</span>
            {active.map((a) => (
              <Link key={a.label} href={a.href}
                className="border border-ink bg-ink px-2 py-0.5 text-[11px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
                {a.label} ×
              </Link>
            ))}
          </>
        ) : (
          <>タイトル・要約・会社名・製品名・困りごとタグを横断検索。チップとの掛け合わせもできます</>
        )}
      </p>
    </div>
  );
}

function Chip({ on, count, dot, href, children }: {
  on: boolean; count: number; dot?: string; href: string; children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-pressed={on}
      className={`inline-flex items-baseline gap-1.5 border px-2.5 py-1 text-[12.5px] no-underline transition ${
        on ? "border-ink bg-ink font-bold text-white"
           : "border-line bg-white text-body hover:border-ink hover:text-ink"}`}>
      {dot && <span className="h-1.5 w-1.5 shrink-0 self-center rounded-full" style={{ background: on ? "#fff" : dot }} />}
      {children}
      <span className={`num text-[10.5px] ${on ? "text-white/70" : "text-muted"}`}>{count}</span>
    </Link>
  );
}
