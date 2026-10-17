import Link from "next/link";
import type { Metadata } from "next";
import { isAdmin, adminConfigured } from "../../../lib/admin";
import {
  EVENT_KINDS, KIND_LABEL, analyticsEnabled, analyticsTable, daysOfMonth, jstDay, jstMonth, recentDays,
  readCounts, readDaily, readEventsRange, type Count, type EventKind,
} from "../../../lib/analytics";
import { CHALLENGES, challengeLabel, industryLabel } from "../../../lib/taxonomy";
import { AXES, answerLabel } from "../../../lib/finder";
import { allCases, getCase } from "../../../lib/cases";
import LoginForm from "./LoginForm";
import { logout } from "./actions";

/* 課題別の計測ダッシュボード（管理者のみ）。
   ・課題ごとに「課題ページ閲覧／事例閲覧／ファインダーで選ばれた回数／URL診断で推定された回数」を横並びにする
     → カテゴリースポンサーを売る根拠
   ・事例ごと・掲載企業ごとの閲覧数 → 掲載企業への特典データ
   ・ファインダーの回答分布、URL診断の入力一覧 → 「いま企業が困っていること」の一次データ
   月は ?m=YYYY-MM で切り替え。生データは /admin/analytics/export でCSV。 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "計測ダッシュボード",
  robots: { index: false, follow: false },
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AnalyticsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const month = /^\d{4}-\d{2}$/.test(one(sp.m) ?? "") ? one(sp.m)! : jstMonth();

  if (!adminConfigured()) {
    return <Shell><Notice title="管理画面は閉じています" body="ANALYTICS_ADMIN_PASSWORD を設定して再ビルドすると開きます。" /></Shell>;
  }
  if (!(await isAdmin())) {
    return <Shell><LoginForm back={`/admin/analytics?m=${month}`} /></Shell>;
  }
  if (!analyticsEnabled()) {
    return (
      <Shell month={month}>
        <Notice title="計測は無効です" body="ANALYTICS_TABLE が未設定です。amplify/backend.ts のテーブルがデプロイされ、next.config.ts で名前が焼き込まれると有効になります（README「課題別の計測」）。" />
      </Shell>
    );
  }

  const data = await load(month);
  return (
    <Shell month={month} table={analyticsTable()}>
      <Kpis d={data} />
      <ByChallenge d={data} month={month} />
      <TopCases d={data} />
      <TopVendors d={data} />
      <Finder d={data} />
      <Suggest d={data} />
    </Shell>
  );
}

/* ── データ読み出し ──────────────────────────────────────────── */

type Data = Awaited<ReturnType<typeof load>>;

async function load(month: string) {
  const days30 = recentDays(30);
  const monthDays = daysOfMonth(month);
  const [
    daily,
    viewCh, caseCh, finderCh, suggestCh,
    viewChAll, caseChAll, finderChAll, suggestChAll,
    cases, vendors, finderAns, sugInd, sugTag,
    results, suggests,
  ] = await Promise.all([
    Promise.all(EVENT_KINDS.map((k) => readDaily(k, days30))),
    readCounts("view:challenge", month), readCounts("case:challenge", month),
    readCounts("finder:challenge", month), readCounts("suggest:challenge", month),
    readCounts("view:challenge", "all"), readCounts("case:challenge", "all"),
    readCounts("finder:challenge", "all"), readCounts("suggest:challenge", "all"),
    readCounts("view:case", month), readCounts("view:vendor", month),
    readCounts("finder:answer", month), readCounts("suggest:industry", month), readCounts("suggest:tag", month),
    readEventsRange(["finder:result"], monthDays), readEventsRange(["suggest"], monthDays),
  ]);
  const dailyByKind = Object.fromEntries(EVENT_KINDS.map((k, i) => [k, daily[i]])) as Record<EventKind, Record<string, number>>;
  const toMap = (c: Count[]) => Object.fromEntries(c.map((x) => [x.target, x.n])) as Record<string, number>;
  return {
    days30, monthDays, dailyByKind,
    month: { view: toMap(viewCh), cases: toMap(caseCh), finder: toMap(finderCh), suggest: toMap(suggestCh) },
    all: { view: toMap(viewChAll), cases: toMap(caseChAll), finder: toMap(finderChAll), suggest: toMap(suggestChAll) },
    cases, vendors, finderAns, sugInd, sugTag, results, suggests,
  };
}

