import Link from "next/link";
import { siteStats } from "../../lib/cases";
import {
  PURPOSES, NUM_OPTIONS, MAX_PURPOSES, CHALLENGES, INDUSTRIES,
  buildPlan, parsePlanAnswers, type Plan,
} from "../../lib/planner";
import { ListHead } from "../../components/CaseGrid";
import PlannerMailForm from "../../components/PlannerMailForm";

/* 事例プランナー。事例を「作る側」（ベンダーのマーケ・営業・CS・人事）向け。
   何のために作る事例かを起点に、目的別の構成と顧客への質問を出す。
   状態はURLクエリ（g/ind/ch/num）に持つ：戻る・共有・リロードがそのまま効く。
   画面には構成と質問の一部を出し、想定回答つきの全文はメールで渡す（アドレス取得）。 */

/* 未完成のため、サイト内の導線・サイトマップには載せず、検索にも出さない（URLを知っている人だけが開ける）。 */
export const metadata = {
  robots: { index: false, follow: false },
  title: "事例プランナー｜目的に合わせて、取材の質問と事例の着地を設計",
  description: "リード獲得、商談の後押し、社内エンゲージメント、採用。導入事例を何のために作るかを選ぶと、目的別の構成と、顧客に投げる質問、想定される回答、着地する事例の形が分かります（無料）。",
};

const PREVIEW_QUESTIONS = 2; // 目的ごとに画面で見せる質問の数

export default async function PlannerPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
  const g = many(sp.g);
  const answers = parsePlanAnswers({ g, ind: one(sp.ind), ch: one(sp.ch), num: one(sp.num) });
  const submitted = g.length > 0 || sp.ind != null || sp.ch != null || sp.num != null;
  const s = siteStats();

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <ListHead eyebrow="事例プランナー" title="その事例は、何のために作りますか"
        sub={`同じ顧客に同じ1時間の取材をしても、目的が違えば聞くことも仕上がりも変わります。4つの質問に答えると、目的に合った構成と、顧客に投げる質問、着地する事例の形をお出しします。成果の語られ方は、掲載事例${s.total.toLocaleString()}件のデータで裏付けています。`} />

      {answers ? <Result plan={buildPlan(answers)} /> : (
        <>
          {submitted && (
            <p className="mb-6 border border-accent bg-accent-soft px-4 py-3 text-[13px] font-bold text-accent">
              4つの質問すべてに答えてください。
            </p>
          )}
          <QuestionForm sp={{ g, ind: one(sp.ind), ch: one(sp.ch), num: one(sp.num) }} />
        </>
      )}
    </div>
  );
}

/* ── 質問フォーム（GET。JSなしで動く） ── */

const CHIP = "flex cursor-pointer items-start gap-2.5 border border-line bg-white px-4 py-3 transition hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-soft";

function QHead({ no, q, note }: { no: number; q: string; note?: string }) {
  return (
    <>
      <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />Q{no}</p>
      <h2 className="font-display mt-3 text-[21px] leading-[1.45] text-ink sm:text-[25px]">{q}</h2>
      {note && <p className="mt-2 text-[12.5px] text-muted">{note}</p>}
    </>
  );
}

