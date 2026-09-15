"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { TOPICS, FIELD_LABEL, initialContactState, type ContactInput } from "../lib/contact";
import { submitContact } from "../app/contact/actions";

/* 掲載・制作・修正依頼の受付フォーム。
   送信は Server Action（app/contact/actions.ts）。メール送信はその先の lib/notify.ts に閉じてある。 */
export default function ContactForm({ topic }: { topic?: string }) {
  const [state, action] = useActionState(submitContact, initialContactState);

  if (state.status === "ok") {
    return (
      <div className="border-y-2 border-ink py-14 text-center">
        <p className="label">送信完了</p>
        <h2 className="font-display mt-4 text-[24px] leading-[1.5] text-ink">
          お問い合わせを受け付けました
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-[13.5px] leading-[2] text-body">
          内容を確認のうえ、通常2〜3営業日以内にご入力のメールアドレスへご連絡します。
        </p>
        <Link href="/cases"
          className="mt-9 inline-block border border-ink bg-ink px-6 py-3 text-[14px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
          掲載中の事例を見る
        </Link>
      </div>
    );
  }

  const v = state.values ?? {};
  const err = state.errors ?? {};

  return (
    <form action={action} noValidate className="border-t border-ink">
      {state.formError && (
        <p role="alert" className="mt-6 border border-ink bg-soft px-4 py-3 text-[13px] text-ink">
          {state.formError}
        </p>
      )}

      <Field name="topic" required error={err.topic}>
        <select name="topic" id="topic" defaultValue={v.topic ?? topic ?? "publish"}
          className="w-full appearance-none border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink">
          {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>

      <Field name="company" required error={err.company}>
        <Input name="company" defaultValue={v.company} autoComplete="organization" placeholder="株式会社〇〇" />
      </Field>

      <Field name="name" required error={err.name}>
        <Input name="name" defaultValue={v.name} autoComplete="name" placeholder="山田 太郎" />
      </Field>

      <Field name="dept" error={err.dept} hint="任意">
        <Input name="dept" defaultValue={v.dept} autoComplete="organization-title" placeholder="マーケティング部 / 課長" />
      </Field>

      <Field name="email" required error={err.email}>
        <Input name="email" type="email" defaultValue={v.email} autoComplete="email" placeholder="you@example.co.jp" />
      </Field>

      <Field name="tel" error={err.tel} hint="任意">
        <Input name="tel" type="tel" defaultValue={v.tel} autoComplete="tel" placeholder="03-1234-5678" />
      </Field>

      <Field name="caseUrl" error={err.caseUrl}
        hint="掲載してほしい事例ページ、修正・削除をご希望のページのURL">
        <Input name="caseUrl" type="url" defaultValue={v.caseUrl} placeholder="https://example.co.jp/case/001" />
      </Field>

      <Field name="message" required error={err.message}
        hint="掲載したい事例の概要、ご希望、期日などをご記入ください">
        <textarea name="message" id="message" rows={7} defaultValue={v.message}
          className="w-full border border-line bg-white px-3.5 py-2.5 text-[14px] leading-[1.9] text-ink outline-none focus:border-ink"
          placeholder="自社サイトに掲載している導入事例（3本）を掲載していただきたく、ご連絡しました。" />
      </Field>

      {/* ハニーポット: 人間には見えない。ボットが埋めたら破棄する */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-6 py-8">
        <Submit />
        <p className="text-[11.5px] leading-relaxed text-muted">
          いただいた個人情報は、お問い合わせへの回答にのみ使用します。
        </p>
      </div>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="border border-ink bg-ink px-8 py-3 text-[14px] font-bold text-white transition hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-40">
      {pending ? "送信中 …" : "この内容で送信する"}
    </button>
  );
}

/* 1項目＝罫で仕切った1行。ラベルは左、入力は右（狭い画面では縦積み）。 */
function Field({ name, required, error, hint, children }: {
  name: keyof ContactInput; required?: boolean; error?: string; hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-line2 py-5 sm:grid-cols-[190px_1fr] sm:gap-6">
      <label htmlFor={name} className="flex items-baseline gap-2 pt-2.5">
        <span className="text-[13.5px] font-bold text-ink">{FIELD_LABEL[name]}</span>
        {required
          ? <span className="text-[10px] font-bold tracking-wider text-accent">必須</span>
          : <span className="text-[10px] tracking-wider text-muted">任意</span>}
      </label>
      <div>
        {children}
        {hint && !error && <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{hint}</p>}
        {error && <p role="alert" className="mt-2 text-[11.5px] font-bold text-ink">{error}</p>}
      </div>
    </div>
  );
}

function Input({ name, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  return (
    <input id={name} name={name} {...rest}
      className="w-full border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink" />
  );
}
