import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "../../../lib/admin";
import { loadViews, viewsConfigured, jstDay } from "../../../lib/views";
import { getCountableCase } from "../../../lib/cases";
import LoginForm from "../LoginForm";
import { logout } from "../actions";

/* 運営用: 事例ページの閲覧数（ベンダー別・事例別）。記録は app/api/views/route.ts。
   運営自身（このページにログイン中のブラウザ）の閲覧は数えていない。 */

export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90] as const;

type CaseAgg = { id: string; title: string; views: number; clicks: number };
type VendorAgg = { vendor: string; views: number; clicks: number; cases: CaseAgg[] };

export default async function AdminViewsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; error?: string; vendor?: string }>;
}) {
  const sp = await searchParams;
  const days = PERIODS.find((p) => String(p) === sp.days) ?? 30;
  const self = `/admin/views?days=${days}`;

  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return <LoginForm next={self} error={sp.error === "1"} />;
  }

  const rows = await loadViews(days);

  // 集計
  const byCase = new Map<string, { vendor: string; views: number; clicks: number }>();
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const cur = byCase.get(r.caseId) ?? { vendor: r.vendor, views: 0, clicks: 0 };
    cur.views += r.views;
    cur.clicks += r.clicks;
    byCase.set(r.caseId, cur);
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.views);
  }
  const vendors = new Map<string, VendorAgg>();
  for (const [id, v] of byCase) {
    const c = getCountableCase(id);
    const vendor = c?.vendor || v.vendor || "（不明）";
    const agg = vendors.get(vendor) ?? { vendor, views: 0, clicks: 0, cases: [] };
    agg.views += v.views;
    agg.clicks += v.clicks;
    agg.cases.push({ id, title: c?.title ?? id, views: v.views, clicks: v.clicks });
    vendors.set(vendor, agg);
  }
  const vendorList = [...vendors.values()].sort((a, b) => b.views - a.views);
  for (const v of vendorList) v.cases.sort((a, b) => b.views - a.views);
  const total = rows.reduce((s, r) => s + r.views, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const dayList = Array.from({ length: days }, (_, i) => jstDay(days - 1 - i));
  const maxDay = Math.max(1, ...dayList.map((d) => byDay.get(d) ?? 0));

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[24px] text-ink">事例の閲覧数</h1>
        <div className="flex items-baseline gap-4">
          <Link href="/admin/sources" className="text-[12.5px]">流入元 →</Link>
          <Link href="/admin/vendors" className="text-[12.5px]">ベンダー会員 →</Link>
          <form action={logout}><button className="text-[12px] text-muted underline">ログアウト</button></form>
        </div>
      </div>

      <div className="mt-4 flex gap-2 text-[13px]">
        {PERIODS.map((p) => (
          <Link key={p} href={`/admin/views?days=${p}`}
            className={`border px-3 py-1 no-underline ${p === days ? "border-ink bg-ink text-white" : "border-line text-body"}`}>
            直近{p}日
          </Link>
        ))}
      </div>

      {!viewsConfigured() && (
        <p className="mt-6 border border-line bg-soft px-4 py-3 text-[13px] text-body">
          閲覧数テーブル（VIEWS_TABLE）か AWS キーが未設定のため、データを読めません。
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {[["閲覧数", total], ["送客（出典クリック）", totalClicks], ["見られた事例", byCase.size], ["ベンダー", vendorList.length]].map(([k, v]) => (
          <div key={k} className="border border-line px-3 py-3">
            <dt className="text-[11.5px] text-muted">{k}</dt>
            <dd className="mt-1 text-[22px] font-bold tabular-nums text-ink">{Number(v).toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      {/* 日別推移 */}
      <div className="mt-6 flex h-20 items-end gap-px border-b border-line" aria-label="日別の閲覧数">
        {dayList.map((d) => {
          const n = byDay.get(d) ?? 0;
          return (
            <div key={d} title={`${d}: ${n}`} className="flex-1 bg-ink/70"
              style={{ height: `${(n / maxDay) * 100}%`, minHeight: n ? 2 : 0 }} />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{dayList[0]}</span><span>{dayList[dayList.length - 1]}</span>
      </div>

      <div className="mt-10 flex items-baseline gap-3">
        <h2 className="flex-1 text-[15px] font-bold text-ink">ベンダー別</h2>
        <span className="w-16 text-right text-[11px] text-muted">閲覧</span>
        <span className="w-14 text-right text-[11px] text-muted">送客</span>
      </div>
      {vendorList.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">この期間の記録はまだありません。</p>
      ) : (
        <div className="mt-3 border-t border-line">
          {vendorList.map((v) => (
            <details key={v.vendor} className="border-b border-line2" open={sp.vendor === v.vendor}>
              <summary className="flex cursor-pointer items-baseline gap-3 py-2.5 text-[13.5px]">
                <span className="min-w-0 flex-1 truncate font-bold text-ink">{v.vendor}</span>
                <span className="text-[12px] text-muted">{v.cases.length}事例</span>
                <span className="w-16 text-right font-bold tabular-nums text-ink">{v.views.toLocaleString()}</span>
                <span className="w-14 text-right tabular-nums text-accent">{v.clicks.toLocaleString()}</span>
              </summary>
              <ul className="pb-3 pl-3">
                {v.cases.map((c) => (
                  <li key={c.id} className="flex items-baseline gap-3 py-1 text-[12.5px]">
                    <Link href={`/cases/${c.id}`} className="min-w-0 flex-1 truncate text-body">{c.title}</Link>
                    <span className="w-16 text-right tabular-nums text-body">{c.views.toLocaleString()}</span>
                    <span className="w-14 text-right tabular-nums text-accent">{c.clicks.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
