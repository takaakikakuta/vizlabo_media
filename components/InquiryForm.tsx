"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { INQUIRY_FIELD_LABEL, initialInquiryState, type InquiryInput } from "../lib/inquiry";
import { submitInquiry } from "../app/inquiry/actions";

export type InquiryService = { label: string; category: string };

/* 記事に登場したサービスへの一括問い合わせフォーム。
   サービスはチェックボックス（初期状態は全選択）。送信は Server Action（app/inquiry/actions.ts）、
   メール送信・取次は lib/notify.ts に閉じてある（未実装のあいだはログのみ）。 */
export default function InquiryForm({ services, articleSlug }: {
  services: InquiryService[]; articleSlug: string;
}) {
  const [state, action] = useActionState(submitInquiry, initialInquiryState);

  if (state.status === "ok") {
    return (
      <div className="border-y-2 border-ink py-14 text-center">
        <p className="label">送信完了</p>
        <h2 className="font-display mt-4 text-[24px] leading-[1.5] text-ink">
          まとめて問い合わせを受け付けました
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-[13.5px] leading-[2] text-body">
          編集部で内容を確認のうえ、選択されたサービスの提供企業へお取り次ぎします。
          各社からの連絡は、ご入力のメールアドレスに届きます。
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
  const checked = new Set(v.services ?? services.map((s) => s.label));

  return (
    <form action={action} noValidate className="border-t border-ink">
      {state.formError && (
        <p role="alert" className="mt-6 border border-ink bg-soft px-4 py-3 text-[13px] text-ink">
          {state.formError}
        </p>
      )}

      <input type="hidden" name="articleSlug" value={articleSlug} />

      <Field name="services" required error={err.services}
        hint="外したいサービスはチェックを外してください">
        <div className="border border-line">
          {services.map((s) => (
            <label key={s.label}
              className="flex cursor-pointer items-baseline gap-3 border-b border-line2 px-4 py-3 last:border-b-0">
              <input type="checkbox" name="services" value={s.label}
                defaultChecked={checked.has(s.label)}
                className="translate-y-0.5 accent-[#1a1a1a]" />
              <span className="text-[14px] text-ink">{s.label}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted">{s.category}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field name="company" required error={err.company}>
        <Input name="company" defaultValue={v.company} autoComplete="organization" placeholder="株式会社〇〇" />
      </Field>

      <Field name="name" required error={err.name}>
        <Input name="name" defaultValue={v.name} autoComplete="name" placeholder="山田 太郎" />
      </Field>

      <Field name="email" required error={err.email}>
        <Input name="email" type="email" defaultValue={v.email} autoComplete="email" placeholder="you@example.co.jp" />
      </Field>

      <Field name="tel" error={err.tel} hint="任意">
        <Input name="tel" type="tel" defaultValue={v.tel} autoComplete="tel" placeholder="03-1234-5678" />
      </Field>

      <Field name="message" error={err.message}
        hint="任意。検討の背景、確認したいこと、比較中のサービスなど">
        <textarea name="message" id="message" rows={5} defaultValue={v.message}
          className="w-full border border-line bg-white px-3.5 py-2.5 text-[14px] leading-[1.9] text-ink outline-none focus:border-ink"
          placeholder="紙の請求書処理の電子化を検討しています。自社は従業員50名の建設業で……" />
      </Field>

      {/* ハニーポット: 人間には見えない。ボットが埋めたら破棄する */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-6 py-8">
        <Submit />
        <p className="text-[11.5px] leading-relaxed text-muted">
          入力内容と連絡先は、選択されたサービスの提供企業への取次にのみ使用します。
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
      {pending ? "送信中 …" : "選択したサービスにまとめて問い合わせる"}
    </button>
  );
}

function Field({ name, required, error, hint, children }: {
  name: keyof InquiryInput; required?: boolean; error?: string; hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-line2 py-5 sm:grid-cols-[190px_1fr] sm:gap-6">
      <label htmlFor={name} className="flex items-baseline gap-2 pt-2.5">
        <span className="text-[13.5px] font-bold text-ink">{INQUIRY_FIELD_LABEL[name]}</span>
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
