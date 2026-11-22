import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "../../../lib/admin";
import { slotsConfigured } from "../../../lib/slots";
import { viewsConfigured } from "../../../lib/views";
import { getArticle, articleHref } from "../../../lib/articles";
import { buildSlotsReport, rate, siteVisits, CSV_TYPES, type Counts } from "../../../lib/slotsReport";
import LoginForm from "../LoginForm";
import { logout } from "../actions";

/* 運営用: 事例セレクション・用語記事の枠の計測（広告枠の販売根拠）。記録は app/api/slots/route.ts と app/api/views/route.ts。
   セレクション別PV・流入元・枠位置別の遷移率・ベンダー別の遷移を出し、CSV でも落とせる（/admin/slots/csv）。
   用語の定義は lib/slotsReport.ts の冒頭と、このページ下の注記。運営自身の閲覧は数えていない。 */

export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90] as const;

export default async function AdminSlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const days = PERIODS.find((p) => String(p) === sp.days) ?? 7;
  const self = `/admin/slots?days=${days}`;

  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return <LoginForm next={self} error={sp.error === "1"} />;
  }

  const r = await buildSlotsReport(days);
  const t = r.totals;
  const maxPosRate = Math.max(0.0001, ...r.positions.map((p) => (p.imps ? p.trans / p.imps : 0)));
  const refTotal = r.refs.reduce((s, x) => s + x.pv, 0);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[24px] text-ink">枠の計測（事例セレクション）</h1>
        <div className="flex items-baseline gap-4">
          <Link href="/admin/views" className="text-[12.5px]">閲覧数 →</Link>
          <Link href="/admin/sources" className="text-[12.5px]">流入元（UTM） →</Link>
          <form action={logout}><button className="text-[12px] text-muted underline">ログアウト</button></form>
        </div>
      </div>
      <p className="mt-2 text-[12px] text-muted">{r.from} 〜 {r.to}（日本時間・今日を含む）</p>

      <div className="mt-4 flex gap-2 text-[13px]">
        {PERIODS.map((p) => (
          <Link key={p} href={`/admin/slots?days=${p}`}
            className={`border px-3 py-1 no-underline ${p === days ? "border-ink bg-ink text-white" : "border-line text-body"}`}>
            直近{p}日
          </Link>
        ))}
      </div>

      {(!slotsConfigured() || !viewsConfigured()) && (
        <p className="mt-6 border border-line bg-soft px-4 py-3 text-[13px] text-body">
          計測テーブル（SLOTS_TABLE / VIEWS_TABLE）か AWS キーが未設定のため、データを読めません。
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
        {([
          ["PV", t.pv], ["枠の表示", t.imps], ["遷移", t.trans], ["遷移率（遷移/表示）", rate(t.trans, t.imps) || "—"],
          ["サイト訪問", siteVisits(t)],
        ] as [string, number | string][]).map(([k, v]) => (
          <div key={k} className="border border-line px-3 py-3">
            <dt className="text-[11.5px] text-muted">{k}</dt>
            <dd className="mt-1 text-[22px] font-bold tabular-nums text-ink">{typeof v === "number" ? v.toLocaleString() : v}</dd>
          </div>
        ))}
      </dl>

      {/* CSV */}
      <div className="mt-6 border border-line px-4 py-3">
        <div className="text-[12px] font-bold text-ink">CSV（直近{days}日）</div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px]">
          {Object.entries(CSV_TYPES).map(([type, label]) => (
            <a key={type} href={`/admin/slots/csv?type=${type}&days=${days}`}>{label}</a>
          ))}
        </div>
      </div>

      {/* 枠位置別 */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">枠位置別の遷移率（全記事合計）</h2>
      {r.positions.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">この期間の記録はまだありません。</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-ink text-right text-[11px] text-muted">
                <th className="py-1.5 text-left font-normal">枠</th>
                <CountHead />
                <th className="w-[28%] py-1.5 pl-3 text-left font-normal">遷移率</th>
              </tr>
            </thead>
            <tbody>
              {r.positions.map((p) => {
                const pr = p.imps ? p.trans / p.imps : 0;
                return (
                  <tr key={p.pos} className="border-b border-line2 text-right tabular-nums">
                    <td className="py-1.5 text-left font-bold text-ink">{String(p.pos).padStart(2, "0")}</td>
                    <CountCells c={p} />
                    <td className="py-1.5 pl-3">
                      <div className="h-2.5 bg-ink/70" style={{ width: `${(pr / maxPosRate) * 100}%`, minWidth: pr ? 2 : 0 }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* セレクション別 */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">セレクション別（PV順）</h2>
      {r.articles.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">この期間の記録はまだありません。</p>
      ) : (
        <div className="mt-3 border-t border-line">
          {r.articles.map((a) => {
            const art = getArticle(a.slug);
            const aps = r.articlePositions.filter((p) => p.slug === a.slug);
            const topRefs = Object.entries(a.refs).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]).slice(0, 3);
            return (
              <details key={a.slug} className="border-b border-line2">
                <summary className="flex cursor-pointer items-baseline gap-3 py-2.5 text-[13px]">
                  <span className="w-16 shrink-0 text-[12px] tabular-nums text-muted">{a.label}</span>
                  <span className="min-w-0 flex-1 truncate text-body">{a.title}</span>
                  <span className="w-16 text-right font-bold tabular-nums text-ink">{a.pv.toLocaleString()}</span>
                  <span className="w-14 text-right tabular-nums text-accent">{a.trans.toLocaleString()}</span>
                  <span className="w-14 text-right tabular-nums text-muted">{rate(a.trans, a.pv) || "—"}</span>
                </summary>
                <div className="pb-4 pl-3">
                  <p className="text-[12px] text-muted">
                    {art && <Link href={articleHref(art)}>記事を開く</Link>}
                    {"　"}流入元: {topRefs.length ? topRefs.map(([k, n]) => `${r.refs.find((x) => x.ref === k)?.label} ${n}`).join("・") : "記録なし"}
                    {a.refUnknown > 0 && `（記録なし ${a.refUnknown}）`}
                  </p>
                  {aps.length > 0 && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[640px] border-collapse text-[12px]">
                        <thead>
                          <tr className="border-b border-line text-right text-[10.5px] text-muted">
                            <th className="py-1 text-left font-normal">枠</th>
                            <th className="py-1 text-left font-normal">ベンダー</th>
                            <CountHead />
                          </tr>
                        </thead>
                        <tbody>
                          {aps.map((p) => (
                            <tr key={`${p.pos}|${p.caseId}`} className="border-b border-line2 text-right tabular-nums">
                              <td className="py-1 text-left">{String(p.pos).padStart(2, "0")}</td>
                              <td className="max-w-[160px] truncate py-1 text-left">
                                <Link href={`/cases/${p.caseId}`} className="text-body">{p.vendor}</Link>
                              </td>
                              <CountCells c={p} />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
      <p className="mt-1 text-right text-[11px] text-muted">列: PV ／ 遷移 ／ 遷移÷PV</p>

      {/* 流入元 */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">流入元（セレクションの閲覧）</h2>
      {refTotal === 0 ? (
        <p className="mt-3 text-[13px] text-muted">この期間の記録はまだありません。</p>
      ) : (
        <ul className="mt-3 border-t border-line">
          {r.refs.filter((x) => x.pv > 0).sort((x, y) => y.pv - x.pv).map((x) => (
            <li key={x.ref} className="flex items-baseline gap-3 border-b border-line2 py-1.5 text-[13px]">
              <span className="min-w-0 flex-1 text-body">{x.label}</span>
              <span className="w-16 text-right font-bold tabular-nums text-ink">{x.pv.toLocaleString()}</span>
              <span className="w-14 text-right tabular-nums text-muted">{rate(x.pv, refTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* ベンダー別 */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">ベンダー別（遷移順）</h2>
      <VendorTable list={r.vendors} />
      {r.introVendors.length > 0 && (
        <>
          <h3 className="mt-6 text-[13px] font-bold text-ink">紹介元（提供元ではない掲載元。ベンダー集計から除外）</h3>
          <VendorTable list={r.introVendors} />
        </>
      )}

      <div className="mt-10 border-t border-line pt-4 text-[11.5px] leading-[1.9] text-muted">
        <p>PV＝記事の閲覧（同じタブで開き直しても1回）。表示＝枠の3割以上が画面に入った回数（1閲覧につき枠ごとに1回）。</p>
        <p>遷移＝枠のリンク（事例ページ or 元記事）のクリック（1閲覧につき枠ごとに1回。両方押しても1回）。遷移率＝遷移÷表示。</p>
        <p>経由＝枠から事例ページへ移り、30分以内にそこで元記事が押された回数。サイト訪問＝元記事へ（直接）＋経由。</p>
        <p>流入元の「記録なし」は、流入元の計測を始める前の閲覧など。ボット・運営のアクセス・同じIPからの連打は数えていない。</p>
      </div>
    </div>
  );
}

function CountHead() {
  return (
    <>
      <th className="py-1.5 font-normal">表示</th>
      <th className="py-1.5 font-normal">遷移</th>
      <th className="py-1.5 font-normal">遷移率</th>
      <th className="py-1.5 font-normal">事例ページへ</th>
      <th className="py-1.5 font-normal">元記事へ</th>
      <th className="py-1.5 font-normal">経由</th>
      <th className="py-1.5 font-normal">サイト訪問</th>
    </>
  );
}

function CountCells({ c }: { c: Counts }) {
  return (
    <>
      <td className="py-1.5">{c.imps.toLocaleString()}</td>
      <td className="py-1.5 font-bold text-ink">{c.trans.toLocaleString()}</td>
      <td className="py-1.5 text-accent">{rate(c.trans, c.imps) || "—"}</td>
      <td className="py-1.5">{c.toCase.toLocaleString()}</td>
      <td className="py-1.5">{c.toSrc.toLocaleString()}</td>
      <td className="py-1.5">{c.via.toLocaleString()}</td>
      <td className="py-1.5">{siteVisits(c).toLocaleString()}</td>
    </>
  );
}

function VendorTable({ list }: { list: (Counts & { vendor: string; cases: number })[] }) {
  if (list.length === 0) return <p className="mt-3 text-[13px] text-muted">この期間の記録はまだありません。</p>;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-ink text-right text-[11px] text-muted">
            <th className="py-1.5 text-left font-normal">ベンダー</th>
            <th className="py-1.5 font-normal">事例</th>
            <CountHead />
          </tr>
        </thead>
        <tbody>
          {list.map((v) => (
            <tr key={v.vendor} className="border-b border-line2 text-right tabular-nums">
              <td className="max-w-[200px] truncate py-1.5 text-left text-ink">{v.vendor}</td>
              <td className="py-1.5">{v.cases}</td>
              <CountCells c={v} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