function QuestionForm({ sp }: { sp: { g: string[]; ind?: string; ch?: string; num?: string } }) {
  return (
    <form method="get" action="/planner" className="space-y-12">
      <fieldset>
        <QHead no={1} q="この事例を、何のために作りますか"
          note={`${MAX_PURPOSES}つまで選べます。2つ選ぶと、1回の取材で両方に使える質問をお出しします。`} />
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {PURPOSES.map((p) => (
            <label key={p.slug} className={CHIP}>
              <input type="checkbox" name="g" value={p.slug} defaultChecked={sp.g.includes(p.slug)}
                className="mt-1 h-3.5 w-3.5 shrink-0 accent-ink" />
              <span>
                <span className="block text-[14px] font-bold text-ink">{p.label}</span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">{p.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <QHead no={2} q="取材する顧客の業種は" />
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {INDUSTRIES.map((t) => (
            <label key={t.slug} className={CHIP}>
              <input type="radio" name="ind" value={t.slug} defaultChecked={sp.ind === t.slug} required
                className="mt-1 h-3.5 w-3.5 shrink-0 accent-ink" />
              <span className="text-[13.5px] font-bold text-ink">{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <QHead no={3} q="その顧客に、どんな成果が出ていますか" note="いちばん伝えたいものを1つ選んでください。" />
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {CHALLENGES.map((t) => (
            <label key={t.slug} className={CHIP}>
              <input type="radio" name="ch" value={t.slug} defaultChecked={sp.ch === t.slug} required
                className="mt-1 h-3.5 w-3.5 shrink-0 accent-ink" />
              <span>
                <span className="block text-[13.5px] font-bold text-ink">{t.label}</span>
                {t.desc && <span className="mt-0.5 block text-[11.5px] text-muted">{t.desc}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <QHead no={4} q="顧客から、成果の数字は出そうですか" />
        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
          {NUM_OPTIONS.map((o) => (
            <label key={o.value} className={CHIP}>
              <input type="radio" name="num" value={o.value} defaultChecked={sp.num === o.value} required
                className="mt-1 h-3.5 w-3.5 shrink-0 accent-ink" />
              <span>
                <span className="block text-[13.5px] font-bold text-ink">{o.label}</span>
                <span className="mt-0.5 block text-[11.5px] text-muted">{o.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="border-t border-ink pt-6">
        <button type="submit"
          className="border border-ink bg-ink px-8 py-3 text-[14px] font-bold text-white transition hover:bg-white hover:text-ink">
          構成と質問を見る →
        </button>
      </div>
    </form>
  );
}

/* ── 結果 ── */

function Result({ plan }: { plan: Plan }) {
  const a = plan.answers;
  const e = plan.evidence;
  const total = plan.common.length + 1 + plan.purposes.reduce((n, p) => n + p.questions.length, 0);
  const pct = e.total ? Math.round((e.withNumbers / e.total) * 100) : 0;
  const scope = e.scope === "cell" ? `${plan.industryLabel}×${plan.challengeLabel}` : plan.challengeLabel;
  const editQs = new URLSearchParams([...a.purposes.map((g) => ["g", g]), ["ind", a.industry], ["ch", a.challenge]]);

  return (
    <div>
      {/* 回答のまとめ */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-5">
        <span className="label mr-1">回答</span>
        {[...plan.purposes.map((p) => p.label), plan.industryLabel, plan.challengeLabel,
          `数字は${NUM_OPTIONS.find((o) => o.value === a.num)!.label}`].map((t) => (
          <span key={t} className="border border-ink2 px-2.5 py-1 text-[12px] font-bold text-ink">{t}</span>
        ))}
        <Link href={`/planner?${editQs}`} className="ml-auto text-[12px] text-muted no-underline hover:text-ink">回答を変える ↺</Link>
      </div>

      {plan.purposes.length > 1 && (
        <p className="mt-6 text-[13.5px] leading-[1.95] text-body">
          目的を2つ選んだので、1回の取材で2本の事例を作る前提で組んでいます。
          最初の共通質問で土台を聞き、そのあと目的ごとの質問に進みます。
        </p>
      )}

      {/* 最初に聞く質問 */}
      <section className="mt-9">
        <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />最初に聞く質問</p>
        <ol className="mt-4 border-t border-line">
          {plan.common.map((q, i) => (
            <li key={q.q} className="flex gap-3 border-b border-line2 py-3.5">
              <span className="num shrink-0 text-[15px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[14px] font-bold leading-[1.8] text-ink">{q.q}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 目的ごとの構成と質問（一部） */}
      {plan.purposes.map((p) => (
        <section key={p.slug} className="mt-12">
          <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />目的</p>
          <h2 className="font-display mt-3 text-[24px] leading-[1.4] text-ink sm:text-[28px]">{p.label}のための事例</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-3 border-y border-line py-4 text-[13px] leading-[1.9] sm:grid-cols-2">
            <div><dt className="label">読ませたい相手</dt><dd className="mt-1 text-body">{p.reader}</dd></div>
            <div><dt className="label">読んだ後にしてほしいこと</dt><dd className="mt-1 text-body">{p.goal}</dd></div>
          </dl>

          <h3 className="mt-7 text-[13px] font-bold text-ink">構成テンプレート</h3>
          <ol className="mt-3 border-t border-line">
            {p.sections.map((sec, i) => (
              <li key={sec.h} className="flex gap-3 border-b border-line2 py-3">
                <span className="num shrink-0 text-[15px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[13.5px] leading-[1.8]">
                  <span className="font-bold text-ink">{sec.h}</span>
                  <span className="ml-2 text-body">{sec.what}</span>
                </span>
              </li>
            ))}
          </ol>

          <h3 className="mt-7 text-[13px] font-bold text-ink">
            顧客への質問<span className="ml-2 font-normal text-muted">{p.questions.length}問のうち{PREVIEW_QUESTIONS}問</span>
          </h3>
          <ul className="mt-3 border-t border-line">
            {p.questions.slice(0, PREVIEW_QUESTIONS).map((q) => (
              <li key={q.q} className="border-b border-line2 py-3.5">
                <p className="text-[14px] font-bold leading-[1.8] text-ink">{q.q}</p>
              </li>
            ))}
          </ul>
          {/* 想定回答は1問だけ見本として出す */}
          <div className="mt-3 border border-line bg-soft px-4 py-3.5 text-[12.5px] leading-[1.9]">
            <p className="label">想定される回答（1問目の見本）</p>
            <p className="mt-1.5 text-body">{p.questions[0].expect}</p>
            <p className="mt-1 text-muted">使いどころ：{p.questions[0].use}</p>
          </div>
          {!p.dataBacked && (
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              ※この目的の事例は社外に公開されることが少ないため、質問と想定回答は掲載事例の集計ではなく、編集部の取材経験にもとづいています。
            </p>
          )}
        </section>
      ))}

      {/* 実データの裏付け */}
      <section className="mt-12">
        <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />掲載事例では、成果がこう語られています</p>
        <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-4 border-y border-line py-5">
          <div>
            <p className="label">「{scope}」の事例</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="num text-[30px] leading-none text-ink">{e.total.toLocaleString()}</span>
              <span className="text-[12px] text-muted">件</span>
            </p>
          </div>
          <div>
            <p className="label">成果を数字で公開</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="num text-[30px] leading-none text-accent">{pct}</span>
              <span className="text-[12px] text-muted">%（{e.withNumbers.toLocaleString()}件）</span>
            </p>
          </div>
        </div>
        {e.scope === "challenge" && (
          <p className="mt-2 text-[11.5px] text-muted">※{plan.industryLabel}に絞ると件数が少ないため、全業種で集計しています。</p>
        )}
        <div className="mt-2">
          {e.examples.map((c) => {
            const r = c.results.find((x) => /\d/.test(x.value)) ?? c.results[0];
            return (
              <Link key={c.id} href={`/cases/${c.id}`} className="block border-b border-line2 py-3 no-underline">
                <span className="block text-[13px] leading-[1.7] text-body hover:text-ink">{c.title}</span>
                {r && <span className="num mt-0.5 block text-[12px] text-accent">{r.metric}：{r.value}</span>}
              </Link>
            );
          })}
        </div>
      </section>

      {/* メールで全文 */}
      <section className="mt-12">
        <PlannerMailForm purposes={a.purposes} industry={a.industry} challenge={a.challenge} num={a.num} total={total} />
      </section>

      <div className="mt-12 border-t border-ink pt-8">
        <Link href="/produce" className="group block border border-line bg-soft px-5 py-5 no-underline transition hover:border-ink">
          <p className="label">取材から執筆まで任せたい</p>
          <p className="font-display mt-2 text-[16px] text-ink group-hover:text-brand">事例制作代行 →</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">この構成と質問をもとに、取材・構成・執筆まで編集部が代行します。</p>
        </Link>
      </div>
    </div>
  );
}
