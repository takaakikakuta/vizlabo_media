import Link from "next/link";
import { notFound } from "next/navigation";
import { allCases, getCase } from "../../lib/cases";
import { industryLabel, productLabel } from "../../lib/taxonomy";
import { hasDigit, parseStat, statSize } from "../../lib/stat";
import type { CaseStudy } from "../../lib/types";
import type { WakaremichiArticle } from "../../lib/articles";
import { articleThumb } from "../../lib/articles";
import CoverImg from "../CoverImg";
import Toc from "./Toc";
import FeaturedServices from "./FeaturedServices";

/* 「分かれ道」型のテンプレート。
   書かれた部分は article（content/articles/*.json）から、
   引用・数字・道別リストは cases.json からビルド時に組み立てる。 */

function pathExamples(cats: string[], mustTags: string[], exclude: string[], limit = 3) {
  return allCases()
    .filter((c) => !exclude.includes(c.id) && cats.includes(c.productCategory) &&
      (c.tags ?? []).some((t) => mustTags.includes(t)))
    .sort((a, b) => Number(b.hasNumbers) - Number(a.hasNumbers))
    .slice(0, limit);
}

function sharedTags(a: CaseStudy, b: CaseStudy): string[] {
  const s = new Set(b.tags ?? []);
  return (a.tags ?? []).filter((t) => s.has(t));
}

