import Link from "next/link";
import { CHALLENGES, INDUSTRIES, industryLabel } from "../lib/taxonomy";
import { allCases, challengeCounts, industryCounts, newestCases, siteStats, tagCounts } from "../lib/cases";
import { challengeStyle } from "../lib/visuals";
import CaseCard from "../components/CaseCard";
import BrowseTabs from "../components/BrowseTabs";
import { allArticles, articleThumb } from "../lib/articles";
import CoverImg from "../components/CoverImg";
import HeroPains from "../components/HeroPains";
import fs from "node:fs";
import path from "node:path";

/* ヒーロー下のバナー（1枚）。note で連載中の「この事例がスゴイ」「事例コラム」への外部リンク。
   href に note のURLを入れると新しいタブで開くリンクになる（未設定なら枠のみ）。
   画像は public/banner/note.png を置けば自動で表示される（比率4:1・1600×400px推奨）。 */
const BANNERS: { file: string; label: string; note: string; href?: string }[] = [
  { file: "note.png", label: "この事例がスゴイ／事例コラム", note: "noteで連載中の2企画", href: "https://note.com/vizlabo" },
];

function Banner({ file, label, note, href }: (typeof BANNERS)[number]) {
  const exists = fs.existsSync(path.join(process.cwd(), "public", "banner", file));
  const inner = exists ? (
    <div className="relative aspect-[4/1] w-full overflow-hidden border border-line">
      <CoverImg src={`/banner/${file}`} />
    </div>
  ) : (
    /* 画像が用意されるまでのプレースホルダー枠 */
    <div className="flex aspect-[4/1] w-full flex-col items-center justify-center gap-1.5 border border-dashed border-line bg-soft">
      <span className="font-display text-[18px] text-ink">{label}</span>
      <span className="text-[11.5px] text-muted">{note}</span>
      <span className="text-[10px] text-muted/70">（バナー準備中：/banner/{file}・1600×400）</span>
    </div>
  );
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
        className="block no-underline transition hover:opacity-90">{inner}</a>
    : inner;
}

