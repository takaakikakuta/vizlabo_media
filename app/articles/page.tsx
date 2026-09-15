import Link from "next/link";
import { allArticles, articleThumb } from "../../lib/articles";
import CoverImg from "../../components/CoverImg";
import { ListHead } from "../../components/CaseGrid";

export const metadata = {
  title: "事例解体新書",
  description: "事例の集積からしか書けないオリジナル連載。課題を解体し、分かれ道の理由と悩みの記録を書く。",
};

export default function ArticlesPage() {
  const articles = allArticles();
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <ListHead eyebrow="連載" title="事例解体新書"
        sub="1本の事例では分からないことを、400件の横断から解体して書く連載。" count={articles.length} />
      <div className="border-t border-line">
        {articles.map((a) => (
          <Link key={a.slug} href={`/articles/${a.slug}`}
            className="row group flex gap-5 border-b border-line2 px-2 py-6 no-underline">
            {/* サムネイル（thumbnail 指定 > 記事内事例の画像 > 号数タイル） */}
            <div className="relative hidden aspect-[5/3] w-40 shrink-0 self-start overflow-hidden rounded-[3px] border border-line2 bg-soft sm:block">
              {articleThumb(a)
                ? <CoverImg src={articleThumb(a)!} />
                : <span className="num absolute inset-0 grid place-items-center text-[15px] text-muted">#{String(a.no).padStart(3, "0")}</span>}
            </div>
            <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11.5px] text-muted">
              <span className="num text-[12px] text-ink">#{String(a.no).padStart(3, "0")}</span>
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
