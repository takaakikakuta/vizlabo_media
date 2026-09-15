import Link from "next/link";
import { allCases, getCase } from "../../lib/cases";
import { industryLabel, productLabel } from "../../lib/taxonomy";
import type { DounyumaeArticle, DounyumaeQuote } from "../../lib/articles";
import { articleThumb } from "../../lib/articles";
import CoverImg from "../CoverImg";
import Toc from "./Toc";
import FeaturedServices from "./FeaturedServices";

/* 「導入前の日本」（アンソロジー）テンプレート。
   1つの困りごとタグを対象に、該当事例の「導入前」の記述を編む。
   引用は執筆時に原典と照合した本文を quotes.text で保持し、種別（当事者の発言／原典記事の記述／
   当サイトの課題要約）を明示して表示する。事例IDだけから課題要約を実文引用のように見せない。
   決まり文句は「表現を含む事例数」で集計（同じ課題文に何度出ても1事例）。
   任意節（決まり文句・記述の重なり）は、データが無ければ章ごと消え、章番号は自動で詰まる。 */

const QUOTE_KIND_LABEL: Record<DounyumaeQuote["kind"], string> = {
  speech: "当事者の発言（原典より）",
  article: "事例記事の記述（原典より）",
  summary: "当サイトの課題要約",
};

