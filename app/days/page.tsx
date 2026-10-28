import Link from "next/link";
import {
  allDays, dayCases, dayImage, dayLabel, dayMonth, dayYear, dayWeekday, daysBetween, daysInMonth,
  todayDay, todayJST, WEEKDAYS_JA, type DayPost,
} from "../../lib/days";
import { vendorLabel } from "../../components/Adoption";
import CoverImg from "../../components/CoverImg";
import { ListHead } from "../../components/CaseGrid";

export const metadata = {
  title: "事例で読む記念日",
  description: "毎日の記念日にちなんで、掲載事例から3本を選んで紹介する連載。SNSで配信した記念日ポストを1日1ページで読める。",
};

/* 「きょうの記念日」を先頭に出すため、トップと同じく1時間ごとに作り直す（ISR）。
   静的のままだとビルド時の日付で固まる。 */
export const revalidate = 3600;

/* 一覧は“暦”として組む。この連載は日付が背骨なので、
   1) きょう（無ければ次）の記念日を扉に、2) 月ごとにカレンダーと読みものの行を並べる。
   カレンダーは「どの日にポストがあるか」を一目で示す索引、行は日の数字を大きく立てて日付で拾えるようにする。 */
export default function DaysPage() {
  const days = allDays();
  const today = todayJST();
  const feature = todayDay();  // きょう → 同じ月日の昨年以前 → 次の記念日 → 直近に過ぎた記念日

  // 年ごとに内容を変えられるよう日付は YYYY-MM-DD。
  // 月の並びは「今月 → 来月以降（近い順）→ 過去の月（新しい順）」。開いた人がまず今月の暦を見られるようにする。
  // 月は "YYYY-MM" の文字列で比べる（todayJST() が YYYY-MM-DD なので先頭7文字が今月）。
  const thisMonth = today.slice(0, 7);
  const monthKeys = Array.from(new Set(days.map((d) => d.date.slice(0, 7))));
  const upcoming = monthKeys.filter((k) => k >= thisMonth).sort();                 // 今月・来月以降は近い順
  const past = monthKeys.filter((k) => k < thisMonth).sort((a, b) => b.localeCompare(a)); // 過去は新しい順
  const months = [...upcoming, ...past].map((k) => ({
    y: parseInt(k.slice(0, 4), 10),
    m: parseInt(k.slice(5, 7), 10),
    days: days.filter((d) => d.date.startsWith(k)),
  }));

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <ListHead eyebrow="連載" title="事例で読む記念日"
        sub="その日の記念日にちなんで、掲載事例から3本を選んで紹介する。SNSで配信した記念日ポストを、1日1ページで。" count={days.length} />

      {feature && <Feature day={feature.day} when={feature.when} today={today} />}

      {/* 月の目次（月が2つ以上あるときだけ） */}
      {months.length > 1 && (
        <nav aria-label="月を選ぶ" className="mt-12 flex flex-wrap gap-2">
          {months.map(({ y, m, days: ds }) => (
            <a key={`${y}-${m}`} href={`#m-${y}-${m}`}
              className="border border-line px-3 py-1.5 text-[12px] text-body no-underline transition hover:border-ink hover:text-ink">
              {y}年{m}月<span className="num ml-1.5 text-[11px] text-muted">{ds.length}</span>
            </a>
          ))}
        </nav>
      )}

      {months.map(({ y, m, days: ds }) => (
        <section key={`${y}-${m}`} id={`m-${y}-${m}`} className="mt-14 scroll-mt-24">
          {/* 月の見出し：数字を立てる */}
          <div className="flex items-end justify-between border-b border-ink pb-3">
            <h2 className="flex items-baseline gap-2">
              <span className="num text-[34px] leading-none text-ink">{m}</span>
              <span className="font-display text-[20px] leading-none text-ink">月</span>
              <span className="label ml-2">{y}年</span>
            </h2>
            <p className="text-[12px] text-muted"><span className="num text-[14px] text-ink">{ds.length}</span> 日分</p>
          </div>

          <div className="mt-6 grid gap-8 md:grid-cols-[236px_1fr] md:gap-12">
            {/* 左（md以上は追従）：その月のカレンダー。ポストのある日だけが押せる */}
            <div className="self-start md:sticky md:top-24">
              <MonthCalendar y={y} m={m} days={ds} today={today} />
            </div>
            {/* 右：日付順の読みもの */}
            <div className="border-t border-line">
              {ds.map((d) => <DayRow key={d.date} d={d} today={today} />)}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

/* 扉：きょうの記念日（無ければ次、それも無ければ直近）。トップの入口カードと同じ解決順 */
function Feature({ day, when, today }: { day: DayPost; when: "today" | "lastYear" | "next" | "past"; today: string }) {
  const img = dayImage(day);
  const diff = daysBetween(today, day.date);
  const eyebrow =
    when === "today" ? "きょうの記念日"
    : when === "lastYear" ? `きょうの記念日（${dayYear(day.date)}年のポスト）`
    : when === "next" ? `次の記念日まで あと${diff}日`
    : "直近の記念日";
  const cases = dayCases(day);

  return (
    <Link href={`/days/${day.date}`}
      className="group mt-2 grid border border-ink bg-white no-underline transition hover:bg-soft md:grid-cols-[1.05fr_1fr]">
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-line bg-soft md:border-r md:border-b-0">
        {img
          ? <CoverImg src={img} />
          : <span className="absolute inset-0 grid place-items-center text-[64px]">{day.emoji ?? <span className="num text-[28px] text-muted">{dayLabel(day.date)}</span>}</span>}
      </div>
      <div className="flex flex-col justify-center px-6 py-6 sm:px-8 sm:py-8">
        <p className="label flex items-center gap-2.5"><span className="h-px w-6 bg-ink" />{eyebrow}</p>
        <div className="mt-4 flex items-end gap-3">
          <span className="num text-[48px] leading-[.9] text-ink sm:text-[56px]">
            {dayMonth(day.date)}.{day.date.slice(8, 10)}
          </span>
          <span className="label pb-1">{dayYear(day.date)}年 {WEEKDAYS_JA[dayWeekday(day.date)]}曜日</span>
        </div>
        <p className="mt-3 text-[14px] font-bold text-ink2">
          {day.emoji && <span className="mr-1.5">{day.emoji}</span>}{day.name}
        </p>
        <h2 className="font-display mt-3 text-[19px] leading-[1.5] text-ink group-hover:text-brand sm:text-[22px]">
          {day.title.join("")}
        </h2>
        <p className="mt-3 text-[12.5px] leading-[1.9] text-muted">{day.theme}を{cases.length || 3}本</p>
        <p className="mt-5 text-[12.5px] font-bold text-ink">記念日を読む →</p>
      </div>
    </Link>
  );
}

/* 1か月のカレンダー。ポストのある日は枠付きの絵文字タイル（押せる）、無い日は薄い数字。きょうは青で示す */
function MonthCalendar({ y, m, days, today }: { y: number; m: number; days: DayPost[]; today: string }) {
  const byDay = new Map(days.map((d) => [parseInt(d.date.slice(8, 10), 10), d]));
  const n = daysInMonth(y, m);
  const lead = dayWeekday(`${y}-${String(m).padStart(2, "0")}-01`);
  const todayNum = today.startsWith(`${y}-${String(m).padStart(2, "0")}-`) ? parseInt(today.slice(8, 10), 10) : -1;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS_JA.map((w) => <span key={w} className="label py-1">{w}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`lead-${i}`} />)}
        {Array.from({ length: n }, (_, i) => i + 1).map((day) => {
          const d = byDay.get(day);
          const isToday = day === todayNum;
          if (!d) {
            return (
              <span key={day}
                className={`tnum flex aspect-[8/9] items-center justify-center rounded-[3px] text-[11px] ${
                  isToday ? "border border-dashed border-brand font-bold text-brand" : "text-muted/60"}`}>
                {day}
              </span>
            );
          }
          return (
            <Link key={day} href={`/days/${d.date}`} title={`${dayLabel(d.date)} ${d.name}`}
              aria-label={`${dayLabel(d.date)} ${d.name}`}
              className={`group relative flex aspect-[8/9] items-center justify-center rounded-[3px] border bg-white no-underline transition hover:bg-ink ${
                isToday ? "border-brand ring-1 ring-brand" : "border-ink"}`}>
              {d.emoji ? (
                <>
                  <span className="num absolute top-[3px] left-[4px] text-[8.5px] leading-none text-muted group-hover:text-white/70">{day}</span>
                  <span className="absolute inset-x-0 bottom-[4px] text-center text-[15px] leading-none">{d.emoji}</span>
                </>
              ) : (
                <span className="num text-[14px] leading-none text-ink group-hover:text-white">{day}</span>
              )}
            </Link>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-2 text-[11px] text-muted">
        <span className="inline-block h-3 w-3 rounded-[2px] border border-ink bg-white" />
        枠のある日にポストがあります
      </p>
    </div>
  );
}

/* 読みものの1行。左に日の数字を大きく立て、中に見出し、右にイラスト */
function DayRow({ d, today }: { d: DayPost; today: string }) {
  const img = dayImage(d);
  const cases = dayCases(d);
  const diff = daysBetween(today, d.date);
  const dayNum = parseInt(d.date.slice(8, 10), 10);
  const isToday = d.date === today;
  const names = cases.map(({ c, linkOnly }) => (linkOnly ? "" : c.customer.name) || vendorLabel(c.vendor)).filter(Boolean);

  return (
    <Link href={`/days/${d.date}`}
      className="row group flex gap-4 border-b border-line2 px-2 py-6 no-underline sm:gap-6">
      {/* 日付 */}
      <div className="w-[52px] shrink-0 sm:w-[64px]">
        <div className={`num text-[34px] leading-none sm:text-[40px] ${isToday ? "text-brand" : "text-ink"}`}>{dayNum}</div>
        <div className="label mt-2 leading-[1.6] whitespace-nowrap">{dayMonth(d.date)}月<br />{WEEKDAYS_JA[dayWeekday(d.date)]}曜</div>
        {isToday && (
          <span className="mt-2 inline-block bg-brand px-1.5 py-0.5 text-[9.5px] font-bold tracking-[.12em] text-white">きょう</span>
        )}
        {diff > 0 && (
          <span className="mt-2 inline-block border border-line px-1.5 py-0.5 text-[9.5px] tracking-[.08em] text-muted">{diff}日後</span>
        )}
      </div>

      {/* 見出し */}
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-ink2">
          {d.emoji && <span className="mr-1.5">{d.emoji}</span>}{d.name}
        </p>
        <h3 className="font-display mt-1.5 text-[17px] leading-[1.55] text-ink group-hover:text-brand sm:text-[19px]">
          {d.title.join("")}
        </h3>
        <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">{d.theme}を{cases.length || 3}本</p>
        {names.length > 0 && (
          <p className="mt-1.5 line-clamp-1 text-[11.5px] text-muted">
            {names.map((nm, i) => (
              <span key={i}>{i > 0 && <span className="mx-1.5 text-line">|</span>}{nm}</span>
            ))}
          </p>
        )}
        {/* スマホはイラストを本文の下に全幅で */}
        <div className="mt-4 sm:hidden"><Thumb img={img} emoji={d.emoji} /></div>
      </div>

      {/* イラスト（sm以上は右に） */}
      <div className="hidden w-[168px] shrink-0 self-start sm:block md:w-[200px]">
        <Thumb img={img} emoji={d.emoji} />
      </div>
    </Link>
  );
}

function Thumb({ img, emoji }: { img?: string; emoji?: string }) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[3px] border border-line2 bg-soft">
      {img
        ? <CoverImg src={img} />
        : <span className="absolute inset-0 grid place-items-center text-[28px]">{emoji ?? ""}</span>}
    </div>
  );
}
