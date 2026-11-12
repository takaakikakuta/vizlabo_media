import Link from "next/link";
import { countQuestions, evidenceLine, roleLabel, type Question } from "../../../../lib/planner";
import { PLAN_DAYS, loadPlan, planDaysLeft, planUntil } from "../../../../lib/plannerStore";
import { ListHead } from "../../../../components/CaseGrid";

/* 事例プランナーの専用ページ。メールで届いたリンク（推測できないID）を知っている人だけが開ける。
   製品に合わせて書き直した質問・想定回答・着地予想の全文を出す。
   始めた日から30日で失効し、期限はページの上部に常に出す。 */

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const, // 外部リンクを開いたときに、このページのURL（＝鍵）を相手に渡さない
  title: "事例プランナー｜あなたの質問リストと着地予想",
};

export default async function SavedPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saved = await loadPlan(id);

  if (!saved) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12">
        <ListHead eyebrow="事例プランナー" title="このページは開けません"
          sub={`保存期間（${PLAN_DAYS}日間）が終わって削除されたか、URLが正しくない可能性があります。お手数ですが、もう一度お作りください。`} />
        <Link href="/planner"
          className="inline-block border border-ink bg-ink px-8 py-3 text-[14px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
          事例プランナーを始める →
        </Link>
      </div>
    );
  }

  const { plan } = saved;
  const left = planDaysLeft(saved);
  // 質問の通し番号（共通→切り替え→目的ごと。画面に並ぶ順と同じ）
  const order = [...plan.common, plan.numberFallback, ...plan.purposes.flatMap((p) => p.questions)];
  const no = new Map(order.map((q, i) => [q, i + 1]));
  const qa = (q: Question) => {
    const n = no.get(q);
    return (
      <li key={q.q} className="border-b border-line2 py-4">
        <p className="flex gap-3 text-[14.5px] font-bold leading-[1.8] text-ink">
          <span className="num shrink-0 text-[15px] font-normal text-muted">Q{n}</span>{q.q}
        </p>
        <p className="mt-2 pl-9 text-[13px] leading-[1.95] text-body">
          <span className="mr-2 font-bold text-accent">想定される回答</span>{q.expect}
        </p>
        <p className="mt-1 pl-9 text-[12px] leading-[1.8] text-muted">使いどころ：{q.use}</p>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <ListHead eyebrow="事例プランナー" title="あなたの質問リストと着地予想"
        sub={plan.profile
          ? "ご入力いただいた製品ページをAIが読み、取材の質問と想定される回答を、この製品に合わせて書き直しました。"
          : "製品ページの内容をうまく読み取れなかったため、製品を問わない標準の質問リストになっています。"} />

      {/* 保存期限（常に見える位置に） */}
      <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border px-5 py-4 ${left <= 7 ? "border-accent bg-accent-soft" : "border-line bg-soft"}`}>
        <p className="text-[13px] leading-[1.8] text-body">
          このページは<span className="font-bold text-ink">{planUntil(saved)}</span>まで保存されます
          <span className="ml-1 text-muted">（あと{left}日）</span>。その後は自動で削除され、開けなくなります。
        </p>
        <a href={`/planner/p/${saved.id}/text`} download
          className="shrink-0 border border-ink bg-white px-4 py-2 text-[12.5px] font-bold text-ink no-underline transition hover:bg-ink hover:text-white">
          テキストで保存 ↓
        </a>
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-3 border-b border-line pb-5 text-[13px] leading-[1.9] sm:grid-cols-2">
        {plan.profile && (
          <div className="sm:col-span-2">
            <dt className="label">AIが理解した製品</dt>
            <dd className="mt-1 font-bold text-ink">「{plan.profile.summary}」</dd>
          </div>
        )}
        <div>
          <dt className="label">目的</dt>
          <dd className="mt-1.5 flex flex-wrap gap-2">
            {plan.purposes.map((p) => (
              <span key={p.slug} className={`border px-2.5 py-1 text-[12px] font-bold ${p.role === "main" ? "border-ink bg-ink text-white" : "border-ink2 text-ink"}`}>
                <span className="mr-1.5 text-[10px] font-normal opacity-70">{p.role === "main" ? "主" : "副"}</span>{p.label}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className="label">質問</dt>
          <dd className="mt-1 text-body"><span className="num text-[18px] text-ink">{countQuestions(plan)}</span> 問</dd>
        </div>
      </dl>

      <section className="mt-10">
        <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />最初に聞く質問（どの目的でも共通）</p>
        <ol className="mt-3 border-t border-line">
          {plan.common.map(qa)}
        </ol>
        <p className="mt-6 text-[13px] font-bold text-ink">数字が出なかったら、この質問に切り替えます</p>
        <ol className="mt-2 border-t border-line">{qa(plan.numberFallback)}</ol>
      </section>

      {plan.purposes.map((p) => (
        <section key={p.slug} className="mt-14">
          <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />{roleLabel(p)}</p>
          <h2 className="font-display mt-3 text-[24px] leading-[1.4] text-ink sm:text-[28px]">{p.label}のための事例</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-3 border-y border-line py-4 text-[13px] leading-[1.9] sm:grid-cols-2">
            <div><dt className="label">読ませたい相手</dt><dd className="mt-1 text-body">{p.reader}</dd></div>
            <div><dt className="label">読んだ後にしてほしいこと</dt><dd className="mt-1 text-body">{p.goal}</dd></div>
          </dl>

          <h3 className="mt-7 text-[13px] font-bold text-ink">
            顧客への質問{p.role === "sub" && <span className="ml-2 font-normal text-muted">副目的なので、要の2問に絞っています</span>}
          </h3>
          <ol className="mt-3 border-t border-line">
            {p.questions.map(qa)}
          </ol>

          {/* 着地予想 */}
          <div className="mt-6 border-2 border-ink px-5 py-5 sm:px-6">
            <p className="label">着地予想</p>
            <p className="font-display mt-2 text-[18px] leading-[1.6] text-ink">{p.title}</p>
            <ol className="mt-4 border-t border-line">
              {p.sections.map((sec, i) => (
                <li key={sec.h} className="flex gap-3 border-b border-line2 py-2.5">
                  <span className="num shrink-0 text-[14px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[13px] leading-[1.8]">
                    <span className="font-bold text-ink">{sec.h}</span>
                    <span className="ml-2 text-body">{sec.what}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[13px] leading-[1.95] text-body">{p.landing}</p>
            <p className="mt-2 text-[13px] leading-[1.95] text-body">
              <span className="mr-2 font-bold text-ink">数字が出なかった場合</span>{p.noNumber}
            </p>
          </div>
          {!p.dataBacked && (
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              ※この目的の事例は社外に公開されることが少ないため、質問と想定回答は掲載事例の集計ではなく、編集部の取材経験にもとづいています。
            </p>
          )}
        </section>
      ))}

      {plan.evidence && (
        <section className="mt-14">
          <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />近い製品の事例では、成果がこう語られています</p>
          <p className="mt-4 border-t border-line pt-4 text-[13px] leading-[1.95] text-body">{evidenceLine(plan.evidence)}</p>
          <div className="mt-2">
            {plan.evidence.examples.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`} className="block border-b border-line2 py-3 no-underline">
                <span className="block text-[13px] leading-[1.7] text-body hover:text-ink">{c.title}</span>
                {c.stat && <span className="num mt-0.5 block text-[12px] text-accent">{c.stat}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-14 border-t border-ink pt-8">
        <Link href="/produce" className="group block border border-line bg-soft px-5 py-5 no-underline transition hover:border-ink">
          <p className="label">取材から執筆まで任せたい</p>
          <p className="font-display mt-2 text-[16px] text-ink group-hover:text-brand">事例制作代行 →</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">この構成と質問をもとに、取材・構成・執筆まで編集部が代行します。</p>
        </Link>
      </div>
    </div>
  );
}
