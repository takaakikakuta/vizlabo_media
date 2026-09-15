import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CHALLENGES, CHALLENGE_MAP, challengeLabel, productLabel } from "../../../lib/taxonomy";
import { casesByChallenge } from "../../../lib/cases";
import { relatedChallenges } from "../../../lib/affinity";
import { bridgeText } from "../../../lib/bridges";
import { challengeStyle } from "../../../lib/visuals";
import CaseGrid, { ListHead } from "../../../components/CaseGrid";

export function generateStaticParams() {
  return CHALLENGES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = CHALLENGE_MAP[slug];
  if (!t) return {};
  return {
    title: `${t.label}の解決事例`,
    description: `「${t.label}」を他社が何でどう解決したか。関連する課題や解き方の引き出しも横断で見られます。`,
  };
}

export default async function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = CHALLENGE_MAP[slug];
  if (!t) notFound();

  const cases = casesByChallenge(slug);
  const related = relatedChallenges(slug);

  // この課題の“解き方”＝製品カテゴリ別の件数（引き出しの数）
  const catCount: Record<string, number> = {};
  for (const c of cases) catCount[c.productCategory] = (catCount[c.productCategory] || 0) + 1;
  const cats = Object.entries(catCount).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <ListHead eyebrow="課題から探す" title={`${t.label}の解決事例`} sub={t.desc} count={cases.length} />

      {/* 隣の課題＝この誌面ならではの気づき */}
      {related.length > 0 && (
        <section className="mb-14">
          <h2 className="font-display border-b border-ink pb-4 text-[21px] text-ink">
            この課題に関心があるなら、こんな課題も
          </h2>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            「{t.label}」を解決した企業が、<b className="text-body">同時に解決していることが多い課題</b>です。
            根っこでつながっている隣の課題に気づくと、打ち手が広がります。
          </p>
          <div className="mt-6 grid gap-x-10 border-t border-line md:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} href={`/challenge/${r.slug}`}
                className="row group flex flex-col border-b border-line2 px-2 py-5 no-underline">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display inline-flex items-baseline gap-2 text-[16px] text-ink group-hover:text-brand">
                    <span className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full"
                      style={{ background: challengeStyle(r.slug).solid }} />
                    {challengeLabel(r.slug)}
                  </span>
                  <span className="num shrink-0 text-[13px] text-accent">{r.lift}×</span>
                </div>
                <p className="mt-2.5 flex-1 text-[12.5px] leading-[1.9] text-body">{bridgeText(slug, r.slug)}</p>
                <div className="mt-3 border-t border-line2 pt-2.5 text-[11px] text-muted">
                  この課題の事例の <b className="text-ink2">{r.pct}%</b>（{r.coCount}件）が同時に解決
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* この課題の解き方 */}
      {cats.length > 0 && (
        <section className="mb-14">
          <h2 className="font-display border-b border-ink pb-4 text-[21px] text-ink">
            この課題の解き方は{cats.length}通り
          </h2>
          <p className="mt-3 text-[12.5px] text-muted">同じ課題でも、業種や状況でアプローチはこれだけ違います。</p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            {cats.map(([cat, n]) => (
              <Link key={cat} href={`/product/${cat}`}
                className="group inline-flex items-baseline gap-1.5 no-underline">
                <span className="border-b border-transparent text-[13.5px] text-ink group-hover:border-ink">{productLabel(cat)}</span>
                <span className="num text-[11px] text-muted">{n}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display mb-6 border-b border-ink pb-4 text-[21px] text-ink">
          「{t.label}」の事例
          <span className="num ml-2.5 text-[14px] text-muted">{cases.length}件</span>
        </h2>
        <CaseGrid cases={cases} />
      </section>
    </div>
  );
}
