import Link from "next/link";
import { PURPOSES, MAX_SUB, buildPlan, countQuestions, parsePurposes, type Plan, type PurposeChoice } from "../../lib/planner";
import { ListHead } from "../../components/CaseGrid";
import PlannerMailForm from "../../components/PlannerMailForm";
import PlannerPurposeForm from "../../components/PlannerPurposeForm";

/* 事例プランナー。事例を「作る側」（ベンダーのマーケ・営業・CS・人事）向け。
   1) 何のために作る事例かを、主目的1つ＋副目的2つまでで選ぶと、
      目的別の構成と顧客への質問をすぐ出す（製品を問わない固定文。主目的5問・副目的は要の2問）
   2) 製品ページのURLとメールをもらうと、AIが質問と想定回答をその製品向けに書き換えてメールで渡す
   状態はURLクエリ（主目的 m・副目的 s）に持つ：戻る・共有・リロードがそのまま効く。 */

/* 未完成のため、サイト内の導線・サイトマップには載せず、検索にも出さない（URLを知っている人だけが開ける）。 */
export const metadata = {
  robots: { index: false, follow: false },
  title: "事例プランナー｜目的に合わせて、取材の質問と事例の着地を設計",
  description: "リード獲得、商談の後押し、社内エンゲージメント、採用。導入事例を何のために作るかを選ぶと、目的別の構成と、顧客に投げる質問、想定される回答、着地する事例の形が分かります（無料）。",
};

export default async function PlannerPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
  const choice = parsePurposes(one(sp.m), many(sp.s));
  const edit = sp.edit != null; // 「目的を変える」から戻ってきたとき（選択を保ったままフォームを出す）

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <ListHead eyebrow="事例プランナー" title="その事例は、何のために作りますか"
        sub="同じ顧客に同じ1時間の取材をしても、目的が違えば聞くことも仕上がりも変わります。目的を選ぶと、それに合った構成と、顧客に投げる質問をすぐにお出しします。1回の取材を複数の用途に使う場合は、主目的と副目的に分けて選べます。" />

      {choice && !edit ? <Result plan={buildPlan(choice)} choice={choice} /> : (
        <>
          {sp.go != null && !choice && (
            <p className="mb-6 border border-accent bg-accent-soft px-4 py-3 text-[13px] font-bold text-accent">
              主目的を1つ選んでください。
            </p>
          )}
          <PlannerPurposeForm maxSub={MAX_SUB} initMain={choice?.main} initSubs={choice?.subs ?? []}
            options={PURPOSES.map((p) => ({ slug: p.slug, label: p.label, desc: p.desc }))} />
        </>
      )}
    </div>
  );
}

/* ── 結果（製品を問わない版をすぐ出す） ── */

function Result({ plan, choice }: { plan: Plan; choice: PurposeChoice }) {
  const total = countQuestions(plan);
  const editQs = new URLSearchParams([["m", choice.main], ...choice.subs.map((g) => ["s", g]), ["edit", "1"]]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-5">
        <span className="label mr-1">目的</span>
        {plan.purposes.map((p) => (
          <span key={p.slug} className={`border px-2.5 py-1 text-[12px] font-bold ${p.role === "main" ? "border-ink bg-ink text-white" : "border-ink2 text-ink"}`}>
            <span className="mr-1.5 text-[10px] font-normal opacity-70">{p.role === "main" ? "主" : "副"}</span>{p.label}
          </span>
        ))}
        <Link href={`/planner?${editQs}`} className="ml-auto text-[12px] text-muted no-underline hover:text-ink">目的を変える ↺</Link>
      </div>

      <p className="mt-6 text-[13.5px] leading-[1.95] text-body">
        {plan.purposes.length > 1
          ? `1回の取材を${plan.purposes.length}つの用途に使う前提で組んでいます。最初の共通質問で土台を聞き、主目的の5問、副目的の2問ずつへ進みます。全部で${total}問です。`
          : `最初の共通質問で土台を聞き、そのあと目的に合わせた5問に進みます。全部で${total}問です。`}
        下の質問はどの製品にも使える標準の形です。
        <a href="#fit" className="font-bold text-ink">製品ページのURLを入れると、自社の製品向けに書き直します。</a>
      </p>

      {/* 最初に聞く質問 */}
      <section className="mt-9">
        <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />最初に聞く質問</p>
        <QuestionList items={[...plan.common.map((q) => q.q), plan.numberFallback.q]}
          notes={{ [plan.common.length]: "数字が出なかったら、この質問に切り替えます" }} />
      </section>

      {/* 目的ごとの構成と質問 */}
      {plan.purposes.map((p) => (
        <section key={p.slug} className="mt-12">
          <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />{p.role === "main" ? "主目的" : "副目的"}</p>
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
            顧客への質問{p.role === "sub" && <span className="ml-2 font-normal text-muted">副目的なので、要の2問に絞っています</span>}
          </h3>
          <QuestionList items={p.questions.map((q) => q.q)} />

          {/* 想定回答は1問だけ見本として出す（全問分は製品に合わせてメールで） */}
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

      {/* 製品に合わせる（アドレス取得） */}
      <section id="fit" className="mt-14 scroll-mt-24">
        <PlannerMailForm main={choice.main} subs={choice.subs} total={total} />
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

function QuestionList({ items, notes = {} }: { items: string[]; notes?: Record<number, string> }) {
  return (
    <ol className="mt-3 border-t border-line">
      {items.map((q, i) => (
        <li key={q} className="flex gap-3 border-b border-line2 py-3.5">
          <span className="num shrink-0 text-[15px] text-muted">{String(i + 1).padStart(2, "0")}</span>
          <span>
            {notes[i] && <span className="label mb-1 block">{notes[i]}</span>}
            <span className="text-[14px] font-bold leading-[1.8] text-ink">{q}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
