"use client";

import { useActionState } from "react";
import { submitPlanner, type PlannerState } from "../app/planner/actions";

/* 事例プランナーの結果画面に置く、「製品に合わせた質問リスト」の受け取りフォーム。
   選んだ目的（主目的 m・副目的 s）は hidden で引き継ぐ。 */

const initial: PlannerState = { status: "idle" };

export default function PlannerMailForm({ main, subs, total }: { main: string; subs: string[]; total: number }) {
  const [state, action, pending] = useActionState(submitPlanner, initial);

  if (state.status === "ok") {
    return (
      <div className="border-2 border-ink bg-soft px-6 py-8 text-center">
        <p className="font-display text-[18px] text-ink">メールをお送りしました</p>
        {state.customized && state.summary && (
          <p className="mt-3 text-[13px] leading-relaxed text-body">
            AIは製品を<span className="font-bold text-ink">「{state.summary}」</span>と理解しました。
          </p>
        )}
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          {state.customized
            ? `質問${state.questions ?? ""}問と想定回答を、この製品に合わせて書き直しました。`
            : "製品ページをうまく読み取れなかったため、製品を問わない標準の質問リストをご用意しました。"}
          {state.until
            ? "メールに、あなた専用のページへのリンクを記載しています。"
            : "全文をメールに記載しています。"}
          数分待っても届かない場合は、迷惑メールフォルダをご確認ください。
        </p>
        {state.until && (
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink">
            専用ページは<span className="font-bold">{state.until}</span>まで保存されます。その後は自動で削除されます。
          </p>
        )}
        {state.subscribed && (
          <p className="mt-2 text-[11.5px] text-muted">メルマガ「週刊 事例マニア」にも登録しました（毎週土曜配信）。</p>
        )}
      </div>
    );
  }

  return (
    <div className="border-2 border-ink px-5 py-6 sm:px-7 sm:py-7">
      <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />自社の製品に合わせる</p>
      <h2 className="font-display mt-3 text-[20px] leading-[1.5] text-ink sm:text-[23px]">製品ページのURLを入れると、質問がその製品向けに変わります</h2>
      <p className="mt-3 text-[13.5px] leading-[1.95] text-body">
        AIが製品ページを読み、上の質問{total}問を、その製品が使われる業務の言葉に書き直します。
        すべての質問に、想定される回答と深掘りのしかた、着地する事例のタイトルと構成、近い製品の掲載事例、顧客に断られたときの返し方をまとめた専用ページをご用意し、リンクをメールでお送りします（無料）。
      </p>
      <p className="mt-2 text-[12.5px] leading-[1.9] text-body">
        専用ページは<span className="font-bold text-ink">30日間</span>保存され、ログインなしでいつでも開けます。期限を過ぎると自動で削除されます。
      </p>
      <form action={action} className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        {/* ハニーポット */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0" />
        <input type="hidden" name="m" value={main} />
        {subs.map((g) => <input key={g} type="hidden" name="s" value={g} />)}
        <input type="text" name="url" required placeholder="製品ページのURL（example.co.jp/product）"
          className="min-w-0 flex-1 border border-ink bg-white px-4 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-muted" />
        <input type="email" name="email" required placeholder="受け取るメールアドレス" autoComplete="email"
          className="min-w-0 flex-1 border border-ink bg-white px-4 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-muted" />
        <button type="submit" disabled={pending}
          className="shrink-0 border border-ink bg-ink px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-white hover:text-ink disabled:opacity-60">
          {pending ? "AIが読んでいます…" : "メールで受け取る"}
        </button>
        <label className="flex cursor-pointer items-start gap-2 sm:order-last sm:basis-full">
          <input type="checkbox" name="newsletter" defaultChecked className="mt-0.75 h-3.5 w-3.5 shrink-0 accent-ink" />
          <span className="text-[12px] leading-relaxed text-body">
            メルマガ「週刊 事例マニア」にも登録する（毎週土曜・事例セレクション5本、いつでも解除できます）
          </span>
        </label>
      </form>
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        {pending
          ? "製品ページの読み取りと質問の書き直しに30秒ほどかかります。このままお待ちください。"
          : "※いただいたアドレスに営業の電話やメールを繰り返すことはありません。"}
      </p>
      {state.status === "error" && (
        <p className="mt-2 text-[12px] font-bold text-accent">{state.error}</p>
      )}
    </div>
  );
}
