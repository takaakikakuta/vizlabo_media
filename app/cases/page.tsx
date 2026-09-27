import Link from "next/link";
import { allCases, challengeCounts, industryCounts, tagCounts } from "../../lib/cases";
import { CHALLENGES, INDUSTRIES } from "../../lib/taxonomy";
import { challengeStyle } from "../../lib/visuals";
import CaseGrid, { ListHead, searchKey } from "../../components/CaseGrid";
import CaseFilter, { type CaseQuery } from "../../components/CaseFilter";

/* 事例一覧。以前は全件を静的HTMLに描画していたが、4,000件超でHTMLが30MBを超え
   Amplifyのビルド容量制限（220MB）にも達したため、サーバー側での絞り込み＋
   100件ページングに変更した（searchParams参照により動的レンダリング）。 */

export const metadata = { title: "すべての解決事例" };

const PER_PAGE = 100;

export default async function CasesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const query: CaseQuery = { q: one(sp.q), ch: one(sp.ch), ind: one(sp.ind), tag: one(sp.tag) };
  const page = Math.max(1, parseInt(one(sp.p) ?? "1", 10) || 1);

  const cases = allCases();
  const chCounts = challengeCounts();
  const indCounts = industryCounts();
  const facetChallenges = CHALLENGES.map((ch) => ({
    slug: ch.slug, label: ch.label, count: chCounts[ch.slug] ?? 0, color: challengeStyle(ch.slug).solid,
  }));
  const facetIndustries = INDUSTRIES.map((ind) => ({
    slug: ind.slug, label: ind.label, count: indCounts[ind.slug] ?? 0,
  }));
  const facetTags = tagCounts().filter(([, n]) => n >= 3).slice(0, 30)
    .map(([tag, count]) => ({ tag, count }));

  // 絞り込み（旧クライアント版と同じ条件のAND掛け合わせ）
  const terms = (query.q ?? "").toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = cases.filter((c) => {
    if (terms.length) {
      const hay = searchKey(c);
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    if (query.ch && !(c.challenges as string[]).includes(query.ch)) return false;
    if (query.ind && c.customer.industry !== query.ind) return false;
    if (query.tag && !(c.tags ?? []).includes(query.tag)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const cur = Math.min(page, totalPages);
  const pageCases = filtered.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <ListHead eyebrow="事例一覧" title="すべての解決事例"
        sub="成果の数字がある事例を先に並べています。右端の数字で、行を跨いで成果を比較できます。"
        count={cases.length} />

      <CaseFilter query={query} hits={filtered.length}
        challenges={facetChallenges} industries={facetIndustries} tags={facetTags} />

      <CaseGrid cases={pageCases} />

      {filtered.length === 0 && (
        <div className="border-y border-line py-14 text-center">
          <p className="text-[14px] text-body">この条件に一致する事例はありませんでした。</p>
          <p className="mt-2 text-[12px] text-muted">キーワードを短くするか、チップを外して試してみてください。</p>
        </div>
      )}

      {totalPages > 1 && (
        <Pager query={query} cur={cur} totalPages={totalPages} total={filtered.length} />
      )}
    </div>
  );
}

/* ページャ。条件を保ったまま p だけ差し替える */
function Pager({ query, cur, totalPages, total }: {
  query: CaseQuery; cur: number; totalPages: number; total: number;
}) {
  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (query.q?.trim()) sp.set("q", query.q.trim());
    if (query.ch) sp.set("ch", query.ch);
    if (query.ind) sp.set("ind", query.ind);
    if (query.tag) sp.set("tag", query.tag);
    if (p > 1) sp.set("p", String(p));
    const s = sp.toString();
    return s ? `/cases?${s}` : "/cases";
  };
  const from = (cur - 1) * PER_PAGE + 1;
  const to = Math.min(cur * PER_PAGE, total);

  return (
    <nav aria-label="ページ送り" className="mt-8 flex flex-wrap items-baseline justify-between gap-4 border-t border-line pt-6">
      <p className="text-[12px] text-muted">
        <span className="num text-[13px] text-ink">{from}–{to}</span> 件 / 全
        <span className="num ml-1 text-[13px] text-ink">{total}</span> 件
        <span className="num ml-3 text-[11px]">{cur} / {totalPages} ページ</span>
      </p>
      <div className="flex items-center gap-2">
        {cur > 1 ? (
          <Link href={pageHref(cur - 1)}
            className="border border-ink px-4 py-2 text-[12.5px] font-bold text-ink no-underline transition hover:bg-ink hover:text-white">
            ← 前の{PER_PAGE}件
          </Link>
        ) : (
          <span className="border border-line px-4 py-2 text-[12.5px] text-muted/50">← 前の{PER_PAGE}件</span>
        )}
        {cur < totalPages ? (
          <Link href={pageHref(cur + 1)}
            className="border border-ink bg-ink px-4 py-2 text-[12.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            次の{PER_PAGE}件 →
          </Link>
        ) : (
          <span className="border border-line px-4 py-2 text-[12.5px] text-muted/50">次の{PER_PAGE}件 →</span>
        )}
      </div>
    </nav>
  );
}
