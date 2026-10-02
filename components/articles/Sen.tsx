import Link from "next/link";
import { getCase } from "../../lib/cases";
import { getArticle, articleThumb, senIsShort, senCountLabel } from "../../lib/articles";
import { industryLabel, productLabel } from "../../lib/taxonomy";
import { parseStat } from "../../lib/stat";
import CoverImg from "../CoverImg";
import VendorLogo from "../VendorLogo";
import { vendorLogo } from "../../lib/vendors";
import { vendorLabel } from "../Adoption";
import type { SenArticle } from "../../lib/articles";
import type { CaseStudy } from "../../lib/types";
import Toc from "./Toc";
import FeaturedServices from "./FeaturedServices";
import SuggestForm from "../SuggestForm";
import { SUGGEST_ENABLED } from "../../lib/flags";

/* 「選」テンプレート（テーマ別の事例10選／3選）。順位ではなく並列の選として組む。
   各項目は〈書き下ろしの見出し＋読みどころ〉＋〈事例データから自動で出すカルテと成果数字〉。
   選定基準と範囲は criteriaNote で冒頭に明示する。

   本数で誌面を変える（lib/articles.ts の senIsShort）:
   - 10選（一覧レイアウト）… 01〜10 の通し番号、目次、成果チップ2つ。数で見せる。
   - 3選（深掘りレイアウト）… 一・二・三の漢数字、顔ぶれカード、事例画像、カルテ4項目、成果チップ4つ。
     1本ずつ読ませる。本文（body）も長めに書く前提。 */

const KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

type Entry = SenArticle["items"][number] & { i: number; c: CaseStudy };

export default function Sen({ article }: { article: SenArticle }) {
  const entries = article.items
    .map((it, i) => ({ ...it, i, c: getCase(it.caseId) }))
    .filter((e): e is Entry => Boolean(e.c));
  const short = senIsShort(article);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* ── 題字 ── */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display border-b-2 border-ink pb-1 text-[15px] tracking-[.24em] text-ink">{article.series}</span>
          <span className="num text-[13px] text-muted">#{String(article.no).padStart(3, "0")}</span>
          <span className={`border px-2 py-0.5 text-[10px] font-bold tracking-widest ${short ? "border-ink text-ink" : "border-line text-muted"}`}>
            {senCountLabel(article)}
          </span>
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

      {short ? <Lineup entries={entries} /> : (
        <Toc items={entries.map((e) => ({
          id: `item${e.i + 1}`, no: String(e.i + 1).padStart(2, "0"), label: e.headline,
        }))} />
      )}

      {/* ── 本体（10本 or 3本） ── */}
      <div className="mt-4">
        {entries.map((e) => short ? <DeepItem key={e.caseId} e={e} /> : <ListItem key={e.caseId} e={e} />)}
      </div>

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

/* ── 事例の画像（無ければ提供元ロゴ）。顔ぶれカードと事例カードで共用 ── */
function CaseVisual({ c, logoSize = 34 }: { c: CaseStudy; logoSize?: number }) {
  if (c.image) return <CoverImg src={c.image} />;
  const logo = vendorLogo(c.vendor);
  return logo ? <VendorLogo src={logo} size={logoSize} /> : null;
}

/* ── 事例への導線カード ── */
function CaseLink({ c, className = "" }: { c: CaseStudy; className?: string }) {
  return (
    <Link href={`/cases/${c.id}`}
      className={`row group flex items-center gap-4 border border-line2 p-2.5 no-underline sm:p-3 ${className}`}>
      <span className="relative block h-20 w-32 shrink-0 overflow-hidden rounded-[3px] border border-line2 bg-soft">
        <CaseVisual c={c} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] text-muted">{c.title}</span>
        <span className="mt-1.5 block text-[13px] font-bold text-ink group-hover:text-brand">
          この事例の詳細を読む →
        </span>
      </span>
    </Link>
  );
}

