import Link from "next/link";
import { getCase, getLinkOnlyCase } from "../../lib/cases";
import { getArticle, articleThumb, articleHref } from "../../lib/articles";
import { industryLabel } from "../../lib/taxonomy";
import { parseStat } from "../../lib/stat";
import { withUtm } from "../../lib/source";
import CoverImg from "../CoverImg";
import VendorLogo from "../VendorLogo";
import { vendorLogo } from "../../lib/vendors";
import { vendorLabel } from "../Adoption";
import type { YougoArticle } from "../../lib/articles";
import Toc from "./Toc";
import FeaturedServices from "./FeaturedServices";
import SuggestForm from "../SuggestForm";
import { SUGGEST_ENABLED } from "../../lib/flags";
import LinkOnlyCard from "../LinkOnlyCard";
import VideoBadge, { PlayMark } from "../VideoBadge";
import { hasVideo } from "../../lib/video";
import { introSourceName } from "../../lib/introSources";

/* 「事例でわかる技術用語」テンプレート。「〇〇とは」で検索した人向けに、
   用語の説明（何を解決するものか。向き不向きは1〜2文）→ その用語で課題を解いた事例（一言ラベル＋1段落＋読者向けの一言）
   → 関連する用語・記事、の順に組む。説明は冒頭だけに置き、事例の後に分かれ目やまとめは置かない。
   事例の見出し（導入企業名 × サービス名）・業種・規模・成果チップ・事例リンク・出典リンクは事例データから自動で出す。
   事例が linkOnly（掲載元から取り下げ依頼）なら、企業名・規模・数字を出さず、item.linkOnly の紹介と元記事リンクだけにする。 */

