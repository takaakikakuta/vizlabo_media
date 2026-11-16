import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "../../../lib/admin";
import { jstDay } from "../../../lib/views";
import { CONTENT_KINDS, contentKind, loadSources, sourceLabel, sourcesConfigured, type ContentKind } from "../../../lib/sources";
import { getArticle } from "../../../lib/articles";
import { dayLabel, getDay } from "../../../lib/days";
import { getCountableCase } from "../../../lib/cases";
import LoginForm from "../LoginForm";
import { logout } from "../actions";

/* 運営用: 流入元（UTM つきの来訪）。どの媒体の、どの種類の投稿が人を連れてきたかを1画面で見る。
   記録は app/api/sources/route.ts。運営自身（このページにログイン中のブラウザ）の来訪は数えていない。 */

export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90] as const;

type Tally = { visits: number; signups: number };
type PageAgg = Tally & { path: string; title: string; kind: ContentKind; bySource: Map<string, number> };
type CampaignAgg = Tally & { label: string; raw: string; campaign: string };

/** 着地ページの見出し。記事・記念日・事例は題名、それ以外はパスをそのまま出す */
function pageTitle(path: string): string {
  const id = decodeURIComponent(path.split("/")[2] ?? "");
  if (path.startsWith("/articles/") || path.startsWith("/terms/")) {
    const a = getArticle(id);
    if (a) return `${a.format === "yougo" ? "用語" : ""}#${String(a.no).padStart(3, "0")} ${a.title.join("")}`;
  }
  if (path.startsWith("/days/")) {
    const d = getDay(id);
    if (d) return `${dayLabel(d.date)} ${d.name}`;
  }
  if (path.startsWith("/cases/")) {
    const c = getCountableCase(id);
    if (c) return c.title;
  }
  return path;
}

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const days = PERIODS.find((p) => String(p) === sp.days) ?? 30;
  const self = `/admin/sources?days=${days}`;

  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return <LoginForm next={self} error={sp.error === "1"} />;
  }

  const rows = await loadSources(days);

  // 集計
  const bySource = new Map<string, Tally & { kinds: Map<ContentKind, number> }>();
  const byPage = new Map<string, PageAgg>();
  const byCampaign = new Map<string, CampaignAgg>();
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const label = sourceLabel(r.source, r.medium);
    const kind = contentKind(r.path);

    const s = bySource.get(label) ?? { visits: 0, signups: 0, kinds: new Map() };
    s.visits += r.visits; s.signups += r.signups;
    s.kinds.set(kind, (s.kinds.get(kind) ?? 0) + r.visits);
    bySource.set(label, s);

    const p = byPage.get(r.path) ?? { path: r.path, title: pageTitle(r.path), kind, visits: 0, signups: 0, bySource: new Map() };
    p.visits += r.visits; p.signups += r.signups;
    p.bySource.set(label, (p.bySource.get(label) ?? 0) + r.visits);
    byPage.set(r.path, p);

    const raw = r.medium ? `${r.source} / ${r.medium}` : r.source;
    const ck = `${raw}|${r.campaign}`;
    const c = byCampaign.get(ck) ?? { label, raw, campaign: r.campaign, visits: 0, signups: 0 };
    c.visits += r.visits; c.signups += r.signups;
    byCampaign.set(ck, c);

    byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.visits);
  }
  const sourceList = [...bySource.entries()].sort((a, b) => b[1].visits - a[1].visits);
  const pageList = [...byPage.values()].sort((a, b) => b.visits - a.visits || a.path.localeCompare(b.path));
  const campaignList = [...byCampaign.values()].sort((a, b) => b.visits - a.visits);
  const kinds = CONTENT_KINDS.filter((k) => sourceList.some(([, s]) => s.kinds.get(k)));
  const total = rows.reduce((n, r) => n + r.visits, 0);
  const totalSignups = rows.reduce((n, r) => n + r.signups, 0);
  const kindTotal = (k: ContentKind) => sourceList.reduce((n, [, s]) => n + (s.kinds.get(k) ?? 0), 0);
  const dayList = Array.from({ length: days }, (_, i) => jstDay(days - 1 - i));
  const maxDay = Math.max(1, ...dayList.map((d) => byDay.get(d) ?? 0));
  const num = "px-2 py-2 text-right tabular-nums";

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[24px] text-ink">流入元</h1>
        <div className="flex items-baseline gap-4">
          <Link href="/admin/views" className="text-[12.5px]">事例の閲覧数 →</Link>
          <Link href="/admin/vendors" className="text-[12.5px]">ベンダー会員 →</Link>
          <form action={logout}><button className="text-[12px] text-muted underline">ログアウト</button></form>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        URL に utm_source が付いた来訪だけを数えています（SNS の投稿・メルマガのリンク）。同じタブでの読み込み直しは1回です。
        登録は、その来訪と同じタブでメルマガに登録した数です。
      </p>

      <div className="mt-4 flex gap-2 text-[13px]">
        {PERIODS.map((p) => (
          <Link key={p} href={`/admin/sources?days=${p}`}
            className={`border px-3 py-1 no-underline ${p === days ? "border-ink bg-ink text-white" : "border-line text-body"}`}>
            直近{p}日
          </Link>
        ))}
      </div>

      {!sourcesConfigured() && (
        <p className="mt-6 border border-line bg-soft px-4 py-3 text-[13px] text-body">
          流入元テーブル（SOURCES_TABLE）か AWS キーが未設定のため、データを読めません。
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {[["来訪", total], ["メルマガ登録", totalSignups], ["媒体", sourceList.length], ["着地ページ", pageList.length]].map(([k, v]) => (
          <div key={k} className="border border-line px-3 py-3">
            <dt className="text-[11.5px] text-muted">{k}</dt>
            <dd className="mt-1 text-[22px] font-bold tabular-nums text-ink">{Number(v).toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      {/* 日別推移 */}
      <div className="mt-6 flex h-20 items-end gap-px border-b border-line" aria-label="日別の来訪">
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

      {total === 0 ? (
        <p className="mt-10 text-[13px] text-muted">この期間の記録はまだありません。</p>
      ) : (
        <>
          {/* 媒体 × 記事の種類 */}
          <h2 className="mt-10 text-[15px] font-bold text-ink">媒体 × 投稿の種類</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[13px]">
              <thead>
                <tr className="border-y border-line text-[11px] text-muted">
                  <th className="px-2 py-2 text-left font-normal">媒体</th>
                  {kinds.map((k) => <th key={k} className="px-2 py-2 text-right font-normal">{k}</th>)}
                  <th className="px-2 py-2 text-right font-normal">来訪 計</th>
                  <th className="px-2 py-2 text-right font-normal">登録</th>
                </tr>
              </thead>
              <tbody>
                {sourceList.map(([label, s]) => (
                  <tr key={label} className="border-b border-line2">
                    <th className="px-2 py-2 text-left font-bold text-ink">{label}</th>
                    {kinds.map((k) => (
                      <td key={k} className={`${num} text-body`}>{(s.kinds.get(k) ?? 0).toLocaleString()}</td>
                    ))}
                    <td className={`${num} font-bold text-ink`}>{s.visits.toLocaleString()}</td>
                    <td className={`${num} text-accent`}>{s.signups.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="border-b border-line text-muted">
                  <th className="px-2 py-2 text-left font-normal">計</th>
                  {kinds.map((k) => <td key={k} className={num}>{kindTotal(k).toLocaleString()}</td>)}
                  <td className={`${num} font-bold text-ink`}>{total.toLocaleString()}</td>
                  <td className={`${num} text-accent`}>{totalSignups.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 着地ページ別 */}
          <div className="mt-10 flex items-baseline gap-3">
            <h2 className="flex-1 text-[15px] font-bold text-ink">着地ページ別</h2>
            <span className="w-16 text-right text-[11px] text-muted">来訪</span>
            <span className="w-14 text-right text-[11px] text-muted">登録</span>
          </div>
          <div className="mt-3 border-t border-line">
            {pageList.map((p) => (
              <details key={p.path} className="border-b border-line2">
                <summary className="flex cursor-pointer items-baseline gap-3 py-2.5 text-[13.5px]">
                  <span className="min-w-0 flex-1 truncate text-ink">{p.title}</span>
                  <span className="shrink-0 text-[11.5px] text-muted">{p.kind}</span>
                  <span className="w-16 text-right font-bold tabular-nums text-ink">{p.visits.toLocaleString()}</span>
                  <span className="w-14 text-right tabular-nums text-accent">{p.signups.toLocaleString()}</span>
                </summary>
                <ul className="pb-3 pl-3">
                  {[...p.bySource.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => (
                    <li key={label} className="flex items-baseline gap-3 py-1 text-[12.5px]">
                      <span className="min-w-0 flex-1 truncate text-body">{label}</span>
                      <span className="w-16 text-right tabular-nums text-body">{n.toLocaleString()}</span>
                      <span className="w-14" />
                    </li>
                  ))}
                  <li className="pt-1 text-[12px]"><Link href={p.path} className="text-muted">{p.path}</Link></li>
                </ul>
              </details>
            ))}
          </div>

          {/* UTM の値そのまま */}
          <h2 className="mt-10 text-[15px] font-bold text-ink">キャンペーン別（UTM の値そのまま）</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-y border-line text-[11px] text-muted">
                  <th className="px-2 py-2 text-left font-normal">媒体</th>
                  <th className="px-2 py-2 text-left font-normal">utm_source / utm_medium</th>
                  <th className="px-2 py-2 text-left font-normal">utm_campaign</th>
                  <th className="px-2 py-2 text-right font-normal">来訪</th>
                  <th className="px-2 py-2 text-right font-normal">登録</th>
                </tr>
              </thead>
              <tbody>
                {campaignList.map((c) => (
                  <tr key={`${c.raw}|${c.campaign}`} className="border-b border-line2">
                    <td className="px-2 py-2 font-bold text-ink">{c.label}</td>
                    <td className="px-2 py-2 text-body">{c.raw}</td>
                    <td className="px-2 py-2 text-body">{c.campaign || "（なし）"}</td>
                    <td className={`${num} text-ink`}>{c.visits.toLocaleString()}</td>
                    <td className={`${num} text-accent`}>{c.signups.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
