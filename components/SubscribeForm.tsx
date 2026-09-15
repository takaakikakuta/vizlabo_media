"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { initialSubscribeState } from "../lib/newsletter";
import { subscribe } from "../app/newsletter/actions";

/* メルマガ購読フォーム。
   variant="inline" … フッターなどに置く1行タイプ
   variant="hero"   … /newsletter のメインフォーム
   購読リストへの保存は lib/notify.ts の notifySubscribe に閉じてある（実装差し替えは1箇所）。 */
export default function SubscribeForm({ variant = "inline", source }:
  { variant?: "inline" | "hero"; source: string }) {
  const [state, action] = useActionState(subscribe, initialSubscribeState);

  if (state.status === "ok") {
    return (
      <div className={variant === "hero"
        ? "border-y-2 border-ink py-8 text-center"
        : "border border-line bg-white px-4 py-3"}>
        <p className={`font-display text-ink ${variant === "hero" ? "text-[18px]" : "text-[13.5px]"}`}>
          登録を受け付けました
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
          次号から、ご入力のメールアドレスへお届けします。
        </p>
      </div>
    );
  }

  const big = variant === "hero";
  return (
    <form action={action} noValidate>
      <input type="hidden" name="source" value={source} />
      {/* ハニーポット */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`website-${source}`}>Website</label>
        <input id={`website-${source}`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={`flex ${big ? "flex-col gap-3 sm:flex-row" : "gap-2"}`}>
        <input
          type="email" name="email" defaultValue={state.email}
          autoComplete="email" placeholder="you@example.co.jp"
          aria-label="メールアドレス"
          className={`min-w-0 flex-1 border border-line bg-white text-ink outline-none focus:border-ink ${
            big ? "px-4 py-3 text-[14px]" : "px-3 py-2 text-[12.5px]"}`} />
        <Submit big={big} />
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-[11.5px] font-bold text-ink">{state.error}</p>
      )}
      <p className={`mt-2 text-muted ${big ? "text-[11.5px]" : "text-[10.5px]"} leading-relaxed`}>
        購読はいつでも解除できます。メールアドレスは配信以外に使用しません。
      </p>
    </form>
  );
}

function Submit({ big }: { big: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className={`shrink-0 border border-ink bg-ink font-bold whitespace-nowrap text-white transition hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 ${
        big ? "px-7 py-3 text-[14px]" : "px-3.5 py-2 text-[12px]"}`}>
      {pending ? "登録中 …" : "購読する"}
    </button>
  );
}
