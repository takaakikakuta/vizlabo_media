import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "../../../lib/admin";
import {
  accountsConfigured, isLiveInvite, isPaid, listAccounts, listApplications, listInvites, listUsers, normDomain, FREE_DAYS, INVITE_DAYS,
} from "../../../lib/accounts";
import { inviteUrl } from "../../../lib/vendorAuth";
import LoginForm from "../LoginForm";
import {
  approveApplication, cancelInvite, issueInvite, rejectApplication, setPaidUntil, setUserStatus,
} from "../actions";

/* 運営用: ベンダー会員の管理。申し込みの承認、招待の発行（掲載連絡の返信に貼る）、登録者の停止、有料期限の設定。 */

export const dynamic = "force-dynamic";

const box = "mt-3 border border-line px-4 py-4";
const input = "border border-line bg-white px-2.5 py-1.5 text-[13px] text-ink";
const btn = "border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-bold text-white";
const btnSub = "border border-line px-3 py-1.5 text-[12.5px] text-body";
const fmt = (sec: number) => new Date(sec * 1000 + 9 * 3600_000).toISOString().slice(0, 10);

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string; issued?: string }>;
}) {
  const sp = await searchParams;
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return <LoginForm next="/admin/vendors" error={sp.error === "1"} />;
  }
  if (!accountsConfigured()) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10 text-[13px] text-body">
        会員テーブル（ACCOUNTS_TABLE）か VENDOR_SECRET か AWS キーが未設定です。
      </div>
    );
  }

  const [apps, invites, users, accounts] = await Promise.all([listApplications(), listInvites(), listUsers(), listAccounts()]);
  const pending = apps.filter((a) => a.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const liveInvites = invites.filter(isLiveInvite).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const issued = sp.issued ? invites.find((i) => i.code === sp.issued) : undefined;
  const paidAccounts = accounts.filter((a) => a.paidUntil).sort((a, b) => a.domain.localeCompare(b.domain));
  users.sort((a, b) => a.domain.localeCompare(b.domain) || a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[24px] text-ink">ベンダー会員</h1>
        <Link href="/admin/views" className="text-[12.5px]">閲覧数 →</Link>
      </div>

      {sp.error && sp.error !== "1" && <p className="mt-4 border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-700">{sp.error}</p>}
      {sp.done && <p className="mt-4 border border-accent/30 bg-accent-soft px-3 py-2 text-[13px] text-ink">{sp.done}</p>}

      {/* 招待の発行 */}
      <h2 className="mt-8 text-[15px] font-bold text-ink">招待を発行する</h2>
      <div className={box}>
        <form action={issueInvite} className="flex flex-wrap items-center gap-2">
          <input name="domain" required placeholder="提供元ドメイン（例: example.co.jp）" className={`${input} min-w-0 flex-1`} />
          <button className={btn}>発行</button>
        </form>
        <p className="mt-2 text-[11.5px] text-muted">
          掲載連絡に返信が来たら、ここで発行した URL を返信に貼る。{INVITE_DAYS}日有効。最初に登録した人がその会社の管理者になり、同僚を招待できる。
        </p>
        {issued && (
          <div className="mt-4 border border-brand/30 bg-brand-soft px-3 py-3 text-[12.5px] leading-[1.9] text-ink">
            <p className="font-bold">{issued.domain} の招待を発行しました。返信用の文面:</p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-[12.5px] text-body">{[
              "事例マニアでは、掲載している御社の事例がどれだけ読まれ、御社サイトへ何人を送ったかを",
              "ご覧いただけるベンダー向けページをご用意しています（直近" + FREE_DAYS + "日分は無料）。",
              "下記からご登録いただけます。",
              "",
              inviteUrl(issued.code),
              "",
              "URL が開けない場合は、https://vizlabo.com/vendor/join で招待コード「" + issued.code + "」を入力してください。",
              "（有効期限: " + fmt(issued.exp) + "）",
            ].join("\n")}</pre>
          </div>
        )}
      </div>

      {/* 申し込み */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">承認待ちの申し込み（{pending.length}）</h2>
      {pending.length === 0 && <p className="mt-2 text-[13px] text-muted">ありません。</p>}
      {pending.map((a) => (
        <div key={a.email} className={box}>
          <p className="text-[13.5px] font-bold text-ink">{a.company}　<span className="font-normal text-body">{a.person}</span></p>
          <p className="mt-1 text-[12.5px] text-body">{a.email}・<a href={a.site} target="_blank" rel="noopener">{a.site}</a>・{a.createdAt.slice(0, 10)}</p>
          {a.note && <p className="mt-1 text-[12.5px] text-muted">{a.note}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <form action={approveApplication} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="email" value={a.email} />
              <input name="domain" defaultValue={a.domain || normDomain(a.site)} className={input} aria-label="紐づける提供元ドメイン" />
              <button className={btn}>このドメインで承認</button>
            </form>
            <form action={rejectApplication}>
              <input type="hidden" name="email" value={a.email} />
              <button className={btnSub}>却下</button>
            </form>
          </div>
        </div>
      ))}

      {/* 登録者 */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">登録者（{users.length}）</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[12.5px]">
          <thead className="border-b border-ink text-[11px] text-muted">
            <tr><th className="py-1.5">提供元</th><th>メール</th><th>役割</th><th>登録日</th><th>経路</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email} className={`border-b border-line2 ${u.status === "disabled" ? "text-muted line-through" : "text-body"}`}>
                <td className="py-1.5">{u.domain}</td><td>{u.email}</td><td>{u.role === "owner" ? "管理者" : "メンバー"}</td>
                <td>{u.createdAt.slice(0, 10)}</td><td>{{ invite: "招待", apply: "申込", admin: "運営" }[u.via]}</td>
                <td className="text-right">
                  <form action={setUserStatus}>
                    <input type="hidden" name="email" value={u.email} />
                    <input type="hidden" name="status" value={u.status === "active" ? "disabled" : "active"} />
                    <button className="text-[11.5px] underline">{u.status === "active" ? "停止" : "再開"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 有料 */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">有料プラン</h2>
      <div className={box}>
        <form action={setPaidUntil} className="flex flex-wrap items-center gap-2">
          <input name="domain" required placeholder="提供元ドメイン" className={`${input} min-w-0 flex-1`} />
          <input name="paidUntil" type="date" className={input} aria-label="有料の期限" />
          <button className={btn}>設定</button>
        </form>
        <p className="mt-2 text-[11.5px] text-muted">期限の日まで、直近{FREE_DAYS}日より前（最大90日）も見られる。期限を空にして設定すると無料に戻す。</p>
        {paidAccounts.length > 0 && (
          <ul className="mt-3 space-y-1 text-[12.5px] text-body">
            {paidAccounts.map((a) => (
              <li key={a.domain}>{a.domain}：{a.paidUntil} まで{isPaid(a) ? "" : "（期限切れ）"}</li>
            ))}
          </ul>
        )}
      </div>

      {/* 有効な招待 */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">有効な招待（{liveInvites.length}）</h2>
      <ul className="mt-3 text-[12.5px]">
        {liveInvites.map((i) => (
          <li key={i.code} className="flex flex-wrap items-baseline gap-3 border-b border-line2 py-1.5 text-body">
            <span className="font-bold tabular-nums text-ink">{i.code}</span>
            <span className="flex-1">{i.domain}</span>
            <span className="text-muted">{fmt(i.exp)} まで・利用 {i.uses}</span>
            <form action={cancelInvite}>
              <input type="hidden" name="code" value={i.code} />
              <button className="text-[11.5px] underline">取り消す</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
