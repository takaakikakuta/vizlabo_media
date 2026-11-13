"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { vendorAuth } from "../../app/vendor/actions";
import { initialAuthState } from "../../lib/vendorAuth";

/* ログイン（mode="login"）と招待からの登録（mode="join"）。
   メールアドレスに6桁のコードを送り、それを入力して入る。パスワードは持たない。 */
export default function VendorAuthForm({ mode, invite }: { mode: "login" | "join"; invite?: string }) {
  const [state, action] = useActionState(vendorAuth, initialAuthState);
  const input = "w-full border border-line bg-white px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ink";

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="mode" value={mode} />
      {invite && <input type="hidden" name="invite" value={invite} />}
      <input type="hidden" name="step" value={state.step} />

      {state.step === "email" ? (
        <>
          <label className="block text-[12.5px] font-bold text-ink" htmlFor="vendor-email">
            {mode === "join" ? "登録するメールアドレス" : "メールアドレス"}
          </label>
          <input id="vendor-email" name="email" type="email" required autoComplete="email"
            defaultValue={state.email} className={input} />
          {state.error && <p className="text-[12.5px] leading-relaxed text-red-700">{state.error}</p>}
          <Submit label="ログインコードを送る" />
        </>
      ) : (
        <>
          <input type="hidden" name="email" value={state.email} />
          <p className="text-[13px] leading-relaxed text-body">
            <span className="font-bold text-ink">{state.email}</span> に6桁のコードを送りました。メールに記載のコードを入力してください。
          </p>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={7}
            placeholder="123456" className={`${input} tracking-[.3em]`} autoFocus />
          {state.error && <p className="text-[12.5px] leading-relaxed text-red-700">{state.error}</p>}
          <Submit label={mode === "join" ? "登録する" : "ログイン"} />
          <button name="back" value="1" formNoValidate className="text-[12px] text-muted underline">
            メールアドレスを入力し直す・コードを送り直す
          </button>
        </>
      )}
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="w-full border border-ink bg-ink px-4 py-2.5 text-[14px] font-bold text-white transition hover:bg-white hover:text-ink disabled:opacity-40">
      {pending ? "送信中 …" : label}
    </button>
  );
}
