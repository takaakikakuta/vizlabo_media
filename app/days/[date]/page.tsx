import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allDays, dayCases, dayImage, dayLabel, getDay, neighborDays } from "../../../lib/days";
import CaseCard from "../../../components/CaseCard";

/* 記念日ページ。content/days/MM-DD.json を置けば生える。全日をビルド時に静的生成する（最大365ページ） */
export const dynamicParams = false;

export function generateStaticParams() {
  return allDays().map((d) => ({ date: d.date }));
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const d = getDay((await params).date);
  if (!d) return {};
  const img = dayImage(d);
  const title = `${dayLabel(d.date)}は${d.name}。${d.title.join("")}`;
  return {
    title,
    description: `${d.body} ${d.theme}を3つ紹介。`,
    openGraph: { title, description: d.body, type: "article", ...(img ? { images: [{ url: img }] } : {}) },
    twitter: { card: img ? "summary_large_image" : "summary" },
  };
}

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const d = getDay(date);
  if (!d) notFound();
  const img = dayImage(d);
  const cases = dayCases(d);
  const { prev, next } = neighborDays(date);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* 扉 */}
      <p className="label flex items-center gap-2.5">
        <Link href="/days" className="no-underline hover:text-ink">事例で読む記念日</Link>
        <span className="h-px w-6 bg-line" />
        <span className="num text-[12px] text-ink">{dayLabel(d.date)}</span>
        <span>{d.name}</span>
      </p>

      {img && (
        <div className="mt-6 overflow-hidden rounded-[3px] border border-line2 bg-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={`${d.name}のイラスト`} className="h-auto w-full" />
        </div>
      )}

      {/* 冒頭：この日が記念日になった由来と、なぜこの事例を選んだか（intro。段落ごとに配列） */}
      {d.intro && d.intro.length > 0 && (
        <div className="mt-8 border-y border-line py-5">
          <p className="label">{dayLabel(d.date)}が「{d.name}」なのは</p>
          {d.intro.map((p, i) => (
            <p key={i} className="mt-3 text-[14px] leading-[2] text-body">{p}</p>
          ))}
        </div>
      )}

      {/* 書き出し（title/body）はページには出さない。OGPのタイトルと一覧の見出しにだけ使う */}
      <h1 className="sr-only">{dayLabel(d.date)}は{d.name}。{d.title.join("")}</h1>

      {/* 事例3本：ポストの一言＋事例カード（会社名・数字・リンクはカードが出す） */}
      <p className="label mt-10">{d.theme}、{cases.length}本</p>
      <div className="mt-3 border-t border-ink">
        {cases.map(({ item, c }, i) => (
          <div key={c.id} className="border-b border-line2 py-6">
            {/* ポストの一言＝この事例の見出し。カードより目立つように大きく太く */}
            <h2 className="flex items-start gap-3">
              <span className="num mt-1.5 shrink-0 text-[12px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-[19px] leading-[1.55] text-ink sm:text-[21px]">
                {d.emoji && <span className="mr-1.5">{d.emoji}</span>}{item.note}
              </span>
            </h2>
            <div className="mt-4"><CaseCard c={c} /></div>
          </div>
        ))}
      </div>

      {d.more && (
        <p className="mt-8">
          <Link href={d.more.href}
            className="border-b border-ink pb-0.5 text-[14px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
            {d.more.label} →
          </Link>
        </p>
      )}

      {/* 前の日／次の日 */}
      {(prev || next) && (
        <nav className="mt-12 flex items-stretch justify-between gap-4 border-y border-line py-5 text-[13px]">
          {prev ? (
            <Link href={`/days/${prev.date}`} className="group min-w-0 no-underline">
              <span className="label">← 前の記念日</span>
              <span className="mt-1 block truncate text-ink group-hover:text-brand"><span className="num">{dayLabel(prev.date)}</span> {prev.name}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/days/${next.date}`} className="group min-w-0 text-right no-underline">
              <span className="label">次の記念日 →</span>
              <span className="mt-1 block truncate text-ink group-hover:text-brand"><span className="num">{dayLabel(next.date)}</span> {next.name}</span>
            </Link>
          ) : <span />}
        </nav>
      )}

    </article>
  );
}
