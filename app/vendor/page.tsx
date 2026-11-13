import Link from "next/link";
import { cookies } from "next/headers";
import {
  accountsConfigured, getAccount, isPaid, userFromSession, FREE_DAYS, VENDOR_COOKIE,
} from "../../lib/accounts";
import VendorAuthForm from "../../components/vendor/VendorAuthForm";
import Dashboard from "./Dashboard";

/* ベンダー（提供元）向けページ。ログイン前はログイン画面、ログイン後は自社の事例の閲覧数・送客数。
   無料は直近 FREE_DAYS 日、有料（運営が /admin/vendors で期限を設定）は90日まで。 */

export const dynamic = "force-dynamic";

export default async function VendorPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await userFromSession((await cookies()).get(VENDOR_COOKIE)?.value);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <p className="label">ベンダー向け</p>
        <h1 className="font-display mt-2 text-[24px] leading-snug text-ink">自社の事例の閲覧数を見る</h1>
        <p className="mt-4 text-[13.5px] leading-[1.9] text-body">
          事例マニアに掲載している御社の事例が、どれだけ読まれ、御社サイトへ何人を送ったかをご覧いただけます。
        </p>
        <div className="mt-8">
          {accountsConfigured()
            ? <VendorAuthForm mode="login" />
            : <p className="text-[13px] text-muted">現在ご利用いただけません。</p>}
        </div>
        <div className="mt-10 space-y-2 border-t border-line pt-6 text-[13px] leading-relaxed text-body">
          <p>招待コードをお持ちの方は <Link href="/vendor/join">招待コードを入力</Link></p>
          <p>はじめての方は <Link href="/vendor/apply">利用を申し込む</Link>（確認のうえご連絡します）</p>
        </div>
      </div>
    );
  }

  const account = await getAccount(user.domain);
  const paid = isPaid(account);
  const periods = paid ? [FREE_DAYS, 30, 90] : [FREE_DAYS];
  const { days: q } = await searchParams;
  const days = periods.find((p) => String(p) === q) ?? FREE_DAYS;
  return <Dashboard user={user} account={account} paid={paid} periods={periods} days={days} />;
}
