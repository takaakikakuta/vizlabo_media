"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { applyVendor } from "../../app/vendor/actions";
import { initialApplyState } from "../../lib/vendorAuth";

export default function ApplyForm() {
  const [state, action] = useActionState(applyVendor, initialApplyState);
  const input = "mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ink";
  const label = "block text-[12.5px] font-bold text-ink";

  if (state.status === "ok") {
    return (
      <div className="border-y-2 border-ink py-8 text-center">
        <p className="font-display text-[18px] text-ink">お申し込みを受け付けました</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          確認のうえ、ご入力のメールアドレスにご連絡します。
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="apply-website">Website</label>
        <input id="apply-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div><label className={label} htmlFor="apply-company">会社名</label>
        <input id="apply-company" name="company" required autoComplete="organization" className={input} /></div>
      <div><label className={label} htmlFor="apply-person">お名前</label>
        <input id="apply-person" name="person" required autoComplete="name" className={input} /></div>
      <div><label className={label} htmlFor="apply-email">メールアドレス（会社のアドレス）</label>
        <input id="apply-email" name="email" type="email" required autoComplete="email" className={input} /></div>
      <div><label className={label} htmlFor="apply-site">事例を掲載している自社サイトのURL</label>
        <input id="apply-site" name="site" required placeholder="https://www.example.co.jp/case/" className={input} /></div>
      <div><label className={label} htmlFor="apply-note">備考（任意）</label>
        <textarea id="apply-note" name="note" rows={3} className={input} /></div>
      {state.error && <p className="text-[12.5px] leading-relaxed text-red-700">{state.error}</p>}
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="w-full border border-ink bg-ink px-4 py-2.5 text-[14px] font-bold text-white transition hover:bg-white hover:text-ink disabled:opacity-40">
      {pending ? "送信中 …" : "申し込む"}
    </button>
  );
}
