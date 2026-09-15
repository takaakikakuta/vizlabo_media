import Link from "next/link";
import { allCases, getCase } from "../../lib/cases";
import { industryLabel, productLabel } from "../../lib/taxonomy";
import CoverImg from "../CoverImg";
import type { ChizuArticle } from "../../lib/articles";
import { articleThumb } from "../../lib/articles";
import Toc from "./Toc";
import FeaturedServices from "./FeaturedServices";

/* 「課題の攻略地図」テンプレート。1つの悩みタグを対象に、事例群から
   〈悩みの輪郭 → 手の入れ方の地図（ルート＋代表事例） → 自社ではどこから調べるか〉で書く。
   ルートは製品カテゴリではなく「業務のどこを変える道か」で分ける（編集部の分類＝書き下ろし）。
   該当件数・業種数・カテゴリ内訳は当サイト集計の参考情報として範囲を明示して出す。 */

export default function Chizu({ article }: { article: ChizuArticle }) {
  const pool = allCases().filter((c) => (c.tags ?? []).includes(article.axisTag));
  const industries = new Set(pool.map((c) => c.customer.industry)).size;

  const dist = new Map<string, number>();
  for (const c of pool) dist.set(c.productCategory, (dist.get(c.productCategory) ?? 0) + 1);
  const distTop = [...dist.entries()]
    .sort((a, b) =>
      Number(a[0] === "other-product") - Number(b[0] === "other-product") || b[1] - a[1])
    .slice(0, 6);

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
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted">
          <Link href={`/tag/${encodeURIComponent(article.axisTag)}`}
            className="border-b border-line font-bold text-ink no-underline hover:border-ink">#{article.axisTag}</Link>
          <span className="text-line">|</span>
          <span>当サイト掲載 <span className="num text-ink2">{pool.length}</span>件 ・ <span className="num text-ink2">{industries}</span>業種</span>
        </div>
        <h1 className="font-display mt-5 text-[27px] leading-[1.45] text-ink sm:text-[34px]">
          {article.title.map((line, i) => (
            <span key={i}>{line}{i < article.title.length - 1 && <br />}</span>
          ))}
        </h1>
        <p className="mt-6 text-[14px] leading-[2.1] text-body">{article.lead}</p>
      </header>

      {articleThumb(article) && (
        <figure className="mt-8">
          <div className="relative aspect-[5/3] w-full overflow-hidden border border-line bg-soft">
            <CoverImg src={articleThumb(article)!} />
          </div>
        </figure>
      )}

      <Toc items={[
        { id: "sec1", no: "一", label: "この悩みの輪郭" },
        { id: "sec2", no: "二", label: `手の入れ方の地図` },
        { id: "sec3", no: "三", label: "自社ではどこから調べるか" },
      ]} />

      {/* ── 一 輪郭 ── */}
      <Sec id="sec1" no="一" title="この悩みの輪郭">
        <p className="text-[14px] leading-[2.1] text-body">{article.scopeNote}</p>
      </Sec>

      {/* ── 二 地図 ── */}
      <Sec id="sec2" no="二" title={`手の入れ方の地図`}>
        <div className="space-y-10">
          {article.routes.map((r, i) => (
            <div key={i}>
              <h3 className="flex items-baseline gap-3 border-b border-line pb-2.5">
                <span className="num shrink-0 text-[13px] text-muted">ルート{i + 1}</span>
                <span className="font-display text-[17.5px] leading-snug text-ink">{r.label}</span>
              </h3>
              <p className="mt-3 text-[13.5px] leading-[2.1] text-body">{r.body}</p>
              <div className="mt-3.5 border-l border-line pl-4">
                <p className="label mb-2">代表事例</p>
                <ul className="space-y-2">
                  {r.caseIds.map((id) => {
                    const c = getCase(id);
                    if (!c) return null;
                    const top = c.results?.[0]?.value;
                    return (
                      <li key={id}>
                        <Link href={`/cases/${c.id}`}
                          className="group inline-block text-[12.5px] leading-relaxed text-body no-underline">
                          <span className="border-b border-line pb-0.5 group-hover:border-ink group-hover:text-ink">
                            {c.customer.name || c.title}
                          </span>
                          <span className="ml-2 text-[11px] text-muted">{industryLabel(c.customer.industry)}</span>
                          {top && <span className="num ml-2 text-[11.5px] text-ink2">{top}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
        {article.routesNote && (
          <p className="mt-8 text-[13px] leading-[1.95] text-muted">{article.routesNote}</p>
        )}
        <div className="mt-6 border border-line2 px-4 py-3.5">
          <p className="text-[11px] leading-relaxed text-muted">
            参考：#{article.axisTag} が付く当サイト掲載事例{pool.length}件の、解き方カテゴリの内訳。
            掲載データの構成であり、市場での分布や各ルートの優劣を示すものではない。
          </p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {distTop.map(([cat, n]) => (
              <span key={cat} className="text-[11.5px] text-body">
                {productLabel(cat)}<span className="num ml-1 text-ink2">{n}</span>
              </span>
            ))}
          </div>
        </div>
      </Sec>

      {/* ── 三 どこから調べるか ── */}
      <Sec id="sec3" no="三" title="自社ではどこから調べるか">
        <div className="space-y-6">
          {article.startPoints.map((s, i) => (
            <div key={i} className="flex items-baseline gap-3.5">
              <span className="num shrink-0 text-[13px] text-muted">{i + 1}.</span>
              <div>
                <p className="font-display text-[15.5px] text-ink">{s.label}</p>
                <p className="mt-1.5 text-[13.5px] leading-[2.05] text-body">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-9 border-l-2 border-ink pl-5 text-[14px] leading-[2.1] text-body">{article.closing}</p>
        <div className="mt-8">
          <Link href={`/tag/${encodeURIComponent(article.axisTag)}`}
            className="inline-block border border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            #{article.axisTag} の事例{pool.length}件を見る
          </Link>
        </div>
      </Sec>

      <FeaturedServices article={article} />

      {/* ── ポリシー表記 ── */}
      <footer className="mt-14 border-t border-line pt-5">
        <p className="text-[11px] leading-[1.9] text-muted">
          {article.sponsored
            ? <>本記事はタイアップ広告です。編集ポリシー：引用・件数はすべて公開事例と当サイトの掲載データに基づきます。
              ルートの分類は編集部の整理であり、市場の全選択肢を網羅するものではありません。</>
            : <>本記事は編集記事です（広告ではありません）。
              引用・件数はすべて公開事例と当サイトの掲載データに基づきます。
              ルートの分類は編集部の整理であり、市場の全選択肢を網羅するものではありません。</>}
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

function Sec({ no, title, id, children }: { no: string; title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-20">
      <h2 className="flex items-baseline gap-3.5 border-b-2 border-ink pb-3.5">
        <span className="font-display text-[15px] text-muted">{no}</span>
        <span className="font-display text-[20px] leading-snug text-ink">{title}</span>
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