export default function Home() {
  const chCounts = challengeCounts();
  const indCounts = industryCounts();
  const s = siteStats();
  const newest = newestCases(4);
  const articles = allArticles().slice(0, 3);
  const browseChallenges = CHALLENGES.map((ch) => ({
    slug: ch.slug, label: ch.label, desc: ch.desc,
    count: chCounts[ch.slug] ?? 0, color: challengeStyle(ch.slug).solid,
  }));
  const browseIndustries = INDUSTRIES.map((ind) => ({
    slug: ind.slug, label: ind.label, count: indCounts[ind.slug] ?? 0,
  }));
  const browseTags = tagCounts().filter(([, n]) => n >= 3).slice(0, 30)
    .map(([tag, count]) => ({ tag, count }));

  return (
    <>
      {/* ── マストヘッド：題字と掲載規模の数字で誌面の格を出す ── */}
      <section className="border-b border-ink">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 md:grid-cols-[1.15fr_.85fr] md:py-20">
          <div>
            <p className="label flex items-center gap-2.5">
              <span className="h-px w-8 bg-ink" />課題から探すBtoB導入事例
            </p>
            <h1 className="font-display mt-6 text-[34px] leading-[1.36] text-ink sm:text-[46px] sm:leading-[1.3]">
              その課題、<br />
              他社はどう解いた？
            </h1>
            <p className="mt-6 max-w-xl text-[14.5px] leading-[2] text-body">
              製品・サービスの選び方から、実際の取り組みまで。<br className="hidden sm:block" />
              他社の事例から、自社に合う解決策を探す。
            </p>

            {/* 掲載規模＝この媒体の信頼の根拠 */}
            <dl className="mt-9 grid grid-cols-2 gap-y-6 border-y border-line py-6 sm:grid-cols-4">
              <Metric n={s.total} unit="件" k="掲載事例" />
              <Metric n={s.vendors} unit="社" k="掲載ベンダー" />
              <Metric n={s.withNumbers} unit="件" k="数値成果あり" />
              <Metric n={s.industries} unit="業種" k="カバー業種" />
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Link href="/cases"
                className="border border-ink bg-ink px-6 py-3 text-[14px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
                事例を探す
              </Link>
              <Link href="/articles"
                className="border-b border-ink pb-0.5 text-[14px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
                同じ課題で、解き方が分かれた理由を読む →
              </Link>
            </div>
          </div>

          {/* 右：具体的な悩みが流れる（クリックでその事例へ） */}
          <div className="hidden md:block">
            <p className="label mb-3.5">こんな悩み、解決した会社があります</p>
            <HeroPains cases={allCases()} />
          </div>
        </div>
      </section>

      {/* ── バナー：note連載への入口。画像は public/banner/note.png を置くだけで反映（4:1、1600×400px推奨）。
           比率は4:1のまま、幅をmax-w-3xlに絞って控えめに置く ── */}
      <section className="mx-auto max-w-6xl px-5 pt-10">
        <div className="mx-auto max-w-3xl">
          {BANNERS.map((b) => <Banner key={b.file} {...b} />)}
        </div>
      </section>

      {/* ── 新着：直近で掲載した事例を、日付つきで ── */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <SectionHead title="新着の解決事例" sub="直近で掲載した事例。掲載日の新しい順" href="/cases" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {newest.map((c) => <CaseCard key={c.id} c={c} showDate />)}
        </div>
      </section>

      {/* ── 読みもの：事例の集積からしか書けない記事 ── */}
      {articles.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <SectionHead title="事例解体新書" sub={`1本の事例では分からないことを、${s.total.toLocaleString()}件の横断から解体して書く連載`} href="/articles" />
          <div className="grid gap-x-10 border-t border-line md:grid-cols-3 md:gap-x-8">
            {articles.map((a) => (
              <Link key={a.slug} href={`/articles/${a.slug}`}
                className="row group block border-b border-line2 px-2 py-5 no-underline">
                <div className="relative mb-3.5 aspect-[5/3] w-full overflow-hidden rounded-[3px] border border-line2 bg-soft">
                  {articleThumb(a)
                    ? <CoverImg src={articleThumb(a)!} />
                    : <span className="num absolute inset-0 grid place-items-center text-[22px] text-muted">#{String(a.no).padStart(3, "0")}</span>}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[11px] text-muted">
                  <span className="num text-[12px] text-ink">#{String(a.no).padStart(3, "0")}</span>
                  {a.sponsored && (
                    <span className="border border-line px-1.5 py-0.5 text-[8.5px] font-bold tracking-widest">Sponsored</span>
                  )}
                </div>
                <h3 className="font-display mt-2 text-[16px] leading-[1.55] text-ink group-hover:text-brand">
                  {a.title.join("")}
                </h3>
                <p className="mt-2 line-clamp-2 text-[12px] leading-[1.85] text-muted">{a.lead}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 探す：課題／困りごと／業種をタブで切り替える（縦に長くしない） ── */}
      <section className="border-y border-line bg-soft">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display mb-7 text-[24px] text-ink sm:text-[28px]">事例を探す</h2>
          <BrowseTabs challenges={browseChallenges} tags={browseTags} industries={browseIndustries} />
        </div>
      </section>

      {/* ── 事例制作代行 ── */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="border border-ink bg-ink px-8 py-14 text-center text-white">
          <p className="label text-white/50">事例制作代行</p>
          <h2 className="font-display mx-auto mt-4 max-w-2xl text-[24px] leading-[1.5] sm:text-[30px]">
            自社の事例が、ここで<br className="sm:hidden" />比較されて選ばれる
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[13.5px] leading-[2] text-white/60">
            課題と成果が伝わる導入事例は、それ自体が最強の営業資料です。
            取材・構成・執筆まで、比較検討で選ばれる事例制作を代行します。
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-6">
            <Link href="/produce"
              className="border border-white bg-white px-7 py-3 text-[14px] font-bold text-ink no-underline transition hover:bg-transparent hover:text-white">
              事例制作を相談する
            </Link>
            <Link href="/contact"
              className="border-b border-white/50 pb-0.5 text-[14px] font-bold text-white no-underline hover:border-white">
              自社の事例を掲載したい →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({ n, unit, k }: { n: number; unit: string; k: string }) {
  return (
    <div>
      <dd className="flex items-baseline gap-1">
        <span className="num text-[30px] leading-none text-ink">{n}</span>
        <span className="text-[12px] text-muted">{unit}</span>
      </dd>
      <dt className="label mt-2">{k}</dt>
    </div>
  );
}

function SectionHead({ title, sub, href }: { title: string; sub: string; href: string }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-5">
      <div>
        <h2 className="font-display text-[24px] text-ink sm:text-[28px]">{title}</h2>
        <p className="mt-1.5 text-[12.5px] text-muted">{sub}</p>
      </div>
      <Link href={href} className="shrink-0 border-b border-ink pb-0.5 text-[12.5px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
        一覧 →
      </Link>
    </div>
  );
}
