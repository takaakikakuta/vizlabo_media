import Link from "next/link";
import { accountsConfigured, getValidInvite, normInviteCode } from "../../../lib/accounts";
import VendorAuthForm from "../../../components/vendor/VendorAuthForm";

/* 招待からの登録。運営が掲載連絡の返信などで送る URL（?code=XXXX-XXXX）か、コードの手入力で入る。
   URL を受け付けない問い合わせフォーム向けに、コードだけでも入れるようにしてある。 */

export const dynamic = "force-dynamic";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code: raw } = await searchParams;
  const code = raw ? normInviteCode(raw) : "";
  const inv = code && accountsConfigured() ? await getValidInvite(code) : null;

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="label">ベンダー向け</p>
      <h1 className="font-display mt-2 text-[24px] leading-snug text-ink">招待から登録する</h1>

      {inv ? (
        <>
          <p className="mt-4 text-[13.5px] leading-[1.9] text-body">
            <span className="font-bold text-ink">{inv.domain}</span> の事例を見られるアカウントを作ります。
            ご登録のメールアドレスに届くコードで、毎回ログインします（パスワードは不要です）。
          </p>
          <div className="mt-8"><VendorAuthForm mode="join" invite={inv.code} /></div>
        </>
      ) : (
        <>
          {code && <p className="mt-4 text-[13px] text-red-700">招待コードが無効か、有効期限（発行から60日）が切れています。</p>}
          <form method="get" className="mt-6 space-y-3">
            <label htmlFor="join-code" className="block text-[12.5px] font-bold text-ink">招待コード（例: ABCD-2345）</label>
            <input id="join-code" name="code" required defaultValue={raw}
              className="w-full border border-line bg-white px-3 py-2.5 text-[15px] uppercase tracking-[.15em] text-ink outline-none focus:border-ink" />
            <button className="w-full border border-ink bg-ink px-4 py-2.5 text-[14px] font-bold text-white">次へ</button>
          </form>
        </>
      )}
      <p className="mt-10 border-t border-line pt-6 text-[13px] text-body">
        登録済みの方は <Link href="/vendor">ログイン</Link>
      </p>
    </div>
  );
}
