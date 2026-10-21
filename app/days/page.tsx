import Link from "next/link";
import { allDays, dayImage, dayLabel } from "../../lib/days";
import CoverImg from "../../components/CoverImg";
import { ListHead } from "../../components/CaseGrid";

export const metadata = {
  title: "事例で読む記念日",
  description: "毎日の記念日にちなんで、掲載事例から3本を選んで紹介する連載。SNSで配信した記念日ポストを1日1ページで読める。",
};

export default function DaysPage() {
  const days = allDays();
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
    .map((m) => ({ m, days: days.filter((d) => parseInt(d.date.slice(0, 2), 10) === m) }))
    .filter((x) => x.days.length > 0);
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <ListHead eyebrow="連載" title="事例で読む記念日"
        sub="その日の記念日にちなんで、掲載事例から3本を選んで紹介する。SNSで配信した記念日ポストを、1日1ページで。" count={days.length} />
      {months.map(({ m, days: ds }) => (
        <section key={m} className="mt-10">
          <h2 className="label border-b border-ink pb-2">{m}月</h2>
          <div className="grid gap-x-6 gap-y-8 pt-6 sm:grid-cols-2 md:grid-cols-3">
            {ds.map((d) => {
              const img = dayImage(d);
              return (
                <Link key={d.date} href={`/days/${d.date}`} className="group block no-underline">
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[3px] border border-line2 bg-soft">
                    {img
                      ? <CoverImg src={img} />
                      : <span className="num absolute inset-0 grid place-items-center text-[22px] text-muted">{dayLabel(d.date)}</span>}
                  </div>
                  <p className="label mt-3"><span className="num text-[12px] text-ink">{dayLabel(d.date)}</span><span className="ml-2">{d.name}</span></p>
                  <h3 className="font-display mt-1.5 text-[16px] leading-[1.55] text-ink group-hover:text-brand">{d.title.join("")}</h3>
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.8] text-muted">{d.theme}を3つ</p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
