import Link from "next/link";
import { notFound } from "next/navigation";
import { getCase } from "../../lib/cases";
import { industryLabel } from "../../lib/taxonomy";
import CoverImg from "../CoverImg";
import type { EkkyouArticle, EkkyouScene } from "../../lib/articles";
import { articleThumb } from "../../lib/articles";
import Toc from "./Toc";
import FeaturedServices from "./FeaturedServices";

/* 「業界を越える事例」テンプレート。一見遠い2つの現場を並べ、
   〈2つの現場 → 共通する仕事の構造 → 借りられる工夫 → 持ち込めない条件〉で書く。
   wakaremichi型が違いから分岐を読むのに対し、こちらは共通点から応用先を広げる。
   課題文の引用は事例データからビルド時に描画する（原文のまま）。 */

export default function Ekkyou({ article }: { article: EkkyouArticle }) {
  const a = getCase(article.caseA.id);
  const b = getCase(article.caseB.id);
  if (!a || !b) notFound();

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
          <span className="font-bold text-ink2">{industryLabel(a.customer.industry)}</span>
          <span className="text-line">×</span>
          <span className="font-bold text-ink2">{industryLabel(b.customer.industry)}</span>
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
        { id: "sec1", no: "一", label: "一見遠い、2つの現場" },
        { id: "sec2", no: "二", label: "共通する仕事の構造" },
        { id: "sec3", no: "三", label: "異業種から借りられる工夫" },
        { id: "sec4", no: "四", label: "そのまま持ち込めない条件" },
      ]} />

      {/* ── 一 2つの現場 ── */}
      <Sec id="sec1" no="一" title="一見遠い、2つの現場">
        <div className="grid gap-5 sm:grid-cols-2">
          <Scene scene={article.caseA} c={a} />
          <Scene scene={article.caseB} c={b} />
        </div>
      </Sec>

      {/* ── 二 共通する構造 ── */}
      <Sec id="sec2" no="二" title="共通する仕事の構造">
        <p className="text-[14px] leading-[2.1] text-body">{article.structureIntro}</p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="label py-2.5 pr-3 font-normal"> </th>
                <th className="label py-2.5 pr-3 font-normal">{article.caseA.sceneLabel}</th>
                <th className="label py-2.5 font-normal">{article.caseB.sceneLabel}</th>
              </tr>
            </thead>
            <tbody>
              {article.structure.map((row, i) => (
                <tr key={i} className="border-b border-line2 align-top">
                  <th className="w-28 py-3.5 pr-3 text-[12px] font-bold leading-relaxed text-ink2">{row.label}</th>
                  <td className="py-3.5 pr-3 text-[12.5px] leading-[1.9] text-body">{row.a}</td>
                  <td className="py-3.5 text-[12.5px] leading-[1.9] text-body">{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {article.structureNote && (
          <p className="mt-5 text-[13px] leading-[1.95] text-muted">{article.structureNote}</p>
        )}
      </Sec>

      {/* ── 三 借りられる工夫 ── */}
      <Sec id="sec3" no="三" title="異業種から借りられる工夫">
        <p className="border-l border-line pl-4 text-[11.5px] leading-relaxed text-muted">
          ※「借りられる」は、事例本文で確認できる取り組みを、別の業種の状況に置いてみる編集部の読みです。
          その業種で同じ効果が出ることを保証するものではありません。
        </p>
        <div className="mt-6 space-y-7">
          {article.borrows.map((x, i) => (
            <div key={i}>
              <h3 className="flex items-baseline gap-3">
                <span className="num shrink-0 text-[13px] text-muted">工夫{i + 1}</span>
                <span className="font-display text-[16.5px] leading-snug text-ink">{x.title}</span>
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-[2.1] text-body">{x.body}</p>
            </div>
          ))}
        </div>
      </Sec>

      {/* ── 四 持ち込めない条件 ── */}
      <Sec id="sec4" no="四" title="そのまま持ち込めない条件">
        <div className="border-t border-line">
          {article.limits.map((x, i) => (
            <div key={i} className="border-b border-line2 px-2 py-4">
              <p className="font-display text-[15px] text-ink">{x.label}</p>
              <p className="mt-1.5 text-[13px] leading-[2] text-body">{x.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 border-l-2 border-ink pl-5 text-[14px] leading-[2.1] text-body">{article.closing}</p>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          {[{ s: article.caseA, c: a }, { s: article.caseB, c: b }].map(({ s, c }) => (
            <Link key={c.id} href={`/cases/${c.id}`}
              className="border-b border-ink pb-0.5 text-[13.5px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
              {s.sceneLabel}の事例記事を読む →
            </Link>
          ))}
        </div>
      </Sec>

      <FeaturedServices article={article} />

      {/* ── ポリシー表記 ── */}
      <footer className="mt-14 border-t border-line pt-5">
        <p className="text-[11px] leading-[1.9] text-muted">
          {article.sponsored
            ? <>本記事はタイアップ広告です。編集ポリシー：引用はすべて公開事例に基づき、
              「構造」と「工夫」の読み解きは編集部の見立てとして本文中に明示しています。</>
            : <>本記事は編集記事です（広告ではありません）。
              引用はすべて公開事例に基づき、「構造」と「工夫」の読み解きは編集部の見立てとして本文中に明示しています。</>}
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

function Scene({ scene, c }: { scene: EkkyouScene; c: NonNullable<ReturnType<typeof getCase>> }) {
  return (
    <div className="border border-line px-5 py-4.5">
      <p className="label">{scene.sceneLabel}</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-[16px] text-ink">{c.customer.name || "導入企業（非公開）"}</span>
      </div>
      <p className="mt-1 text-[11.5px] text-muted">
        {industryLabel(c.customer.industry)}
        {c.customer.size && ` ・ ${c.customer.size}`}
      </p>
      <p className="mt-3 text-[13px] leading-[2] text-body">{scene.sceneNote}</p>
      <blockquote className="mt-3.5 border-l border-line pl-3.5 text-[12px] leading-[1.95] text-muted">
        「{c.challengeDetail}」
      </blockquote>
      <p className="mt-3 text-[11.5px]">
        <Link href={`/cases/${c.id}`} className="border-b border-line pb-0.5 text-ink no-underline hover:border-ink">
          事例記事へ →
        </Link>
      </p>
    </div>
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
