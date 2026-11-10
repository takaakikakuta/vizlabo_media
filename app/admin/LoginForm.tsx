import { login } from "./actions";
import { adminConfigured } from "../../lib/admin";

export default function LoginForm({ next, error }: { next: string; error: boolean }) {
  return (
    <div className="mx-auto max-w-sm px-5 py-20">
      <h1 className="font-display text-[22px] text-ink">運営ログイン</h1>
      {!adminConfigured() ? (
        <p className="mt-4 text-[13px] text-body">ADMIN_PASSWORD が未設定です（next.config.ts で焼き込み）。</p>
      ) : (
        <form action={login} className="mt-6 space-y-3">
          <input type="hidden" name="next" value={next} />
          <input type="password" name="password" required autoFocus placeholder="パスワード"
            className="w-full border border-line px-3 py-2 text-[14px]" />
          {error && <p className="text-[12.5px] text-red-600">パスワードが違います。</p>}
          <button className="w-full bg-ink px-4 py-2 text-[14px] font-bold text-white">ログイン</button>
        </form>
      )}
    </div>
  );
}