function serviceName(product: string, vendor: string): string {
  return (product || vendorLabel(vendor)).split(/[（(]/)[0].trim();
}

export default function Yougo({ article }: { article: YougoArticle }) {
  const entries = article.items
    .map((it, i) => {
      const c = getCase(it.caseId);
      if (c) return { ...it, i, c, isLinkOnly: false };
      const lc = getLinkOnlyCase(it.caseId);
      if (!lc) return undefined;
      return { ...it, i, c: lc, isLinkOnly: true };
    })
    .filter((e) => e !== undefined);
  const kan = ["一", "二", "三"];

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

      {articleThumb(article) && (
        <figure className="mt-6">
          <div className="relative aspect-video w-full overflow-hidden border border-line bg-soft">
            <CoverImg src={articleThumb(article)!} />
          </div>
        </figure>
      )}

      {/* ── 扉：検索した人の疑問に最初の3行で答える ── */}
      <header className="mt-6">
        <h1 className="font-display mt-5 text-[27px] leading-[1.45] text-ink sm:text-[34px]">
          {article.title.map((line, i) => (
            <span key={i}>{line}{i < article.title.length - 1 && <br />}</span>
          ))}
        </h1>
        <p className="mt-6 text-[14px] leading-[2.1] text-body">{article.lead}</p>
      </header>

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
        { id: "teigi", no: kan[0], label: `${article.term}とは` },
        ...entries.map((e) => ({
          id: `item${e.i + 1}`, no: String(e.i + 1).padStart(2, "0"),
          label: e.isLinkOnly ? `導入企業 × ${serviceName(e.c.product, e.c.vendor)}` : `${e.c.customer.name || "導入企業（非公開）"} × ${e.service ?? serviceName(e.c.product, e.c.vendor)}`,
        })),
        { id: "related", no: kan[1], label: "関連する用語・事例セレクション" },
      ]} />

      {/* ── 一 用語とは ── */}
      <section id="teigi" className="mt-12 scroll-mt-20 border-t-2 border-ink pt-6">
        <h2 className="font-display text-[20px] leading-snug text-ink">
          <span className="num mr-3 text-[16px] text-muted">{kan[0]}</span>{article.term}とは
        </h2>
        <p className="mt-4 whitespace-pre-line text-[13.5px] leading-[2.1] text-body">{article.definition}</p>
        <p className="mt-3 text-[13.5px] leading-[2.1] text-body">{article.fitNote}</p>
      </section>

      {/* ── 事例（1段落＋読者向けの一言。詳細は事例ページに任せる） ── */}
      <div className="mt-4">
        {entries.map((e) => {
          const c = e.c;
          const no = String(e.i + 1).padStart(2, "0");
          if (e.isLinkOnly) {
            return (
              <section key={e.caseId} id={`item${e.i + 1}`} className="mt-12 scroll-mt-20">
                <h2 className="flex items-baseline gap-4 border-t-2 border-ink pt-5">
                  <span className="num shrink-0 text-[22px] leading-none text-muted">{no}</span>
                  <span className="font-display text-[20px] leading-[1.5] text-ink">導入企業 × {serviceName(c.product, c.vendor)}</span>
                </h2>
                <p className="mt-2.5 ml-10 text-[12px] text-muted">
                  <span className="mr-2.5 border border-ink px-1.5 py-0.5 text-[11px] font-bold text-ink">{e.label}</span>
                  {hasVideo(c) && <span className="mr-2.5"><VideoBadge /></span>}
                  {industryLabel(c.customer.industry)}
                </p>
                {e.linkOnly?.body && (
                  <p className="mt-3.5 ml-10 text-[13.5px] leading-[2.1] text-body">{e.linkOnly.body}</p>
                )}
                <div className="mt-4 ml-10"><LinkOnlyCard c={c} campaign="article" content={article.slug} /></div>
              </section>
            );
          }
          const results = (c.results ?? []).slice(0, 2);
          return (
            <section key={e.caseId} id={`item${e.i + 1}`} className="mt-12 scroll-mt-20">
              <h2 className="flex items-baseline gap-4 border-t-2 border-ink pt-5">
                <span className="num shrink-0 text-[22px] leading-none text-muted">{no}</span>
                <span className="font-display text-[20px] leading-[1.5] text-ink">
                  {c.customer.name || "導入企業（非公開）"} × {e.service ?? serviceName(c.product, c.vendor)}
                </span>
              </h2>
              <p className="mt-2.5 ml-10 text-[12px] text-muted">
                <span className="mr-2.5 border border-ink px-1.5 py-0.5 text-[11px] font-bold text-ink">{e.label}</span>
                {hasVideo(c) && <span className="mr-2.5"><VideoBadge /></span>}
                {industryLabel(c.customer.industry)}
                {c.customer.size && ` ・ ${c.customer.size}`}
                {introSourceName(c.vendor) ? ` ・ 出典：${introSourceName(c.vendor)}の事例紹介` : ` ・ 提供：${vendorLabel(c.vendor)}`}
              </p>
              <p className="mt-3.5 ml-10 text-[13.5px] leading-[2.1] text-body">{e.body}</p>
              <p className="mt-3 ml-10 border-l-2 border-ink pl-4 text-[13.5px] leading-[2.05] text-ink">{e.hitokoto}</p>
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
              {/* 事例ページ（要約）と出典（掲載元の元記事）への導線を両方置く */}
              <Link href={`/cases/${c.id}`}
                className="row group mt-4 ml-10 flex items-center gap-4 border border-line2 p-2.5 no-underline sm:p-3">
                <span className="relative block h-20 w-32 shrink-0 overflow-hidden rounded-[3px] border border-line2 bg-soft">
                  {c.image
                    ? <CoverImg src={c.image} />
                    : (vendorLogo(c.vendor) && <VendorLogo src={vendorLogo(c.vendor)!} size={34} />)}
                  {hasVideo(c) && <PlayMark className="bottom-1.5 left-1.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] text-muted">{c.title}</span>
                  <span className="mt-1.5 block text-[13px] font-bold text-ink group-hover:text-brand">
                    この事例の詳細を読む →
                  </span>
                </span>
              </Link>
              <p className="mt-2.5 ml-10 text-[11.5px] text-muted">
                出典：
                <a href={withUtm(c.sourceUrl, "article", article.slug)} target="_blank" rel="noopener"
                  className="break-all border-b border-line pb-0.5 text-body no-underline hover:border-ink hover:text-ink">
                  {c.sourceUrl}
                </a>
              </p>
            </section>
          );
        })}
      </div>

      {/* ── 関連する用語・事例セレクション ── */}
      <section id="related" className="mt-14 scroll-mt-20 border-t-2 border-ink pt-6">
        <h2 className="font-display text-[20px] leading-snug text-ink">
          <span className="num mr-3 text-[16px] text-muted">{kan[1]}</span>関連する用語・事例セレクション
        </h2>
        {article.relatedTerms.length > 0 && (
          <div className="mt-5">
            <p className="label mb-3">関連する用語</p>
            <div className="flex flex-wrap gap-2.5">
              {article.relatedTerms.map((t) => (
                <Link key={t.href} href={t.href}
                  className="border border-line2 px-3 py-1.5 text-[12.5px] text-ink no-underline transition hover:border-ink">
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
        )}
        {(article.relatedSlugs ?? []).length > 0 && (
          <div className="mt-7">
            <p className="label mb-4 flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />あわせて読む</p>
            <div className="grid gap-5 sm:grid-cols-2">
              {(article.relatedSlugs ?? []).map((s) => {
                const a = getArticle(s);
                if (!a) return null;
                return (
                  <Link key={s} href={articleHref(a)}
                    className="row group block border border-line2 p-3 no-underline transition hover:border-ink">
                    <div className="relative mb-3 aspect-[5/3] w-full overflow-hidden rounded-[3px] border border-line2 bg-soft">
                      {articleThumb(a)
                        ? <CoverImg src={articleThumb(a)!} />
                        : <span className="num absolute inset-0 grid place-items-center text-[20px] text-muted">#{String(a.no).padStart(3, "0")}</span>}
                    </div>
                    <span className="num text-[11px] text-muted">
                      {a.series !== article.series && <span className="mr-2">{a.series}</span>}#{String(a.no).padStart(3, "0")}
                    </span>
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

      {/* 読み終わりの読者に、自社ごと化してもらう仕掛け（AI事例サジェスト＋メルマガ登録。文面は SuggestForm と共通） */}
      {SUGGEST_ENABLED && (
        <div className="mt-12">
          <SuggestForm source={`article:${article.slug}`} />
        </div>
      )}

      <FeaturedServices article={article} />

      <footer className="mt-14 border-t border-line pt-5">
        <p className="text-[11px] leading-[1.9] text-muted">
          {article.sponsored
            ? <>本記事はタイアップ広告です。編集ポリシー：用語の説明は一般的な仕組みの範囲にとどめ、事例の数字はすべて各事例の公開情報に基づきます。
              事例の選定は冒頭の基準による編集部の判断です。製品の優劣や市場の代表性を示すものではありません。</>
            : <>本記事は編集記事です（広告ではありません）。
              用語の説明は一般的な仕組みの範囲にとどめ、事例の数字はすべて各事例の公開情報に基づきます。
              事例の選定は冒頭の基準による編集部の判断です。製品の優劣や市場の代表性を示すものではありません。</>}
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
