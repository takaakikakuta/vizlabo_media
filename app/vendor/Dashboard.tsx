import Link from "next/link";
import type { Account, VendorUser } from "../../lib/accounts";
import { FREE_DAYS } from "../../lib/accounts";
import { loadViews, jstDay } from "../../lib/views";
import { vendorCases } from "../../lib/cases";
import TeamInvite from "../../components/vendor/TeamInvite";
import { vendorLogout } from "./actions";

type Row = { id: string; title: string; href: string; external: boolean; views: number; clicks: number };

export default async function Dashboard({ user, account, paid, periods, days }: {
  user: VendorUser; account: Account; paid: boolean; periods: number[]; days: number;
}) {
  const [rows, cases] = [await loadViews(days, user.domain), vendorCases(user.domain)];

  const byCase = new Map<string, { views: number; clicks: number }>();
  const byDay = new Map<string, { views: number; clicks: number }>();
  for (const r of rows) {
    const c = byCase.get(r.caseId) ?? { views: 0, clicks: 0 };
    c.views += r.views; c.clicks += r.clicks;
    byCase.set(r.caseId, c);
    const d = byDay.get(r.day) ?? { views: 0, clicks: 0 };
    d.views += r.views; d.clicks += r.clicks;
    byDay.set(r.day, d);
  }
  const list: Row[] = cases.map((c) => ({
    id: c.id,
    title: c.title,
    href: c.linkOnly ? c.sourceUrl : `/cases/${c.id}`,
    external: Boolean(c.linkOnly),
    views: byCase.get(c.id)?.views ?? 0,
    clicks: byCase.get(c.id)?.clicks ?? 0,
  })).sort((a, b) => b.views - a.views || b.clicks - a.clicks || a.title.localeCompare(b.title));
  const totalViews = list.reduce((s, r) => s + r.views, 0);
  const totalClicks = list.reduce((s, r) => s + r.clicks, 0);
  const dayList = Array.from({ length: days }, (_, i) => jstDay(days - 1 - i));
  const maxDay = Math.max(1, ...dayList.map((d) => byDay.get(d)?.views ?? 0));

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label">ベンダー向け</p>
          <h1 className="font-display mt-1 text-[24px] text-ink">{user.domain} の事例</h1>
          <p className="mt-1 text-[12px] text-muted">
            {user.email}（{user.role === "owner" ? "管理者" : "メンバー"}）・{paid ? `有料プラン（${account.paidUntil} まで）` : "無料プラン"}
          </p>
        </div>
        <form action={vendorLogout}><button className="text-[12px] text-muted underline">ログアウト</button></form>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-[13px]">
        {periods.map((p) => (
          <Link key={p} href={`/vendor?days=${p}`}
            className={`border px-3 py-1 no-underline ${p === days ? "border-ink bg-ink text-white" : "border-line text-body"}`}>
            直近{p}日
          </Link>
        ))}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
        {([["掲載中の事例", cases.length], ["閲覧数", totalViews], ["送客数", totalClicks]] as const).map(([k, v]) => (
          <div key={k} className="border border-line px-2 py-3">
            <dt className="text-[11px] text-muted">{k}</dt>
            <dd className="mt-1 text-[22px] font-bold tabular-nums text-ink">{v.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
        送客＝事例ページなどで「元の事例を読む」が押され、御社サイトの事例ページへ移動した回数です。
        御社の解析ツールでは utm_source=jirei-mania として記録されます。
      </p>

      <div className="mt-6 flex h-20 items-end gap-px border-b border-line" aria-label="日別の閲覧数">
        {dayList.map((d) => {
          const v = byDay.get(d) ?? { views: 0, clicks: 0 };
          return <div key={d} title={`${d}: 閲覧 ${v.views} / 送客 ${v.clicks}`} className="flex-1 bg-brand/70"
            style={{ height: `${(v.views / maxDay) * 100}%`, minHeight: v.views ? 2 : 0 }} />;
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{dayList[0]}</span><span>{dayList[dayList.length - 1]}</span>
      </div>

      {!paid && (
        <div className="mt-6 border border-brand/30 bg-brand-soft px-4 py-3 text-[12.5px] leading-relaxed text-body">
          無料プランでは直近{FREE_DAYS}日分をご覧いただけます。それより前の推移（最大90日）は有料プランでご覧いただけます。
          <Link href="/contact" className="ml-1 font-bold">有料プランのお問い合わせ</Link>
        </div>
      )}

      <div className="mt-8 flex items-baseline gap-3 border-b border-ink pb-2">
        <h2 className="flex-1 text-[15px] font-bold text-ink">事例ごと</h2>
        <span className="w-14 text-right text-[11px] text-muted">閲覧</span>
        <span className="w-14 text-right text-[11px] text-muted">送客</span>
      </div>
      {list.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">掲載中の事例はありません。</p>
      ) : (
        <ul>
          {list.map((r) => (
            <li key={r.id} className="flex items-baseline gap-3 border-b border-line2 py-2 text-[13px]">
              {r.external
                ? <a href={r.href} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate text-body">{r.title} ↗</a>
                : <Link href={r.href} className="min-w-0 flex-1 truncate text-body">{r.title}</Link>}
              <span className="w-14 text-right tabular-nums text-ink">{r.views.toLocaleString()}</span>
              <span className="w-14 text-right tabular-nums text-accent">{r.clicks.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 space-y-4 border-t border-line pt-6 text-[12.5px] leading-relaxed text-body">
        {user.role === "owner" && <TeamInvite />}
        <p>
          事例の修正・取り下げのご依頼、新しい事例の掲載は <Link href="/contact">お問い合わせ</Link> からご連絡ください。
          事例の制作も <Link href="/inquiry">承っています</Link>。
        </p>
      </div>
    </div>
  );
}
