import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { casesByTag, navigableTags, tagCounts } from "../../../lib/cases";
import { challengeLabel } from "../../../lib/taxonomy";
import { challengeStyle, primaryChallenge } from "../../../lib/visuals";
import CaseGrid, { ListHead } from "../../../components/CaseGrid";

export function generateStaticParams() {
  return navigableTags().map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const tag = decodeURIComponent((await params).tag);
  const n = casesByTag(tag).length;
  if (!n) return {};
  return {
    title: `#${tag} の解決事例`,
    description: `「${tag}」に困っていた企業が、何でどう解決したか。${n}件の導入事例を成果の数字つきで比較できます。`,
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const tag = decodeURIComponent((await params).tag);
  const cases = casesByTag(tag);
  if (!cases.length) notFound();

  // このタグと一緒に付くことが多いタグ＝隣の困りごと
  const co: Record<string, number> = {};
  for (const c of cases) for (const t of c.tags ?? []) if (t !== tag) co[t] = (co[t] || 0) + 1;
  const nav = new Set(navigableTags());
  const related = Object.entries(co)
    .filter(([t, n]) => n >= 2 && nav.has(t))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // この困りごとが属する課題カテゴリの分布
  const chCount: Record<string, number> = {};
  for (const c of cases) chCount[primaryChallenge(c)] = (chCount[primaryChallenge(c)] || 0) + 1;
  const chs = Object.entries(chCount).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <ListHead eyebrow="困りごとから探す" title={`#${tag}`}
        sub={`「${tag}」に困っていた企業が、何でどう解決したか。`} count={cases.length} />

      <div className="mb-12 grid gap-x-14 gap-y-8 border-b border-line pb-10 md:grid-cols-2">
        {related.length > 0 && (
          <div>
            <p className="label mb-3.5 flex items-center gap-2.5">
              <span className="h-px w-5 bg-ink" />一緒に語られる困りごと
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2.5 text-[13px]">
              {related.map(([t, n]) => (
                <Link key={t} href={`/tag/${encodeURIComponent(t)}`}
                  className="group inline-flex items-baseline gap-1.5 no-underline">
                  <span className="border-b border-transparent text-ink group-hover:border-ink">#{t}</span>
                  <span className="num text-[11px] text-muted">{n}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        {chs.length > 0 && (
          <div>
            <p className="label mb-3.5 flex items-center gap-2.5">
              <span className="h-px w-5 bg-ink" />課題カテゴリでは
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5 text-[13px]">
              {chs.map(([slug, n]) => (
                <Link key={slug} href={`/challenge/${slug}`}
                  className="group inline-flex items-baseline gap-1.5 no-underline">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: challengeStyle(slug).solid }} />
                  <span className="border-b border-transparent text-ink group-hover:border-ink">{challengeLabel(slug)}</span>
                  <span className="num text-[11px] text-muted">{n}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <CaseGrid cases={cases} />

      <div className="mt-12 border-t border-line pt-6">
        <Link href="/tags" className="border-b border-ink pb-0.5 text-[13px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
          困りごとタグの一覧（{tagCounts().filter(([, n]) => n >= 2).length}件）→
        </Link>
      </div>
    </div>
  );
}