/* ── 枠 ──────────────────────────────────────────────────────── */

function Shell({ children, month, table }: { children: React.ReactNode; month?: string; table?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-5">
        <div>
          <p className="label">管理</p>
          <h1 className="font-display mt-2 text-[26px] text-ink">課題別の計測ダッシュボード</h1>
          {table && <p className="mt-1 text-[11px] text-muted">テーブル: {table}</p>}
        </div>
        {month && <MonthNav month={month} />}
      </div>
      {children}
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-10 border border-line bg-soft px-6 py-8">
      <p className="font-display text-[17px] text-ink">{title}</p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function MonthNav({ month }: { month: string }) {
  const cur = jstMonth();
  const btn = "border border-line px-3 py-1.5 text-[12px] text-ink no-underline transition hover:border-ink";
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <Link href={`?m=${shiftMonth(month, -1)}`} className={btn}>← 前月</Link>
      <span className="num px-2 text-[16px] text-ink">{month}</span>
      {month < cur ? <Link href={`?m=${shiftMonth(month, 1)}`} className={btn}>翌月 →</Link>
        : <span className="border border-line px-3 py-1.5 text-muted/50">翌月 →</span>}
      <span className="mx-1 text-line">|</span>
      <span className="label">CSV</span>
      {[["suggest", "URL診断"], ["finder", "ファインダー"], ["views", "閲覧"], ["all", "すべて"]].map(([k, l]) => (
        <a key={k} href={`/admin/analytics/export?m=${month}&kind=${k}`} className={btn}>{l}</a>
      ))}
      <form action={logout} className="ml-2">
        <button type="submit" className="text-[11px] text-muted hover:text-ink">ログアウト</button>
      </form>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display border-b border-ink pb-3 text-[19px] text-ink">{title}</h2>
      {sub && <p className="mt-2 text-[12px] leading-relaxed text-muted">{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* 横棒。単一色（accent）の濃淡ではなく長さで量を表す。文字は常にインク色 */
function Bar({ n, max }: { n: number; max: number }) {
  const w = max > 0 ? Math.max(n > 0 ? 2 : 0, Math.round((n / max) * 100)) : 0;
  return (
    <span aria-hidden className="block h-2 w-full bg-soft2">
      <span className="block h-2 rounded-r-[4px] bg-accent" style={{ width: `${w}%` }} />
    </span>
  );
}

function Empty({ text = "この月のデータはまだありません。" }: { text?: string }) {
  return <p className="border border-dashed border-line px-5 py-6 text-center text-[12.5px] text-muted">{text}</p>;
}

/* ── KPI：種別ごとの当月合計と30日の推移 ─────────────────────── */

function Kpis({ d }: { d: Data }) {
  const today = jstDay();
  return (
    <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
      {EVENT_KINDS.map((k) => {
        const series = d.days30.map((day) => d.dailyByKind[k][day] ?? 0);
        const max = Math.max(1, ...series);
        const sum = series.reduce((a, b) => a + b, 0);
        const todayN = d.dailyByKind[k][today] ?? 0;
        return (
          <div key={k} className="bg-white px-5 py-4">
            <p className="text-[11px] font-bold text-muted">{KIND_LABEL[k]}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="num text-[30px] leading-none text-ink">{sum.toLocaleString()}</span>
              <span className="text-[11px] text-muted">直近30日</span>
            </p>
            <p className="mt-1 text-[11px] text-muted">今日 <span className="num text-ink">{todayN}</span></p>
            {/* 30日の日別推移（縦棒・単一色） */}
            <div aria-hidden className="mt-3 flex h-8 items-end gap-px">
              {series.map((v, i) => (
                <span key={i} title={`${d.days30[i]}: ${v}`} className="flex-1 bg-accent/80"
                  style={{ height: `${Math.max(v > 0 ? 6 : 2, Math.round((v / max) * 100))}%`, opacity: v > 0 ? 1 : 0.25 }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 課題別：4つの指標を横並び ───────────────────────────────── */

function ByChallenge({ d, month }: { d: Data; month: string }) {
  const rows = CHALLENGES.map((c) => {
    const m = d.month;
    const view = m.view[c.slug] ?? 0, cases = m.cases[c.slug] ?? 0, finder = m.finder[c.slug] ?? 0, suggest = m.suggest[c.slug] ?? 0;
    const a = d.all;
    const allTotal = (a.view[c.slug] ?? 0) + (a.cases[c.slug] ?? 0) + (a.finder[c.slug] ?? 0) + (a.suggest[c.slug] ?? 0);
    return { slug: c.slug, label: c.label, view, cases, finder, suggest, total: view + cases + finder + suggest, allTotal };
  }).sort((x, y) => y.total - x.total || y.allTotal - x.allTotal);
  const max = Math.max(0, ...rows.map((r) => r.total));
  const any = rows.some((r) => r.total > 0 || r.allTotal > 0);

  return (
    <Section title={`課題別（${month}）`}
      sub="課題ページの閲覧、その課題を持つ事例ページの閲覧、ファインダーで「ほしい成果」として選ばれた回数、URL診断でAIが推定した回数。合計の多い順。カテゴリースポンサーの根拠に使う。">
      {!any ? <Empty /> : (
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="label border-b border-line text-left">
              <th className="py-2 pr-3 font-bold">課題</th>
              <th className="w-[26%] py-2 pr-3 font-bold">合計</th>
              <Th>課題ページ</Th><Th>事例閲覧</Th><Th>ファインダー</Th><Th>URL診断</Th><Th>累計</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b border-line2">
                <td className="py-2.5 pr-3">
                  <Link href={`/challenge/${r.slug}`} className="font-bold text-ink no-underline hover:text-brand">{r.label}</Link>
                </td>
                <td className="py-2.5 pr-3 align-middle">
                  <div className="flex items-center gap-3">
                    <Bar n={r.total} max={max} />
                    <span className="num w-12 shrink-0 text-right text-[14px] text-ink">{r.total.toLocaleString()}</span>
                  </div>
                </td>
                <Td n={r.view} /><Td n={r.cases} /><Td n={r.finder} /><Td n={r.suggest} />
                <Td n={r.allTotal} muted />
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => <th className="py-2 pr-3 text-right font-bold">{children}</th>;
const Td = ({ n, muted }: { n: number; muted?: boolean }) => (
  <td className={`num py-2.5 pr-3 text-right ${muted ? "text-muted" : n > 0 ? "text-ink" : "text-muted/50"}`}>{n.toLocaleString()}</td>
);

/* ── 事例ランキング ─────────────────────────────────────────── */

function TopCases({ d }: { d: Data }) {
  const rows = d.cases.slice(0, 30);
  const max = rows[0]?.n ?? 0;
  return (
    <Section title="よく見られた事例（上位30）" sub="事例ページの閲覧数。掲載企業への「貴社の事例は今月N回見られました」の元データ。">
      {rows.length === 0 ? <Empty /> : (
        <ol className="divide-y divide-line2">
          {rows.map((r, i) => {
            const c = getCase(r.target);
            return (
              <li key={r.target} className="grid grid-cols-[2rem_1fr_8rem_3.5rem] items-center gap-3 py-2 text-[12.5px]">
                <span className="num text-muted">{i + 1}</span>
                <span className="min-w-0">
                  <Link href={`/cases/${r.target}`} className="block truncate font-bold text-ink no-underline hover:text-brand">{c?.title ?? r.target}</Link>
                  {c && <span className="text-[11px] text-muted">{c.vendor} / {challengeLabel(c.challenges[0] ?? "")}</span>}
                </span>
                <Bar n={r.n} max={max} />
                <span className="num text-right text-[14px] text-ink">{r.n.toLocaleString()}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}

/* ── 掲載企業ランキング ─────────────────────────────────────── */

function TopVendors({ d }: { d: Data }) {
  const rows = d.vendors.slice(0, 30);
  const max = rows[0]?.n ?? 0;
  const countByVendor: Record<string, number> = {};
  if (rows.length) for (const c of allCases()) countByVendor[c.vendor] = (countByVendor[c.vendor] ?? 0) + 1;
  return (
    <Section title="掲載企業別の事例閲覧（上位30）" sub="ベンダーごとに、その会社の事例ページが見られた回数の合計。掲載企業への特典レポートに使う。">
      {rows.length === 0 ? <Empty /> : (
        <ol className="divide-y divide-line2">
          {rows.map((r, i) => (
            <li key={r.target} className="grid grid-cols-[2rem_1fr_8rem_3.5rem] items-center gap-3 py-2 text-[12.5px]">
              <span className="num text-muted">{i + 1}</span>
              <span className="min-w-0 truncate">
                <span className="font-bold text-ink">{r.target}</span>
                <span className="ml-2 text-[11px] text-muted">掲載 {countByVendor[r.target] ?? 0} 件</span>
              </span>
              <Bar n={r.n} max={max} />
              <span className="num text-right text-[14px] text-ink">{r.n.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

/* ── ファインダー：軸ごとの回答分布と、よくある組み合わせ ─────── */

function Finder({ d }: { d: Data }) {
  const byAxis = new Map<string, Count[]>();
  for (const c of d.finderAns) {
    const [k, v] = c.target.split("=");
    if (!byAxis.has(k)) byAxis.set(k, []);
    byAxis.get(k)!.push({ target: v, n: c.n });
  }
  const combos = new Map<string, { n: number; answers: Record<string, string>; count?: number }>();
  for (const e of d.results) {
    const cur = combos.get(e.target);
    if (cur) cur.n++;
    else combos.set(e.target, { n: 1, answers: (e.meta.answers ?? {}) as Record<string, string>, count: typeof e.meta.count === "number" ? e.meta.count : undefined });
  }
  const topCombos = [...combos.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 15);

  return (
    <Section title="事例ファインダー：何が選ばれているか"
      sub={`回答ごとの選択回数（スキップは数えない）。結果到達 ${d.results.length} 回。`}>
      {d.finderAns.length === 0 ? <Empty /> : (
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {AXES.filter((a) => byAxis.has(a.key)).map((a) => {
            const rows = byAxis.get(a.key)!.sort((x, y) => y.n - x.n);
            const max = rows[0]?.n ?? 0;
            return (
              <div key={a.key}>
                <p className="label border-b border-line pb-2">{a.short}｜{a.question}</p>
                <ul className="mt-2 divide-y divide-line2">
                  {rows.map((r) => (
                    <li key={r.target} className="grid grid-cols-[1fr_6rem_3rem] items-center gap-3 py-1.5 text-[12.5px]">
                      <span className="truncate text-ink">{answerLabel(a.key, r.target)}</span>
                      <Bar n={r.n} max={max} />
                      <span className="num text-right text-ink">{r.n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      {topCombos.length > 0 && (
        <div className="mt-8">
          <p className="label border-b border-line pb-2">結果まで到達した回答の組み合わせ（多い順）</p>
          <ul className="mt-2 divide-y divide-line2 text-[12.5px]">
            {topCombos.map(([key, v]) => (
              <li key={key} className="flex items-center justify-between gap-4 py-2">
                <span className="flex flex-wrap gap-1.5">
                  {AXES.filter((a) => v.answers[a.key]).map((a) => (
                    <span key={a.key} className="border border-line px-2 py-0.5 text-[11.5px]">
                      <span className="text-muted">{a.short} </span><span className="text-ink">{answerLabel(a.key, v.answers[a.key])}</span>
                    </span>
                  ))}
                </span>
                <span className="shrink-0 text-[11px] text-muted">
                  候補 <span className="num text-ink">{v.count ?? "-"}</span> 件 ／ <span className="num text-[13px] text-ink">{v.n}</span> 回
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

/* ── URL診断：推定業種・タグの分布と、入力一覧 ───────────────── */

const dtFmt = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function Suggest({ d }: { d: Data }) {
  const ind = d.sugInd.slice(0, 13);
  const tags = d.sugTag.slice(0, 20);
  return (
    <Section title="URL診断：どんな会社が、何に困っているか"
      sub={`入力された会社サイトをAIが読み、推定した業種・困りごと・課題。今月 ${d.suggests.length} 件。課題別の集計は上の表に含まれる。`}>
      {d.suggests.length === 0 ? <Empty /> : (
        <>
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
            <Dist title="推定業種" rows={ind.map((r) => ({ label: industryLabel(r.target), n: r.n }))} />
            <Dist title="推定した困りごとタグ（上位20）" rows={tags.map((r) => ({ label: r.target, n: r.n }))} />
          </div>
          <div className="mt-8 overflow-x-auto">
            <p className="label border-b border-line pb-2">入力一覧（新しい順・最大100件）</p>
            <table className="mt-2 w-full min-w-[720px] text-[12px]">
              <thead>
                <tr className="label border-b border-line text-left">
                  <th className="py-2 pr-3 font-bold">日時</th><th className="py-2 pr-3 font-bold">サイト</th>
                  <th className="py-2 pr-3 font-bold">AIの理解</th><th className="py-2 pr-3 font-bold">業種</th>
                  <th className="py-2 pr-3 font-bold">課題</th><th className="py-2 pr-3 text-right font-bold">提示</th>
                </tr>
              </thead>
              <tbody>
                {d.suggests.slice(0, 100).map((e) => {
                  const m = e.meta;
                  return (
                    <tr key={e.ts + e.target} className="border-b border-line2 align-top">
                      <td className="num py-2 pr-3 whitespace-nowrap text-muted">{e.ts ? dtFmt.format(new Date(e.ts)) : ""}</td>
                      <td className="py-2 pr-3">
                        <a href={String(m.url ?? `https://${e.target}`)} target="_blank" rel="noreferrer" className="font-bold text-ink no-underline hover:text-brand">{e.target}</a>
                        {typeof m.email === "string" && <span className="block text-[11px] text-muted">{m.email}</span>}
                      </td>
                      <td className="py-2 pr-3 text-body">{String(m.summary ?? "")}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-body">{typeof m.industry === "string" ? industryLabel(m.industry) : ""}</td>
                      <td className="py-2 pr-3 text-body">{Array.isArray(m.challenges) ? m.challenges.map((c) => challengeLabel(String(c))).join("、") : ""}</td>
                      <td className="num py-2 text-right text-ink">{typeof m.matched === "number" ? m.matched : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

function Dist({ title, rows }: { title: string; rows: { label: string; n: number }[] }) {
  const max = rows[0]?.n ?? 0;
  return (
    <div>
      <p className="label border-b border-line pb-2">{title}</p>
      {rows.length === 0 ? <p className="mt-2 text-[12px] text-muted">まだありません。</p> : (
        <ul className="mt-2 divide-y divide-line2">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[1fr_6rem_3rem] items-center gap-3 py-1.5 text-[12.5px]">
              <span className="truncate text-ink">{r.label}</span>
              <Bar n={r.n} max={max} />
              <span className="num text-right text-ink">{r.n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
