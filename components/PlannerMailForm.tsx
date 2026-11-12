"use client";

import { useActionState } from "react";
import { submitPlanner, type PlannerState } from "../app/planner/actions";

/* 事例プランナーの結果画面に置く、質問リスト全文の受け取りフォーム。
   回答（目的・業種・成果・数字の見込み）は hidden で引き継ぐ。 */

const initial: PlannerState = { status: "idle" };

export default function PlannerMailForm({ purposes, industry, challenge, num, total }: {
  purposes: string[]; industry: string; challenge: string; num: string; total: number;
}) {
  const [state, action, pending] = useActionState(submitPlanner, initial);

  if (state.status === "ok") {
    return (
      <div className="border-2 border-ink bg-soft px-6 py-8 text-center">
        <p className="font-display text-[18px] text-ink">メールをお送りしました</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          質問{state.questions ? `${state.questions}問` : ""}と想定回答、着地予想を記載しています。
          数分待っても届かない場合は、迷惑メールフォルダをご確認ください。
        </p>
        {state.subscribed && (
          <p className="mt-2 text-[11.5px] text-muted">メルマガ「週刊 事例マニア」にも登録しました（毎週土曜配信）。</p>
        )}
      </div>
    );
  }

  return (
    <div className="border-2 border-ink px-5 py-6 sm:px-7 sm:py-7">
      <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />質問リストの全文を受け取る</p>
      <p className="mt-3 text-[13.5px] leading-[1.95] text-body">
        質問{total}問のすべてに、想定される回答と使いどころを付けてメールでお送りします。
        数字が出なかった場合の切り替え方と、着地する事例のタイトル・構成も入っています（無料・1通だけ）。
      </p>
      <form action={action} className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        {/* ハニーポット */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0" />
        {purposes.map((g) => <input key={g} type="hidden" name="g" value={g} />)}
        <input type="hidden" name="ind" value={industry} />
        <input type="hidden" name="ch" value={challenge} />
        <input type="hidden" name="num" value={num} />
        <input type="text" name="company" placeholder="会社名（任意）" autoComplete="organization"
          className="min-w-0 flex-1 border border-ink bg-white px-4 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-muted" />
        <input type="email" name="email" required placeholder="受け取るメールアドレス" autoComplete="email"
          className="min-w-0 flex-1 border border-ink bg-white px-4 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-muted" />
        <button type="submit" disabled={pending}
          className="shrink-0 border border-ink bg-ink px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-white hover:text-ink disabled:opacity-60">
          {pending ? "送信しています…" : "メールで受け取る"}
        </button>
        <label className="flex cursor-pointer items-start gap-2 sm:order-last sm:basis-full">
          <input type="checkbox" name="newsletter" defaultChecked className="mt-0.75 h-3.5 w-3.5 shrink-0 accent-ink" />
          <span className="text-[12px] leading-relaxed text-body">
            メルマガ「週刊 事例マニア」にも登録する（毎週土曜・事例セレクション5本、いつでも解除できます）
          </span>
        </label>
      </form>
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        ※いただいたアドレスに営業の電話やメールを繰り返すことはありません。
      </p>
      {state.status === "error" && (
        <p className="mt-2 text-[12px] font-bold text-accent">{state.error}</p>
      )}
    </div>
  );
}
