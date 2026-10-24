import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allArticles, getArticle } from "../../../lib/articles";
import ArticleView from "../../../components/articles/ArticleView";

/* オリジナル記事の本番ルート。format に応じてテンプレートを出し分ける。
   記事を1本増やす＝ content/articles/ にJSONを1つ置く、だけ。 */

/* 予約公開：公開日前の記事は 404。1時間ごとに作り直すので、公開日になれば最大1時間で表に出る
   （ビルド時に無かった記事も、アクセス時に生成される） */
export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return allArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getArticle(decodeURIComponent((await params).slug));
  if (!a) return {};
  return {
    title: `${a.series} #${String(a.no).padStart(3, "0")}｜${a.title.join("")}`,
    description: a.lead.slice(0, 120),
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArticle(decodeURIComponent((await params).slug));
  if (!a) notFound();

  return <ArticleView article={a} />;
}
