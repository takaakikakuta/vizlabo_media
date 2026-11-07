import Link from "next/link";
import { allTermArticles, articleThumb } from "../../lib/articles";
import { siteStats } from "../../lib/cases";
import CoverImg from "../../components/CoverImg";
import { ListHead } from "../../components/CaseGrid";

/* 「事例でわかる技術用語」の一覧。事例セレクション（/articles）とは別の連載。
   記事は公開日（publishedAt）の当日から並ぶので、1時間ごとに作り直す */
export const revalidate = 3600;

export const metadata = {
  title: "事例でわかる技術用語",
  description: "「〇〇とは」で検索した人向けに、技術用語の説明と、その用語で課題を解いた導入事例を1記事にまとめた連載。",
};

export default function TermsPage() {
  const articles = allTermArticles();
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <ListHead eyebrow="連載" title="事例でわかる技術用語"
        sub={`用語の説明だけで終わらせない。${siteStats().total.toLocaleString()}件の事例から、その用語で課題を解いた会社を添えて書く連載。`} count={articles.length} />
      <div className="border-t border-line">
        {articles.map((a) => (
          <Link key={a.slug} href={`/terms/${a.slug}`}
            className="row group flex flex-col gap-4 border-b border-line2 px-2 py-6 no-underline sm:flex-row sm:gap-5">
            <div className="relative aspect-video w-full shrink-0 self-start overflow-hidden rounded-[3px] border border-line2 bg-soft sm:w-40">
              {articleThumb(a)
                ? <CoverImg src={articleThumb(a)!} />
                : <span className="font-display absolute inset-0 grid place-items-center px-3 text-center text-[20px] leading-tight text-ink sm:text-[15px]">{a.term}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11.5px] text-muted">
                <span className="num text-[12px] text-ink">#{String(a.no).padStart(3, "0")}</span>
                <span className="font-display tracking-[.12em]">{a.term}</span>
                {a.sponsored && (
                  <span className="border border-line px-1.5 py-0.5 text-[9px] font-bold tracking-widest">Sponsored</span>
                )}
                <span className="num ml-auto">{a.publishedAt.replace(/-/g, ".")}</span>
              </div>
              <h2 className="font-display mt-2 text-[19px] leading-[1.5] text-ink group-hover:text-brand">
                {a.title.join("")}
              </h2>
              <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-[1.9] text-muted">{a.lead}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
