import Link from "next/link";
import { getCase } from "../../lib/cases";
import { getArticle, articleThumb } from "../../lib/articles";
import { industryLabel } from "../../lib/taxonomy";
import { parseStat } from "../../lib/stat";
import CoverImg from "../CoverImg";
import type { SenArticle } from "../../lib/articles";
import Toc from "./Toc";
import FeaturedServices from "./FeaturedServices";

/* 「選」テンプレート（テーマ別の事例10選）。順位ではなく並列の選として組む。
   各項目は〈書き下ろしの見出し＋読みどころ〉＋〈事例データから自動で出すカルテと成果数字〉。
   選定基準と範囲は criteriaNote で冒頭に明示する。 */

export default function Sen({ article }: { article: SenArticle }) {
  const entries = article.items
    .map((it, i) => ({ ...it, i, c: getCase(it.caseId) }))
    .filter((e) => e.c);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* ── 題字 ── */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display border-b-2 border-ink pb-1 text-[15px] tracking-[.24em] text-ink">{article.series}</span>
          <span className="num text-[13px] text-muted">#{String(article.no).padStart(3, "0")}</span>
        </div>
        {article.sponsored && (
          <span className="border border-line px-2 py-0.5 text-[10px] font-bold tracking-widest text-muted">Sponsored</span>
        )}
      </div>

      {/* ── 扉 ── */}
      <header className="mt-6">
        <h1 className="font-display mt-5 text-[27px] leading-[1.45] text-ink sm:text-[34px]">
          {article.title.map((line, i) => (
            <span key={i}>{line}{i < article.title.length - 1 && <br />}</span>
          ))}
        </h1>
        <p className="mt-6 text-[14px] leading-[2.1] text-body">{article.lead}</p>
        <p className="mt-5 border border-line2 px-4 py-3 text-[11.5px] leading-[1.9] text-muted">{article.criteriaNote}</p>
      </header>

      {articleThumb(article) && (
        <figure className="mt-8">
          <div className="relative aspect-[5/3] w-full overflow-hidden border border-line bg-soft">
            <CoverImg src={articleThumb(article)!} />
          </div>
        </figure>
      )}

      <Toc items={entries.map((e) => ({
        id: `item${e.i + 1}`, no: String(e.i + 1).padStart(2, "0"), label: e.headline,
      }))} />

      {/* ── 10本 ── */}
      <div className="mt-4">
        {entries.map((e) => {
          const c = e.c!;
          const results = (c.results ?? []).slice(0, 2);
          return (
            <section key={e.caseId} id={`item${e.i + 1}`} className="mt-12 scroll-mt-20">
              <h2 className="flex items-baseline gap-4 border-t-2 border-ink pt-5">
                <span className="num shrink-0 text-[22px] leading-none text-muted">{String(e.i + 1).padStart(2, "0")}</span>
                <span className="font-display text-[20px] leading-[1.5] text-ink">{e.headline}</span>
              </h2>
              <p className="mt-2.5 ml-10 text-[12px] text-muted">
                {c.customer.name || "導入企業（非公開）"} ・ {industryLabel(c.customer.industry)}
                {c.customer.size && ` ・ ${c.customer.size}`}
              </p>
              <p className="mt-3.5 ml-10 text-[13.5px] leading-[2.1] text-body">{e.body}</p>
              {results.length > 0 && (
                <div className="mt-4 ml-10 flex flex-wrap gap-x-8 gap-y-3 border-y border-line py-3.5">
                  {results.map((r, j) => {
                    const st = parseStat(r.value);
                    return (
                      <div key={j} className="min-w-0">
                        <div className="label">{r.metric}</div>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="num max-w-[260px] truncate text-[19px] leading-none text-accent" title={r.value}>{st.head}</span>
                          {st.verb && <span className="text-[11.5px] font-bold text-accent/70">{st.verb}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-3.5 ml-10 text-[12.5px]">
                <Link href={`/cases/${c.id}`}
                  className="border-b border-ink pb-0.5 font-bold text-ink no-underline hover:border-brand hover:text-brand">
                  この事例の詳細を読む →
                </Link>
              </p>
            </section>
          );
        })}
      </div>

      {/* ── まとめ ── */}
      <section className="mt-14 border-t-2 border-ink pt-6">
        <h2 className="font-display text-[20px] leading-snug text-ink">{article.outroTitle}</h2>
        <p className="mt-4 text-[13.5px] leading-[2.1] text-body">{article.outro}</p>
        {(article.relatedSlugs ?? []).length > 0 && (
          <div className="mt-7">
            <p className="label mb-2.5">あわせて読む</p>
            <ul className="space-y-1.5">
              {(article.relatedSlugs ?? []).map((s) => {
                const a = getArticle(s);
                if (!a) return null;
                return (
                  <li key={s}>
                    <Link href={`/articles/${a.slug}`}
                      className="text-[13px] leading-relaxed text-body no-underline hover:text-ink">
                      <span className="num mr-2 text-[11px] text-muted">#{String(a.no).padStart(3, "0")}</span>
                      <span className="border-b border-line pb-0.5">{a.title.join("")}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <FeaturedServices article={article} />

      {/* ── ポリシー表記 ── */}
      <footer className="mt-14 border-t border-line pt-5">
        <p className="text-[11px] leading-[1.9] text-muted">
          {article.sponsored
            ? <>本記事はタイアップ広告です。編集ポリシー：掲載の数字はすべて各事例の公開情報に基づきます。
              本記事は順位ではなく並列の「選」であり、選定は冒頭の基準による編集部の判断です。製品の優劣や市場の代表性を示すものではありません。</>
            : <>本記事は編集記事です（広告ではありません）。
              掲載の数字はすべて各事例の公開情報に基づきます。本記事は順位ではなく並列の「選」であり、
              選定は冒頭の基準による編集部の判断です。製品の優劣や市場の代表性を示すものではありません。</>}
        </p>
        <p className="mt-4 text-[12px]">
          <Link href="/contact" className="border-b border-line pb-0.5 text-ink no-underline hover:border-ink">
            自社製品の事例で「{article.series}」を制作したい方はこちら →
          </Link>
        </p>
      </footer>
    </article>
  );
}
