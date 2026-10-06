import Link from "next/link";
import { getCase } from "../../lib/cases";
import { getArticle, articleThumb } from "../../lib/articles";
import { industryLabel } from "../../lib/taxonomy";
import { parseStat } from "../../lib/stat";
import CoverImg from "../CoverImg";
import VendorLogo from "../VendorLogo";
import { vendorLogo } from "../../lib/vendors";
import type { SenArticle } from "../../lib/articles";
import Toc from "./Toc";
import FeaturedServices from "./FeaturedServices";
import SuggestForm from "../SuggestForm";
import { SUGGEST_ENABLED } from "../../lib/flags";

/* 「選」テンプレート（テーマ別の事例10選・3選）。順位ではなく並列の選として組む。
   3選では任意の compare（比べる表）を items の後に置ける。
   各項目は〈書き下ろしの見出し＋読みどころ〉＋〈事例データから自動で出すカルテと成果数字〉。
   選定基準と範囲は criteriaNote で冒頭に明示する。 */

export default function Sen({ article }: { article: SenArticle }) {
  const entries = article.items
    .map((it, i) => ({ ...it, i, c: getCase(it.caseId) }))
    .filter((e) => e.c);
  const compare = article.compare && article.compare.rows.length > 0 ? article.compare : undefined;

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* ── 題字 ── */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display border-b-2 border-ink pb-1 text-[15px] tracking-[.24em] text-ink">{article.series}</span>
          <span className="num text-[13px] text-muted">#{String(article.no).padStart(3, "0")}</span>
        </div>
        <div className="flex items-baseline gap-3">
          {article.sponsored && (
            <span className="border border-line px-2 py-0.5 text-[10px] font-bold tracking-widest text-muted">Sponsored</span>
          )}
          <span className="num text-[11px] text-muted">{article.publishedAt.replace(/-/g, ".")}</span>
        </div>
      </div>

      {/* ── 扉（サムネイルは記事トップに置く） ── */}
      {articleThumb(article) && (
        <figure className="mt-6">
          <div className="relative aspect-[5/3] w-full overflow-hidden border border-line bg-soft">
            <CoverImg src={articleThumb(article)!} />
          </div>
        </figure>
      )}

      <header className="mt-6">
        <h1 className="font-display mt-5 text-[27px] leading-[1.45] text-ink sm:text-[34px]">
          {article.title.map((line, i) => (
            <span key={i}>{line}{i < article.title.length - 1 && <br />}</span>
          ))}
        </h1>
        <p className="mt-6 text-[14px] leading-[2.1] text-body">{article.lead}</p>
        <p className="mt-5 border border-line2 px-4 py-3 text-[11.5px] leading-[1.9] text-muted">{article.criteriaNote}</p>
      </header>

      {/* 一括問い合わせへの早い導線（詳細は記事末尾の一覧から個別選択も可能） */}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link href={`/inquiry?a=${encodeURIComponent(article.slug)}`}
          className="border border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
          この記事のサービスすべてに問い合わせる
        </Link>
        <p className="text-[11px] leading-relaxed text-muted">
          登場サービスの提供企業へ、編集部がまとめてお取り次ぎします（次の画面で選択を外せます）。
        </p>
      </div>

      <Toc items={[
        ...entries.map((e) => ({
          id: `item${e.i + 1}`, no: String(e.i + 1).padStart(2, "0"), label: e.headline,
        })),
        ...(compare ? [{ id: "compare", no: "比", label: compare.title ?? `${entries.length}社を比べる` }] : []),
      ]} />

      {/* ── 10本（3選なら3本） ── */}
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
              {/* 事例への導線＝その事例の画像（無ければ提供元ロゴ）つきのカード */}
              <Link href={`/cases/${c.id}`}
                className="row group mt-4 ml-10 flex items-center gap-4 border border-line2 p-2.5 no-underline sm:p-3">
                <span className="relative block h-20 w-32 shrink-0 overflow-hidden rounded-[3px] border border-line2 bg-soft">
                  {c.image
                    ? <CoverImg src={c.image} />
                    : (vendorLogo(c.vendor) && <VendorLogo src={vendorLogo(c.vendor)!} size={34} />)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] text-muted">{c.title}</span>
                  <span className="mt-1.5 block text-[13px] font-bold text-ink group-hover:text-brand">
                    この事例の詳細を読む →
                  </span>
                </span>
              </Link>
            </section>
          );
        })}
      </div>

      {/* ── 比べる（任意。3選で、読者が自社の位置を判定するための表） ── */}
      {compare && (
        <section id="compare" className="mt-14 scroll-mt-20 border-t-2 border-ink pt-6">
          <h2 className="font-display text-[20px] leading-snug text-ink">{compare.title ?? `${entries.length}社を比べる`}</h2>
          {compare.intro && <p className="mt-4 text-[13.5px] leading-[2.1] text-body">{compare.intro}</p>}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="label py-2.5 pr-3 font-normal"> </th>
                  {entries.map((e) => (
                    <th key={e.caseId} className="py-2.5 pr-3 align-bottom">
                      <a href={`#item${e.i + 1}`} className="no-underline">
                        <span className="num block text-[11px] text-muted">{String(e.i + 1).padStart(2, "0")}</span>
                        <span className="label mt-1 block normal-case tracking-normal text-ink">{e.c!.customer.name || "導入企業（非公開）"}</span>
                      </a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compare.rows.map((row, i) => (
                  <tr key={i} className="border-b border-line2 align-top">
                    <th className="w-28 py-3.5 pr-3 text-[12px] font-bold leading-relaxed text-ink2">{row.label}</th>
                    {entries.map((e, j) => (
                      <td key={e.caseId} className="py-3.5 pr-3 text-[12.5px] leading-[1.9] text-body">{row.values[j] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {compare.fit && (
            <div className="mt-6 border border-line2 px-4 py-3.5">
              <p className="label mb-2">自社に近いのは</p>
              <p className="text-[13.5px] leading-[2.1] text-body">{compare.fit}</p>
            </div>
          )}
          {compare.note && <p className="mt-5 text-[11.5px] leading-[1.9] text-muted">{compare.note}</p>}
        </section>
      )}

      {/* ── まとめ ── */}
      <section className="mt-14 border-t-2 border-ink pt-6">
        <h2 className="font-display text-[20px] leading-snug text-ink">{article.outroTitle}</h2>
        <p className="mt-4 text-[13.5px] leading-[2.1] text-body">{article.outro}</p>
        {(article.relatedSlugs ?? []).length > 0 && (
          <div className="mt-9 border-t border-line pt-6">
            <p className="label mb-4 flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />あわせて読む</p>
            <div className="grid gap-5 sm:grid-cols-2">
              {(article.relatedSlugs ?? []).map((s) => {
                const a = getArticle(s);
                if (!a) return null;
                return (
                  <Link key={s} href={`/articles/${a.slug}`}
                    className="row group block border border-line2 p-3 no-underline transition hover:border-ink">
                    <div className="relative mb-3 aspect-[5/3] w-full overflow-hidden rounded-[3px] border border-line2 bg-soft">
                      {articleThumb(a)
                        ? <CoverImg src={articleThumb(a)!} />
                        : <span className="num absolute inset-0 grid place-items-center text-[20px] text-muted">#{String(a.no).padStart(3, "0")}</span>}
                    </div>
                    <span className="num text-[11px] text-muted">#{String(a.no).padStart(3, "0")}</span>
                    <span className="font-display mt-1 block text-[15px] leading-[1.55] text-ink group-hover:text-brand">
                      {a.title.join("")}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 読み終わりの読者に、自社ごと化してもらう仕掛け（メール獲得を兼ねる） */}
      {SUGGEST_ENABLED && (
        <div className="mt-12">
          <SuggestForm source={`article:${article.slug}`} />
        </div>
      )}

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