/* ── 成果チップ。10選は2つ・小さめ、3選は4つ・大きめ ── */
function Results({ c, max, big = false }: { c: CaseStudy; max: number; big?: boolean }) {
  const results = (c.results ?? []).slice(0, max);
  if (results.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-x-8 gap-y-3 border-y border-line ${big ? "py-4" : "py-3.5"}`}>
      {results.map((r, j) => {
        const st = parseStat(r.value);
        return (
          <div key={j} className="min-w-0">
            <div className="label">{r.metric}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`num truncate leading-none text-accent ${big ? "max-w-[360px] text-[24px]" : "max-w-[260px] text-[19px]"}`} title={r.value}>{st.head}</span>
              {st.verb && <span className="text-[11.5px] font-bold text-accent/70">{st.verb}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══ 10選：一覧レイアウト（01〜10・目次・成果2つ） ══ */
function ListItem({ e }: { e: Entry }) {
  const c = e.c;
  return (
    <section id={`item${e.i + 1}`} className="mt-12 scroll-mt-20">
      <h2 className="flex items-baseline gap-4 border-t-2 border-ink pt-5">
        <span className="num shrink-0 text-[22px] leading-none text-muted">{String(e.i + 1).padStart(2, "0")}</span>
        <span className="font-display text-[20px] leading-[1.5] text-ink">{e.headline}</span>
      </h2>
      <p className="mt-2.5 ml-10 text-[12px] text-muted">
        {c.customer.name || "導入企業（非公開）"} ・ {industryLabel(c.customer.industry)}
        {c.customer.size && ` ・ ${c.customer.size}`}
      </p>
      <p className="mt-3.5 ml-10 text-[13.5px] leading-[2.1] text-body">{e.body}</p>
      <div className="mt-4 ml-10"><Results c={c} max={2} /></div>
      <CaseLink c={c} className="mt-4 ml-10" />
    </section>
  );
}

/* ══ 3選：顔ぶれカード（目次の代わり。3本なら画像で一望できる） ══ */
function Lineup({ entries }: { entries: Entry[] }) {
  return (
    <nav aria-label="目次" className="mt-9 border-y border-line py-5">
      <p className="label mb-4 flex items-center gap-2.5">
        <span className="h-px w-5 bg-ink" />この{entries.length}本
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {entries.map((e) => (
          <Link key={e.caseId} href={`#item${e.i + 1}`}
            className="row group block border border-line2 p-2.5 no-underline transition hover:border-ink">
            <span className="relative block aspect-[5/3] w-full overflow-hidden rounded-[3px] border border-line2 bg-soft">
              <CaseVisual c={e.c} logoSize={40} />
            </span>
            <span className="font-display mt-3 block text-[12px] text-muted">{KANJI[e.i] ?? e.i + 1}</span>
            <span className="font-display mt-1 block text-[14px] leading-[1.55] text-ink group-hover:text-brand">{e.headline}</span>
            <span className="mt-2 block truncate text-[11px] text-muted">
              {e.c.customer.name || "導入企業（非公開）"} ・ {industryLabel(e.c.customer.industry)}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

/* ══ 3選：深掘りレイアウト（漢数字・事例画像・カルテ4項目・成果4つ） ══ */
function DeepItem({ e }: { e: Entry }) {
  const c = e.c;
  const product = (c.product || vendorLabel(c.vendor)).split(/[（(]/)[0].trim();
  const karte: { k: string; v: string }[] = [
    { k: "導入企業", v: c.customer.name || "非公開" },
    { k: "業種", v: industryLabel(c.customer.industry) },
    { k: "規模", v: c.customer.size || "非公開" },
    { k: "導入したもの", v: `${product}（${productLabel(c.productCategory)}）` },
  ];
  return (
    <section id={`item${e.i + 1}`} className="mt-16 scroll-mt-20 border-t-2 border-ink pt-6">
      <p className="font-display text-[17px] text-muted">{KANJI[e.i] ?? e.i + 1}</p>
      <h2 className="font-display mt-2 text-[23px] leading-[1.5] text-ink sm:text-[26px]">{e.headline}</h2>

      {c.image && (
        <figure className="mt-6">
          <div className="relative aspect-[5/3] w-full overflow-hidden border border-line bg-soft">
            <CoverImg src={c.image} />
          </div>
        </figure>
      )}

      {/* カルテ：10選では1行に畳む情報を、3選では項目ごとに置く */}
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-4 sm:grid-cols-4">
        {karte.map((row) => (
          <div key={row.k} className="min-w-0">
            <dt className="label">{row.k}</dt>
            <dd className="mt-1 text-[12.5px] leading-snug text-ink">{row.v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 text-[14.5px] leading-[2.2] text-body">{e.body}</p>
      <div className="mt-6"><Results c={c} max={4} big /></div>
      <CaseLink c={c} className="mt-5" />
    </section>
  );
}
