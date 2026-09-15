import Link from "next/link";
import { getCase } from "../../lib/cases";
import { industryLabel } from "../../lib/taxonomy";
import CoverImg from "../CoverImg";
import type { ButaiuraArticle } from "../../lib/articles";
import { articleThumb } from "../../lib/articles";
import Toc from "./Toc";
import FeaturedServices from "./FeaturedServices";

/* 「導入の舞台裏」テンプレート。事例群の導入・定着の記述を横断し、
   〈ぶつかった壁 → 各社が取った対応 → 対応が違った条件 → 自社で準備すること〉で書く。
   対応は「必勝法」ではなく、実際に採られた選択肢として示す（ガイド参照）。 */

export default function Butaiura({ article }: { article: ButaiuraArticle }) {
  const caseRow = (id: string) => {
    const c = getCase(id);
    if (!c) return null;
    return (
      <li key={id}>
        <Link href={`/cases/${c.id}`}
          className="group inline-block text-[12.5px] leading-relaxed text-body no-underline">
          <span className="border-b border-line pb-0.5 group-hover:border-ink group-hover:text-ink">
            {c.customer.name || c.title}
          </span>
          <span className="ml-2 text-[11px] text-muted">{industryLabel(c.customer.industry)}</span>
        </Link>
      </li>
    );
  };

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
        <p className="mt-5 border border-line2 px-4 py-3 text-[11.5px] leading-[1.9] text-muted">{article.scopeNote}</p>
      </header>

      {articleThumb(article) && (
        <figure className="mt-8">
          <div className="relative aspect-[5/3] w-full overflow-hidden border border-line bg-soft">
            <CoverImg src={articleThumb(article)!} />
          </div>
        </figure>
      )}

      <Toc items={[
        { id: "sec1", no: "一", label: "導入時にぶつかった壁" },
        { id: "sec2", no: "二", label: "各社が取った対応" },
        { id: "sec3", no: "三", label: "対応が違った条件" },
        { id: "sec4", no: "四", label: "自社で準備すること" },
      ]} />

      {/* ── 一 壁 ── */}
      <Sec id="sec1" no="一" title="導入時にぶつかった壁">
        <div className="space-y-7">
          {article.walls.map((w, i) => (
            <div key={i}>
              <h3 className="flex items-baseline gap-3">
                <span className="num shrink-0 text-[13px] text-muted">壁{i + 1}</span>
                <span className="font-display text-[16.5px] leading-snug text-ink">{w.label}</span>
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-[2.1] text-body">{w.body}</p>
              {(w.caseIds ?? []).length > 0 && (
                <ul className="mt-2.5 space-y-1.5 border-l border-line pl-4">
                  {(w.caseIds ?? []).map(caseRow)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Sec>

      {/* ── 二 対応 ── */}
      <Sec id="sec2" no="二" title="各社が取った対応">
        <p className="border-l border-line pl-4 text-[11.5px] leading-relaxed text-muted">
          ※以下は「成功企業に共通する必勝法」ではなく、掲載事例で実際に採られた対応の選択肢です。
          各社が他の対応と比較検討したかどうかは、多くの場合、公開事例には書かれていません。
        </p>
        <div className="mt-6 space-y-9">
          {article.approaches.map((x, i) => (
            <div key={i}>
              <h3 className="flex items-baseline gap-3 border-b border-line pb-2.5">
                <span className="num shrink-0 text-[13px] text-muted">対応{i + 1}</span>
                <span className="font-display text-[17px] leading-snug text-ink">{x.label}</span>
              </h3>
              <p className="mt-3 text-[13.5px] leading-[2.1] text-body">{x.body}</p>
              <div className="mt-3 border-l border-line pl-4">
                <p className="label mb-2">この対応が読める事例</p>
                <ul className="space-y-1.5">
                  {x.caseIds.map(caseRow)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Sec>

      {/* ── 三 条件 ── */}
      <Sec id="sec3" no="三" title="対応が違った条件">
        <div className="border-t border-line">
          {article.conditions.map((x, i) => (
            <div key={i} className="border-b border-line2 px-2 py-4">
              <p className="font-display text-[15px] text-ink">{x.label}</p>
              <p className="mt-1.5 text-[13px] leading-[2] text-body">{x.body}</p>
            </div>
          ))}
        </div>
        {article.conditionsNote && (
          <p className="mt-5 text-[13px] leading-[1.95] text-muted">{article.conditionsNote}</p>
        )}
      </Sec>

      {/* ── 四 備え ── */}
      <Sec id="sec4" no="四" title="自社で準備すること">
        <div className="space-y-6">
          {article.prep.map((s, i) => (
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
      </Sec>

      <FeaturedServices article={article} />

      {/* ── ポリシー表記 ── */}
      <footer className="mt-14 border-t border-line pt-5">
        <p className="text-[11px] leading-[1.9] text-muted">
          {article.sponsored
            ? <>本記事はタイアップ広告です。編集ポリシー：引用・件数はすべて公開事例と当サイトの掲載データに基づきます。
              「壁」「対応」「条件」の整理は編集部の読みであり、成功の保証や必勝法ではありません。</>
            : <>本記事は編集記事です（広告ではありません）。
              引用・件数はすべて公開事例と当サイトの掲載データに基づきます。
              「壁」「対応」「条件」の整理は編集部の読みであり、成功の保証や必勝法ではありません。</>}
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
