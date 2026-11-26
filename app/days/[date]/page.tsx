import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allDays, dayCases, dayImage, dayLabel, getDay, neighborDays } from "../../../lib/days";
import LinkOnlyCard from "../../../components/LinkOnlyCard";
import CoverImg from "../../../components/CoverImg";
import VendorLogo from "../../../components/VendorLogo";
import VideoBadge, { PlayMark } from "../../../components/VideoBadge";
import { vendorLogo } from "../../../lib/vendors";
import { industryLabel } from "../../../lib/taxonomy";
import { parseStat } from "../../../lib/stat";
import { hasVideo } from "../../../lib/video";
import { withUtm } from "../../../lib/source";
import { introSourceName } from "../../../lib/introSources";
import { ExternalLink } from "lucide-react";

function sourceHost(c: { sourceUrl: string; vendor: string }): string {
  try { return new URL(c.sourceUrl).host.replace(/^www\./, ""); } catch { return c.vendor; }
}

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
    description: `${d.body} ${d.theme}を${dayCases(d).length}つ紹介。`,  // 削除依頼で事例が減った日は2つになる
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
        <Link href="/days" className="border-b border-line no-underline hover:border-ink hover:text-ink">← 事例で読む記念日（一覧）</Link>
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

      {/* 事例3本：事例セレクション（Sen）と同じ組み。〈番号＋ポストの一言〉→〈企業名・業種〉→〈成果の数字〉→
          〈事例ページ（小さな画像つき）と元記事の2段リンク〉。大きな事例カードは使わない。
          linkOnly の事例は、企業名・数字・画像を出さず、元記事へのリンクだけのカードにする */}
      <p className="label mt-10">{d.theme}、{cases.length}本</p>
      <div className="mt-4">
        {cases.map(({ item, c, linkOnly }, i) => {
          const head = (
            <h2 className="flex items-baseline gap-4 border-t-2 border-ink pt-5">
              <span className="num shrink-0 text-[22px] leading-none text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-[17px] leading-[1.6] text-ink sm:text-[18px]">{linkOnly ? item.linkOnly?.note ?? item.note : item.note}</span>
            </h2>
          );
          if (linkOnly) {
            return (
              <section key={c.id} className="mt-12">
                {head}
                <p className="mt-2.5 ml-10 text-[12px] text-muted">
                  {hasVideo(c) && <span className="mr-2.5"><VideoBadge /></span>}
                  {industryLabel(c.customer.industry)}
                </p>
                <div className="mt-4 ml-10"><LinkOnlyCard c={c} campaign="day" content={d.date} /></div>
              </section>
            );
          }
          const results = (c.results ?? []).slice(0, 2);
          return (
            <section key={c.id} className="mt-12">
              {head}
              <p className="mt-2.5 ml-10 text-[12px] text-muted">
                {hasVideo(c) && <span className="mr-2.5"><VideoBadge /></span>}
                {c.customer.name || "導入企業（非公開）"} ・ {industryLabel(c.customer.industry)}
                {c.customer.size && ` ・ ${c.customer.size}`}
              </p>
              {results.length > 0 && (
                <div className="mt-4 ml-10 flex flex-wrap gap-x-8 gap-y-3 border-y border-line py-3.5">
                  {results.map((r, j) => {
                    const st = parseStat(r.value);
                    return (
                      <div key={j} className="min-w-0">
                        <div className="label">{r.metric}</div>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="num max-w-[260px] truncate text-[19px] leading-none text-accent" title={r.value}>{st.head}</span>
                          {st.verb && <span className="text-[11.5px] font-bold text-accent/70">{st.verb}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 ml-10 border border-line2">
                {/* 上段：サイト内の事例ページ（小さな画像・タイトルつき） */}
                <Link href={`/cases/${c.id}`} className="row group flex items-center gap-4 p-2.5 no-underline sm:p-3">
                  <span className="relative block h-16 w-24 shrink-0 overflow-hidden rounded-[3px] border border-line2 bg-soft sm:h-20 sm:w-32">
                    {c.image
                      ? <CoverImg src={c.image} />
                      : (vendorLogo(c.vendor) && <VendorLogo src={vendorLogo(c.vendor)!} size={34} />)}
                    {hasVideo(c) && <PlayMark className="bottom-1.5 left-1.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[12px] leading-[1.6] text-muted sm:line-clamp-1">{c.title}</span>
                    <span className="mt-1.5 block text-[13px] font-bold text-ink group-hover:text-brand">事例ページで要約を見る →</span>
                    <span className="mt-0.5 block text-[11px] text-muted">事例マニア内・課題と成果のまとめ、関連する事例</span>
                  </span>
                </Link>
                {/* 下段：提供元の元記事（外部サイト） */}
                <a href={withUtm(c.sourceUrl, "day", d.date)} target="_blank" rel="noopener" data-case-src={c.id}
                  className="group flex items-center gap-3 border-t border-brand/25 bg-brand-soft px-3 py-2.5 no-underline transition-colors hover:bg-brand/10 sm:px-3.5">
                  <span className="shrink-0 rounded-[2px] bg-brand px-1.5 py-[1px] text-[10px] font-bold tracking-[.08em] text-white">外部サイト</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[13px] font-bold text-brand group-hover:underline">
                      元記事で詳しく読む
                      <ExternalLink size={13} strokeWidth={2.25} aria-hidden className="shrink-0" />
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-[1.6] text-muted sm:truncate">
                      {introSourceName(c.vendor) ? `${introSourceName(c.vendor)}の事例紹介ページ` : "提供元のサイト"}（{sourceHost(c)}）に移動します
                    </span>
                  </span>
                </a>
              </div>
            </section>
          );
        })}
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

      {/* 一覧への入口：前後の日だけでなく、暦（カレンダー）から他の日を選べることをはっきり示す */}
      <section className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border border-ink bg-soft px-6 py-5">
        <div className="min-w-0">
          <p className="label">事例で読む記念日</p>
          <p className="font-display mt-1 text-[16px] leading-snug text-ink sm:text-[17px]">
            ほかの日の記念日も読む。カレンダーから日付で選べます
          </p>
          <p className="mt-1 text-[12px] text-muted">公開中 <span className="num text-ink">{allDays().length}</span> 日分</p>
        </div>
        <Link href="/days"
          className="shrink-0 border border-ink bg-ink px-5 py-2.5 text-[13px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
          記念日の一覧へ →
        </Link>
      </section>
    </article>
  );
}
