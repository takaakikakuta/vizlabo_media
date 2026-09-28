"use client";

import { useActionState } from "react";
import { submitSuggest, type SuggestState } from "../app/suggest/actions";

/* 記事内に置く「貴社のURLを入れると、AIが似た事例をメールで届ける」枠。
   メールアドレス獲得の仕掛けを兼ねる（利用は管理者へ通知される）。 */

const initial: SuggestState = { status: "idle" };

export default function SuggestForm({ source = "article" }: { source?: string }) {
  const [state, action, pending] = useActionState(submitSuggest, initial);

  if (state.status === "ok") {
    return (
      <div className="border-2 border-ink bg-soft px-6 py-8 text-center">
        <p className="font-display text-[18px] text-ink">メールをお送りしました</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          貴社に近い事例{state.matched ? `${state.matched}件` : ""}を記載しています。
          数分待っても届かない場合は、迷惑メールフォルダをご確認ください。
        </p>
        {state.subscribed && (
          <p className="mt-2 text-[11.5px] text-muted">メルマガ「週刊 事例マニア」にも登録しました（毎週金曜配信）。</p>
        )}
      </div>
    );
  }

  return (
    <div className="border-2 border-ink px-5 py-6 sm:px-7 sm:py-7">
      <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />貴社に近い事例を、AIが探します</p>
      <p className="mt-3 text-[13.5px] leading-[1.95] text-body">
        会社サイトのURLを入れると、AIが貴社の事業を読み取り、
        掲載事例の中から「同じ業界の事例」と「同じ困りごとを解決した事例」を選んでメールでお届けします（無料・その場で1通だけ）。
      </p>
      <form action={action} className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        {/* ハニーポット */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0" />
        <input type="hidden" name="source" value={source} />
        <input type="text" name="url" required placeholder="会社サイトのURL（example.co.jp）"
          className="min-w-0 flex-1 border border-ink bg-white px-4 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-muted" />
        <input type="email" name="email" required placeholder="受け取るメールアドレス"
          className="min-w-0 flex-1 border border-ink bg-white px-4 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-muted" />
        <button type="submit" disabled={pending}
          className="shrink-0 border border-ink bg-ink px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-white hover:text-ink disabled:opacity-60">
          {pending ? "AIが読んでいます…" : "事例を受け取る"}
        </button>
        <label className="flex cursor-pointer items-start gap-2 sm:order-last sm:basis-full">
          <input type="checkbox" name="newsletter" defaultChecked
            className="mt-0.75 h-3.5 w-3.5 shrink-0 accent-ink" />
          <span className="text-[12px] leading-relaxed text-body">
            メルマガ「週刊 事例マニア」にも登録する（毎週金曜・事例セレクション5本、いつでも解除できます）
          </span>
        </label>
      </form>
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        {pending
          ? "貴社サイトの読み取りと事例の選定に10秒ほどかかります。このままお待ちください。"
          : "※いただいたアドレスに営業の電話やメールを繰り返すことはありません。"}
      </p>
      {state.status === "error" && (
        <p className="mt-2 text-[12px] font-bold text-accent">{state.error}</p>
      )}
    </div>
  );
}
