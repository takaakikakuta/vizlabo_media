"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* 事例一覧の検索＋絞り込み。
   ・キーワード：行の data-search（タイトル・要約・会社名・タグ等）へのAND部分一致
   ・チップ　　：課題／業種／困りごとをタブで切り替えて選ぶ。行の data-facet のトークンに完全一致
   両者は掛け合わせ（AND）。一覧はサーバーで全件描画したまま、表示/非表示だけを切り替える。 */

export type FacetChallenge = { slug: string; label: string; count: number; color: string };
export type FacetIndustry = { slug: string; label: string; count: number };
export type FacetTag = { tag: string; count: number };

type TabKey = "keyword" | "challenge" | "industry" | "tag";

export default function CaseSearch({ total, challenges, industries, tags, children }: {
  total: number;
  challenges: FacetChallenge[];
  industries: FacetIndustry[];
  tags: FacetTag[];
  children: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabKey>("keyword");
  const [selCh, setSelCh] = useState<string | null>(null);
  const [selInd, setSelInd] = useState<string | null>(null);
  const [selTag, setSelTag] = useState<string | null>(null);
  const [hits, setHits] = useState(total);
  const listRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => {
    const out: { label: string; clear: () => void }[] = [];
    if (selCh) out.push({ label: challenges.find((c) => c.slug === selCh)?.label ?? selCh, clear: () => setSelCh(null) });
    if (selInd) out.push({ label: industries.find((i) => i.slug === selInd)?.label ?? selInd, clear: () => setSelInd(null) });
    if (selTag) out.push({ label: `#${selTag}`, clear: () => setSelTag(null) });
    if (q.trim()) out.push({ label: `「${q.trim()}」`, clear: () => setQ("") });
    return out;
  }, [selCh, selInd, selTag, q, challenges, industries]);

  useEffect(() => {
    const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-search]") ?? [];
    let n = 0;
    rows.forEach((row) => {
      const hay = row.dataset.search ?? "";
      const facets = ` ${row.dataset.facet ?? ""} `;
      const ok =
        terms.every((t) => hay.includes(t)) &&
        (!selCh || facets.includes(` c:${selCh} `)) &&
        (!selInd || facets.includes(` i:${selInd} `)) &&
        (!selTag || facets.includes(` t:${selTag} `));
      row.hidden = !ok;
      if (ok) n++;
    });
    setHits(n);
  }, [q, selCh, selInd, selTag]);

  const filtering = q.trim() || active.length > 0;

  const TABS: { key: TabKey; label: string }[] = [
    { key: "keyword", label: "キーワード" },
    { key: "challenge", label: "課題" },
    { key: "industry", label: "業種" },
    { key: "tag", label: "困りごと" },
  ];

  return (
    <div>
      {/* 探し方をタブで切り替える。選んだ条件は跨いで掛け合わせ（AND） */}
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
            <input
              type="search" value={q} onChange={(e) => setQ(e.target.value)} autoFocus={false}
              placeholder="会社名・製品名・キーワードで検索（スペース区切りでAND）"
              aria-label="事例を検索"
              className="w-full border-2 border-ink bg-white px-5 py-3 text-[15px] text-ink outline-none placeholder:text-muted"
            />
          )}
          {tab === "challenge" && challenges.map((c) => (
            <Chip key={c.slug} on={selCh === c.slug} count={c.count} dot={c.color}
              onClick={() => setSelCh(selCh === c.slug ? null : c.slug)}>{c.label}</Chip>
          ))}
          {tab === "industry" && industries.map((i) => (
            <Chip key={i.slug} on={selInd === i.slug} count={i.count}
              onClick={() => setSelInd(selInd === i.slug ? null : i.slug)}>{i.label}</Chip>
          ))}
          {tab === "tag" && tags.map((t) => (
            <Chip key={t.tag} on={selTag === t.tag} count={t.count}
              onClick={() => setSelTag(selTag === t.tag ? null : t.tag)}>#{t.tag}</Chip>
          ))}
        </div>
      </div>

      {/* 状態表示 */}
      <p className="mb-8 mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-[12px] text-muted" aria-live="polite">
        {filtering ? (
          <>
            <span><span className="num text-[14px] text-ink">{hits}</span> 件がヒット</span>
            {active.map((a) => (
              <button key={a.label} type="button" onClick={a.clear}
                className="border border-ink bg-ink px-2 py-0.5 text-[11px] font-bold text-white transition hover:bg-white hover:text-ink">
                {a.label} ×
              </button>
            ))}
          </>
        ) : (
          <>タイトル・要約・会社名・製品名・困りごとタグを横断検索。チップとの掛け合わせもできます</>
        )}
      </p>

      <div ref={listRef}>{children}</div>

      {filtering && hits === 0 && (
        <div className="border-y border-line py-14 text-center">
          <p className="text-[14px] text-body">この条件に一致する事例はありませんでした。</p>
          <p className="mt-2 text-[12px] text-muted">キーワードを短くするか、チップを外して試してみてください。</p>
        </div>
      )}
    </div>
  );
}

function Chip({ on, count, dot, onClick, children }: {
  on: boolean; count: number; dot?: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`inline-flex items-baseline gap-1.5 border px-2.5 py-1 text-[12.5px] transition ${
        on ? "border-ink bg-ink font-bold text-white"
           : "border-line bg-white text-body hover:border-ink hover:text-ink"}`}>
      {dot && <span className="h-1.5 w-1.5 shrink-0 self-center rounded-full" style={{ background: on ? "#fff" : dot }} />}
      {children}
      <span className={`num text-[10.5px] ${on ? "text-white/70" : "text-muted"}`}>{count}</span>
    </button>
  );
}
