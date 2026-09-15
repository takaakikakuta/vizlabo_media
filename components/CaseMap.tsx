import Link from "next/link";
import type { CaseStudy } from "../lib/types";
import type { Recommendation } from "../lib/recommend";
import { challengeLabel, productLabel } from "../lib/taxonomy";
import { challengeStyle, primaryChallenge } from "../lib/visuals";
import { parseStat, statSize } from "../lib/stat";

/* 事例の要点を1本の帯にする：〈課題〉▶〈解き方〉▶〈成果〉。
   図やカードではなく、罫と活字だけで組んで、成果の数字を帯の終点に置く。 */
export default function CaseMap({ c, similar }: { c: CaseStudy; similar: Recommendation[] }) {
  const top = c.results[0];
  const st = top ? parseStat(top.value) : null;
  const color = challengeStyle(primaryChallenge(c)).solid;

  return (
    <section className="border-y-2 border-ink py-7">
      <div className="grid items-start gap-6 sm:grid-cols-[1fr_auto_1fr_auto_auto]">
        {/* 課題 */}
        <div>
          <div className="label flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />課題
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
            {c.challenges.map((ch) => (
              <Link key={ch} href={`/challenge/${ch}`}
                className="font-display border-b border-line text-[16px] text-ink no-underline hover:border-ink">
                {challengeLabel(ch)}
              </Link>
            ))}
          </div>
        </div>

        <Arrow />

        {/* 解き方 */}
        <div>
          <div className="label">解き方</div>
          <Link href={`/product/${c.productCategory}`}
            className="font-display mt-2.5 block border-b border-line text-[16px] text-ink no-underline hover:border-ink">
            {productLabel(c.productCategory)}
          </Link>
          {c.product && <div className="mt-1.5 text-[12px] text-muted">{c.product}</div>}
        </div>

        <Arrow />

        {/* 成果＝帯の終点。ここだけ色を使う */}
        <div className="sm:min-w-[130px]">
          <div className="label">成果</div>
          {top && st ? (
            <>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className={`num leading-none text-accent ${statSize(st.head, "lg")}`}>{st.head}</span>
                {st.verb && <span className="text-[12px] font-bold text-accent/70">{st.verb}</span>}
              </div>
              <div className="mt-1.5 text-[11.5px] text-muted">{top.metric}</div>
            </>
          ) : (
            <div className="mt-2.5 text-[13px] text-muted">定性的な成果</div>
          )}
        </div>
      </div>

      {/* 似た「課題 × 解き方」の組み合わせ */}
      {similar.length > 0 && (
        <div className="mt-7 border-t border-line pt-5">
          <div className="label mb-3">似た「課題 × 解き方」の組み合わせ</div>
          <div className="border-t border-line2">
            {similar.map((r) => {
              const rs = r.c.results[0] ? parseStat(r.c.results[0].value) : null;
              return (
                <Link key={r.c.id} href={`/cases/${r.c.id}`}
                  className="row group flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-line2 px-2 py-2.5 text-[12.5px] no-underline">
                  <span className="text-body">{r.c.challenges.slice(0, 2).map(challengeLabel).join("・")}</span>
                  <span className="text-muted">▶</span>
                  <span className="font-bold text-ink">{productLabel(r.c.productCategory)}</span>
                  {rs && (
                    <span className="num ml-auto max-w-[42%] truncate text-[14px] text-accent" title={r.c.results[0].value}>
                      {rs.head}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function Arrow() {
  return <div className="hidden self-center text-muted sm:block">▶</div>;
}