export default function Wakaremichi({ article }: { article: WakaremichiArticle }) {
  const a = getCase(article.caseA.id);
  const b = getCase(article.caseB.id);
  const c3 = getCase(article.verification.caseId);
  if (!a || !b || !c3) notFound();

  const excluded = [a.id, b.id, c3.id];

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* ── 扉 ── */}
      <header>
        <div className="flex items-baseline gap-3">
          <span className="font-display border-b-2 border-ink pb-1 text-[15px] tracking-[.24em] text-ink">{article.series}</span>
          <span className="num text-[13px] text-muted">#{String(article.no).padStart(3, "0")}</span>
          <span className="num ml-auto text-[11px] text-muted">{article.publishedAt.replace(/-/g, ".")}</span>
        </div>
        <h1 className="font-display mt-6 text-[27px] leading-[1.45] text-ink sm:text-[34px]">
          {article.title.map((line, i) => (
            <span key={i}>{line}{i < article.title.length - 1 && <br />}</span>
          ))}
        </h1>
        <p className="mt-6 text-[14px] leading-[2.1] text-body">{article.lead}</p>
      </header>

      {/* 記事の顔（thumbnail 指定 > 記事内事例の画像）。無ければ何も出さない */}
      {articleThumb(article) && (
        <figure className="mt-8">
          <div className="relative aspect-[5/3] w-full overflow-hidden border border-line bg-soft">
            <CoverImg src={articleThumb(article)!} />
          </div>
        </figure>
      )}

      <Toc items={[
        { id: "sec1", no: "一", label: "同じ悩み" },
        { id: "sec2", no: "二", label: "分かれた決断" },
        { id: "sec3", no: "三", label: "なぜ分かれたか" },
        { id: "sec4", no: "四", label: "第三の会社で照らす" },
        { id: "sec5", no: "五", label: "あなたの会社なら" },
        { id: "sec6", no: "結", label: "解体を終えて" },
      ]} />

      {/* ── 対面カルテ ── */}
      <div className="mt-9 grid grid-cols-1 overflow-hidden border-2 border-ink sm:grid-cols-2">
        <VsCard c={a} side={article.caseA} />
        <div className="border-t-2 border-ink sm:border-l-2 sm:border-t-0">
          <VsCard c={b} side={article.caseB} />
        </div>
      </div>

      {/* ── 一 同じ悩み ── */}
      <Sec id="sec1" no="一" title="同じ悩み">
        <div className="space-y-5">
          <Quote c={a} />
          <Quote c={b} />
        </div>
        <p className="mt-5 text-[13.5px] leading-[2.05] text-body">
          困りごとのタグはほぼ重なる（{sharedTags(a, b).map((t) => `#${t}`).join("、")}）。
          {article.sharedNote}
        </p>
      </Sec>

      {/* ── 二 分かれた決断 ── */}
      <Sec id="sec2" no="二" title="分かれた決断">
        <div className="space-y-8">
          <Decision c={a} label={article.caseA.decisionLabel} />
          <Decision c={b} label={article.caseB.decisionLabel} />
        </div>
      </Sec>

      {/* ── 三 なぜ分かれたか ── */}
      <Sec id="sec3" no="三" title="なぜ分かれたか">
        <p className="mb-6 border-l border-line pl-4 text-[11.5px] leading-relaxed text-muted">
          ※ここから先は、公開情報を突き合わせた編集部の推理です。両社の実際の意思決定過程は、当事者のみが知ります。
        </p>
        {article.readings.map((r, i) => (
          <div key={i} className="mt-7 first:mt-0">
            <h3 className="flex items-baseline gap-3">
              <span className="num text-[13px] text-muted">読み{i + 1}</span>
              <span className="font-display text-[17px] text-ink">{r.title}</span>
            </h3>
            <p className="mt-3 text-[13.5px] leading-[2.1] text-body">{r.body}</p>
          </div>
        ))}
      </Sec>

      {/* ── 四 検算 ── */}
      <Sec id="sec4" no="四" title="第三の会社で照らす">
        <p className="text-[13.5px] leading-[2.05] text-body">{article.verification.intro}</p>
        <Link href={`/cases/${c3.id}`}
          className="row group mt-5 flex items-center gap-4 border-y border-line px-2 py-4 no-underline">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] leading-snug text-ink group-hover:text-brand">{c3.title}</p>
            <p className="mt-1 text-[11.5px] text-muted">{industryLabel(c3.customer.industry)}／選んだ道：{c3.product}</p>
          </div>
          {c3.results[0] && (
            <span className="num shrink-0 text-[22px] leading-none text-accent">
              {parseStat(c3.results[0].value).head}
            </span>
          )}
        </Link>
        <p className="mt-4 text-[13.5px] leading-[2.05] text-body">{article.verification.outro}</p>
      </Sec>

      {/* ── 五 あなたの会社なら ── */}
      <Sec id="sec5" no="五" title="あなたの会社なら">
        <div className="border-t border-line">
          {article.questions.map((q) => (
            <div key={q.q} className="border-b border-line2 py-5">
              <p className="font-display text-[16px] text-ink">{q.q}</p>
              <p className="mt-2 text-[13px] leading-[1.95] text-body">{q.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {article.pathLists.map((p) => (
            <PathList key={p.title} title={p.title}
              cases={pathExamples(p.categories, p.tags, excluded)} />
          ))}
        </div>
      </Sec>

      {/* ── 結び ── */}
      <section id="sec6" className="mt-14 scroll-mt-20 border-t-2 border-ink pt-6">
        <h2 className="font-display text-[19px] text-ink">解体を終えて</h2>
        <p className="mt-4 text-[13.5px] leading-[2.05] text-body">{article.closing}</p>
        <div className="mt-8 flex flex-wrap gap-6">
          <Link href={`/tag/${encodeURIComponent(article.ctaTag)}`}
            className="border border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            #{article.ctaTag} の事例をすべて見る
          </Link>
          <Link href="/contact"
            className="self-center border-b border-ink pb-0.5 text-[13.5px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
            自社の事例も解体してほしい →
          </Link>
        </div>
      </section>

      <FeaturedServices article={article} />
    </article>
  );
}

function VsCard({ c, side }: { c: CaseStudy; side: WakaremichiArticle["caseA"] }) {
  const r = c.results.find((x) => hasDigit(x.value)) ?? c.results[0];
  const st = r ? parseStat(r.value) : null;
  return (
    <div className="bg-white p-5">
      <p className="label">{industryLabel(c.customer.industry)}／{c.customer.size}</p>
      <p className="font-display mt-2 text-[17px] leading-snug text-ink">{c.customer.name}</p>
      <div className="mt-4 border-t border-line2 pt-3.5">
        <p className="text-[11px] text-muted">選んだ道</p>
        <p className="font-display mt-1 text-[16px] text-ink">{side.path}</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{side.pathNote}</p>
      </div>
      {r && st && (
        <div className="mt-4 border-t border-line2 pt-3.5">
          <p className="label line-clamp-1">{r.metric}</p>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className={`num leading-none text-accent ${statSize(st.head, "lg")}`}>{st.head}</span>
            {st.verb && <span className="text-[11px] font-bold text-accent/70">{st.verb}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Quote({ c }: { c: CaseStudy }) {
  return (
    <figure className="border-l border-line pl-5">
      <blockquote className="font-display text-[14.5px] leading-[2] text-ink2">「{c.challengeDetail}」</blockquote>
      <figcaption className="mt-2 text-[11.5px] text-muted">
        — {c.customer.name}（{c.customer.size}）の事例より
        <Link href={`/cases/${c.id}`} className="ml-2 no-underline hover:text-brand">資料 →</Link>
      </figcaption>
    </figure>
  );
}

function Decision({ c, label }: { c: CaseStudy; label: string }) {
  return (
    <div>
      <h3 className="font-display text-[16.5px] text-ink">{label}</h3>
      <p className="mt-2.5 text-[13.5px] leading-[2.05] text-body">{c.actions}</p>
      <p className="mt-2 text-[11.5px] text-muted">
        {c.customer.name}／製品：{c.product}（{productLabel(c.productCategory)}）
      </p>
    </div>
  );
}

function PathList({ title, cases }: { title: string; cases: CaseStudy[] }) {
  return (
    <div>
      <p className="label mb-3">{title}</p>
      <div className="border-t border-line2">
        {cases.map((c) => {
          const r = c.results.find((x) => hasDigit(x.value)) ?? c.results[0];
          const st = r ? parseStat(r.value) : null;
          return (
            <Link key={c.id} href={`/cases/${c.id}`}
              className="row group flex items-baseline gap-3 border-b border-line2 px-1 py-2.5 no-underline">
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-body group-hover:text-ink">
                {industryLabel(c.customer.industry)}／{c.customer.name || "非公開"}
              </span>
              {st && <span className="num max-w-[40%] shrink-0 truncate text-[13px] text-accent" title={r!.value}>{st.head}{st.verb}</span>}
            </Link>
          );
        })}
      </div>
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