export default function Dounyumae({ article }: { article: DounyumaeArticle }) {
  const cases = allCases().filter((c) => (c.tags ?? []).includes(article.axisTag));
  const industries = new Set(cases.map((c) => c.customer.industry));

  const phraseCounts = (article.phrases ?? [])
    .map((p) => {
      let re: RegExp | null = null;
      try { re = new RegExp(p.pattern); } catch { /* 不正なパターンは無視 */ }
      // 出現回数ではなく「その表現を含む事例の数」。同じ課題文に複数回出ても1事例。
      return { label: p.label, n: re ? cases.filter((c) => re!.test(c.challengeDetail ?? "")).length : 0 };
    })
    .filter((p) => p.n >= 3)
    .sort((a, b) => b.n - a.n);

  const dist = new Map<string, number>();
  for (const c of cases) dist.set(c.productCategory, (dist.get(c.productCategory) ?? 0) + 1);
  const distTop = [...dist.entries()]
    .filter(([cat]) => cat !== "other-product")
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  // 章立ては掲載する節に合わせて動的に組む（固定の章数を優先しない）
  const secs: { id: string; label: string; render: () => React.ReactNode }[] = [];

  secs.push({
    id: "scope", label: "対象とした事例", render: () => (
      <>
        <p className="text-[13.5px] leading-[2.05] text-body">
          対象は、悩みタグ「<Link href={`/tag/${encodeURIComponent(article.axisTag)}`}
            className="border-b border-line font-bold text-ink no-underline hover:border-ink">#{article.axisTag}</Link>」が付く当サイトの掲載事例
          ——現在<span className="num mx-1 text-ink2">{cases.length}</span>件・
          <span className="num mx-1 text-ink2">{industries.size}</span>業種。
        </p>
        <p className="mt-3 text-[12px] leading-[1.95] text-muted">{article.baselineNote}</p>
      </>
    ),
  });

  if (phraseCounts.length > 0) {
    secs.push({
      id: "phrases", label: "繰り返される言葉", render: () => (
        <>
          <p className="text-[13.5px] leading-[2.05] text-body">
            当サイトの課題要約{cases.length}件のうち、その表現を含む事例の数を数えた。
            言葉の反復の記録であり、症状の発生率や深刻度の順位ではない。
          </p>
          <div className="mt-5 border-t border-line">
            {phraseCounts.map((p) => (
              <div key={p.label} className="flex items-baseline gap-4 border-b border-line2 px-2 py-3">
                <span className="font-display text-[15px] text-ink">{p.label}</span>
                <span className="num ml-auto shrink-0 text-[14px] text-ink2">{p.n}<span className="ml-0.5 text-[10px] text-muted">事例</span></span>
              </div>
            ))}
          </div>
        </>
      ),
    });
  }

  secs.push({
    id: "types", label: `${article.axisTag}は、こう姿を現す`, render: () => (
      <div className="space-y-10">
        {article.types.map((t, i) => (
          <div key={t.title}>
            <h3 className="flex items-baseline gap-3 border-t-2 border-ink pt-4">
              <span className="num text-[13px] text-muted">型{i + 1}</span>
              <span className="font-display text-[18px] text-ink">{t.title}</span>
            </h3>
            <p className="mt-2.5 text-[13.5px] leading-[2.05] text-body">{t.body}</p>
            <div className="mt-4 space-y-4">
              {t.quotes.map((q) => {
                const c = getCase(q.caseId);
                if (!c) return null;
                return (
                  <figure key={q.caseId} className="border-l border-line pl-5">
                    <blockquote className="font-display text-[13.5px] leading-[2] text-ink2">
                      「{q.text}」
                    </blockquote>
                    <figcaption className="mt-1.5 text-[11px] text-muted">
                      — {industryLabel(c.customer.industry)}{c.customer.size && `／${c.customer.size}`}
                      <span className="mx-1.5 text-line">|</span>{QUOTE_KIND_LABEL[q.kind]}
                      <Link href={`/cases/${c.id}`} className="ml-2 no-underline hover:text-brand">出典の事例 →</Link>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    ),
  });

  if (article.spreadBody) {
    secs.push({
      id: "spread", label: "業種・規模を越えた記述の重なり", render: () => (
        <p className="text-[13.5px] leading-[2.1] text-body">{article.spreadBody}</p>
      ),
    });
  }

  secs.push({
    id: "exits", label: "各社が変えたこと", render: () => (
      <>
        <p className="text-[13.5px] leading-[2.05] text-body">{article.exitsIntro}</p>
        <div className="mt-6 space-y-7">
          {article.exits.map((x, i) => (
            <div key={i}>
              <h3 className="font-display text-[16px] leading-snug text-ink">{x.label}</h3>
              <p className="mt-2 text-[13px] leading-[2] text-body">{x.body}</p>
              <ul className="mt-2.5 space-y-1.5 border-l border-line pl-4">
                {x.caseIds.map((id) => {
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
                })}
              </ul>
            </div>
          ))}
        </div>
        {distTop.length > 0 && (
          <div className="mt-7 border border-line2 px-4 py-3.5">
            <p className="text-[11px] leading-relaxed text-muted">
              参考：#{article.axisTag} が付く当サイト掲載事例{cases.length}件の、解き方カテゴリの内訳。
              掲載データの構成であり、市場での分布や「この型にはこの製品」という対応を示すものではない。
            </p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              {distTop.map(([cat, n]) => (
                <span key={cat} className="text-[11.5px] text-body">
                  {productLabel(cat)}<span className="num ml-1 text-ink2">{n}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-8 flex flex-wrap gap-6">
          <Link href={`/tag/${encodeURIComponent(article.axisTag)}`}
            className="border border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            #{article.axisTag} の事例{cases.length}件をすべて見る
          </Link>
          <Link href="/tags"
            className="self-center border-b border-ink pb-0.5 text-[13.5px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
            他の困りごとを探す →
          </Link>
        </div>
      </>
    ),
  });

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* ── 扉 ── */}
      <header>
        <div className="flex items-baseline gap-3">
          <span className="font-display border-b-2 border-ink pb-1 text-[15px] tracking-[.24em] text-ink">{article.series}</span>
          <span className="num text-[13px] text-muted">#{String(article.no).padStart(3, "0")}</span>
          <span className="num ml-auto text-[11px] text-muted">{article.publishedAt.replace(/-/g, ".")}</span>
        </div>
        <h1 className="font-display mt-6 text-[27px] leading-[1.5] text-ink sm:text-[34px]">
          {article.title.map((line, i) => (
            <span key={i}>{line}{i < article.title.length - 1 && <br />}</span>
          ))}
        </h1>
        <p className="mt-6 text-[14px] leading-[2.1] text-body">{article.lead}</p>
        <p className="mt-5 border border-line2 px-4 py-3 text-[11.5px] leading-[1.9] text-muted">{article.sourceNote}</p>
      </header>

      {/* 記事の顔（thumbnail 指定 > 記事内事例の画像）。無ければ何も出さない */}
      {articleThumb(article) && (
        <figure className="mt-8">
          <div className="relative aspect-[5/3] w-full overflow-hidden border border-line bg-soft">
            <CoverImg src={articleThumb(article)!} />
          </div>
        </figure>
      )}

      <Toc items={secs.map((s, i) => ({ id: s.id, no: kanji(i + 1), label: s.label }))} />

      {secs.map((s, i) => (
        <Sec key={s.id} id={s.id} no={kanji(i + 1)} title={s.label}>
          {s.render()}
        </Sec>
      ))}

      {/* ── 結び ── */}
      <section className="mt-14 border-t-2 border-ink pt-6">
        <p className="font-display text-[15px] leading-[2.2] text-ink">
          {article.closingLines.map((line, i) => (
            <span key={i}>{line}{i < article.closingLines.length - 1 && <br />}</span>
          ))}
        </p>
      </section>

      <FeaturedServices article={article} />
    </article>
  );
}

function kanji(n: number): string {
  return "〇一二三四五六七八九十"[n] ?? String(n);
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
