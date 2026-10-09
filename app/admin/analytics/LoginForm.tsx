"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

/* 管理ダッシュボードのログイン（パスワード1つ）。 */
export default function LoginForm({ back }: { back: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mx-auto mt-16 max-w-sm border-2 border-ink px-6 py-7">
      <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />管理者ログイン</p>
      <input type="hidden" name="back" value={back} />
      <input type="password" name="password" required autoFocus placeholder="パスワード" autoComplete="current-password"
        className="mt-4 w-full border border-ink bg-white px-4 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-muted" />
      {state.error && <p className="mt-2 text-[12px] text-[#b4321f]">{state.error}</p>}
      <button type="submit" disabled={pending}
        className="mt-4 w-full border border-ink bg-ink px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-white hover:text-ink disabled:opacity-60">
        {pending ? "確認中…" : "ログイン"}
      </button>
    </form>
  );
}
