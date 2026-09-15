import Link from "next/link";
import { notFound } from "next/navigation";
import { allCases, getCase } from "../../lib/cases";
import { challengeLabel, industryLabel, productLabel } from "../../lib/taxonomy";
import { challengeStyle, primaryChallenge } from "../../lib/visuals";
import { vendorLabel } from "../Adoption";
import CoverImg from "../CoverImg";
import type { GenbaArticle } from "../../lib/articles";
import { articleThumb } from "../../lib/articles";
import Toc from "./Toc";
import FeaturedServices from "./FeaturedServices";

/* 「導入の現場から」テンプレート。1社の事例を軸に、同じ課題を扱う事例群と照らしながら
   〈いくつかの道 → 軸事例 → 特徴の読み → 参考になる条件 → 自社と照らす〉で書く。
   製品の適合診断はしない。自動集計（分布・関連事例）は範囲を明示した参考情報として出す。
   article.sponsored が true のときだけタイアップ扱い＝PR表記・Sponsoredバッジ・広告ポリシーを出す。 */

export default function Genba({ article }: { article: GenbaArticle }) {
  const axis = getCase(article.axisId);
  if (!axis) notFound();

  const pc = primaryChallenge(axis);
  const color = challengeStyle(pc).solid;
  const provider = axis.product || vendorLabel(axis.vendor);
  const brand = vendorLabel(axis.vendor);
  const customer = axis.customer.name || "導入企業（非公開）";

  // 参考情報：同じ悩みタグを共有する掲載事例の解き方の内訳（当サイト集計）
  const axisTags = new Set(axis.tags ?? []);
  const dist = new Map<string, number>();
  let painPool = 0;
  for (const c of allCases()) {
    if (c.id === axis.id) continue;
    if ((c.tags ?? []).some((t) => axisTags.has(t))) {
      painPool++;
      dist.set(c.productCategory, (dist.get(c.productCategory) ?? 0) + 1);
    }
  }
  const distTop = [...dist.entries()]
    .sort((a, b) =>
      Number(a[0] === "other-product") - Number(b[0] === "other-product") || b[1] - a[1])
    .slice(0, 6);

  // 追加で読める同ベンダーの事例（活用例への導線。評価の根拠には使わない）
  const vendorCases = allCases().filter((c) => c.vendor === axis.vendor && c.id !== axis.id).slice(0, 3);

  const refCase = (id: string) => getCase(id);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* ── PR表記＋題字 ── */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display border-b-2 border-ink pb-1 text-[15px] tracking-[.24em] text-ink">{article.series}</span>
          <span className="num text-[13px] text-muted">#{String(article.no).padStart(3, "0")}</span>
          {article.sponsored && <span className="text-[11px] text-muted">supported by {brand}</span>}
        </div>
        {article.sponsored && (
          <span className="border border-line px-2 py-0.5 text-[10px] font-bold tracking-widest text-muted">Sponsored</span>
        )}
      </div>

      {/* ── 扉 ── */}
      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-1.5 font-bold text-ink2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {challengeLabel(pc)}
          </span>
          <span className="text-line">|</span>
          <span>{industryLabel(axis.customer.industry)}</span>
          {axis.customer.size && <><span className="text-line">|</span><span>{axis.customer.size}</span></>}
        </div>
        <h1 className="font-display mt-5 text-[27px] leading-[1.45] text-ink sm:text-[34px]">
          {article.title.map((line, i) => (
            <span key={i}>{line}{i < article.title.length - 1 && <br />}</span>
          ))}
        </h1>
        <p className="font-display mt-3 text-[15px] text-body">{article.subtitle}</p>
        <p className="mt-6 text-[14px] leading-[2.1] text-body">{article.lead}</p>
      </header>

      {articleThumb(article) && (
        <figure className="mt-8">
          <div className="relative aspect-[5/3] w-full overflow-hidden border border-line"
            style={{ background: `${color}10` }}>
            <CoverImg src={articleThumb(article)!} />
          </div>
          {articleThumb(article) === axis.image && (
            <figcaption className="mt-2 text-[11px] text-muted">
              出典：<a href={axis.sourceUrl} target="_blank" rel="noopener noreferrer" className="no-underline hover:underline">{provider}導入事例（{customer}）</a>
            </figcaption>
          )}
        </figure>
      )}

      <Toc items={[
        { id: "sec1", no: "一", label: "同じ課題への、いくつかの道" },
        { id: "sec2", no: "二", label: "今回注目する会社" },
        { id: "sec3", no: "三", label: "この事例は、どこが特徴的か" },
        { id: "sec4", no: "四", label: "どんな会社の参考になるか" },
        { id: "sec5", no: "五", label: "自社と照らす" },
      ]} />

      {/* ── 一 同じ課題への、いくつかの道 ── */}
      <Sec id="sec1" no="一" title="同じ課題への、いくつかの道">
        <div className="space-y-7">
          {article.paths.map((p, i) => (
            <div key={i}>
              <h3 className="flex items-baseline gap-3">
                <span className="num text-[13px] text-muted">道{i + 1}</span>
                <span className="font-display text-[16.5px] text-ink">{p.label}</span>
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-[2.1] text-body">{p.body}</p>
              {(p.caseIds ?? []).length > 0 && (
                <ul className="mt-2.5 space-y-1.5 border-l border-line pl-4">
                  {(p.caseIds ?? []).map((id) => {
                    const c = refCase(id);
                    if (!c) return null;
                    return (
                      <li key={id}>
                        <Link href={`/cases/${c.id}`}
                          className="text-[12.5px] leading-relaxed text-body no-underline hover:text-ink">
                          <span className="border-b border-line pb-0.5">{c.customer.name || c.title}</span>
                          <span className="ml-2 text-[11px] text-muted">{industryLabel(c.customer.industry)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
        {article.pathsNote && (
          <p className="mt-6 text-[13px] leading-[1.95] text-muted">{article.pathsNote}</p>
        )}
        <div className="mt-6 border border-line2 px-4 py-3.5">
          <p className="text-[11px] leading-relaxed text-muted">
            参考：{customer}と悩みタグを共有する当サイト掲載事例{painPool}件の、解き方カテゴリの内訳。
            掲載データの構成であり、市場での分布や各解決策の優劣を示すものではない。
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

      {/* ── 二 今回注目する会社 ── */}
      <Sec id="sec2" no="二" title="今回注目する会社">
        <div className="border border-line px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-[17px] text-ink">{customer}</span>
            <span className="text-[11.5px] text-muted">
              {industryLabel(axis.customer.industry)}
              {axis.customer.size && ` ・ ${axis.customer.size}`}
            </span>
          </div>
          <p className="mt-1.5 text-[12px] text-muted">導入：{provider}（{brand}）</p>
        </div>
        <p className="mt-5 text-[14px] leading-[2.1] text-body">{article.axisNote}</p>
        <div className="mt-5 border-l border-line pl-5">
          <p className="label mb-2">この現場にあった症状</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {(axis.tags ?? []).map((t) => (
              <Link key={t} href={`/tag/${encodeURIComponent(t)}`}
                className="border-b border-line text-[13px] text-ink no-underline hover:border-ink">#{t}</Link>
            ))}
          </div>
        </div>
        <p className="mt-5 text-[12.5px] text-muted">
          取り組みの全体像・成果の数字・導入の経緯は
          <Link href={`/cases/${axis.id}`} className="mx-1 border-b border-line pb-0.5 font-bold text-ink no-underline hover:border-ink">
            事例記事
          </Link>
          に詳しい。本稿では、事例群と照らして見える特徴を読む。
        </p>
      </Sec>

      {/* ── 三 特徴の読み ── */}
      <Sec id="sec3" no="三" title="この事例は、どこが特徴的か">
        <p className="border-l border-line pl-4 text-[11.5px] leading-relaxed text-muted">
          ※以下は、公開事例の記述と当サイトの掲載データから編集部が読み解いた「読み」です。
          事実と解釈の区別は本文中に示します。
        </p>
        <div className="mt-6 space-y-7">
          {article.features.map((f, i) => (
            <div key={i}>
              <h3 className="flex items-baseline gap-3">
                <span className="num text-[13px] text-muted">読み{i + 1}</span>
                <span className="font-display text-[16.5px] text-ink">{f.title}</span>
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-[2.1] text-body">{f.body}</p>
            </div>
          ))}
        </div>
      </Sec>

      {/* ── 四 参考になる条件 ── */}
      <Sec id="sec4" no="四" title="どんな会社の参考になるか">
        <p className="text-[13.5px] leading-[2.05] text-body">{article.fitIntro}</p>
        <div className="mt-5 border-t border-line">
          {article.fitConditions.map((c, i) => (
            <div key={i} className="border-b border-line2 px-2 py-4">
              <p className="font-display text-[15px] text-ink">□ {c.label}</p>
              <p className="mt-1.5 text-[13px] leading-[2] text-body">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[13px] leading-[2] text-muted">{article.fitCaution}</p>
      </Sec>

      {/* ── 五 自社と照らす ── */}
      <Sec id="sec5" no="五" title="自社と照らす">
        <ul className="space-y-3.5">
          {article.checklist.map((q, i) => (
            <li key={i} className="flex items-baseline gap-3">
              <span className="num shrink-0 text-[13px] text-muted">問{i + 1}.</span>
              <span className="text-[14px] leading-[1.95] text-ink">{q}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 border-l-2 border-ink pl-5 text-[14px] leading-[2.1] text-body">{article.closing}</p>
        <div className="mt-8 flex flex-wrap gap-6">
          <Link href={`/cases/${axis.id}`}
            className="border border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            この会社の事例記事を読む
          </Link>
          <a href={axis.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="self-center border-b border-ink pb-0.5 text-[13.5px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
            一次情報（{brand}）↗
          </a>
        </div>
        {vendorCases.length > 0 && (
          <div className="mt-8">
            <p className="label mb-2.5">追加で読める{brand}の掲載事例</p>
            <ul className="space-y-1.5">
              {vendorCases.map((c) => (
                <li key={c.id}>
                  <Link href={`/cases/${c.id}`}
                    className="text-[12.5px] leading-relaxed text-body no-underline hover:text-ink">
                    <span className="border-b border-line pb-0.5">{c.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Sec>

      <FeaturedServices article={article} />

      {/* ── PRポリシー表記 ── */}
      <footer className="mt-14 border-t border-line pt-5">
        <p className="text-[11px] leading-[1.9] text-muted">
          {article.sponsored
            ? <>本記事はタイアップ広告です（提供：{brand}）。
              編集ポリシー：タイアップ記事でも、引用・件数はすべて公開事例と当サイトの掲載データに基づきます。
              事例の読み解きは編集部の見立てであり、本文中にその旨と根拠を明示しています。
              自動集計は参考情報であり、製品の適合を診断するものではありません。</>
            : <>本記事は編集記事です（広告ではありません）。
              引用・件数はすべて公開事例と当サイトの掲載データに基づき、
              事例の読み解きは編集部の見立てであり、本文中にその旨と根拠を明示しています。</>}
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
