import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { publishedArticles, getArticle } from "../../../lib/articles";
import Yougo from "../../../components/articles/Yougo";

/* 「事例でわかる技術用語」の記事ページ。事例セレクション（/articles/[slug]）とは別の連載。
   記事を1本増やす＝ content/articles/ に format: "yougo" のJSONを1つ置く、だけ。 */

export function generateStaticParams() {
  return publishedArticles().filter((a) => a.format === "yougo").map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getArticle(decodeURIComponent((await params).slug));
  if (!a || a.format !== "yougo") return {};
  return {
    title: `${a.title.join("")}｜${a.series}`,
    description: a.description,  // 書き下ろしの meta description（120字以内）
  };
}

export default async function TermPage({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArticle(decodeURIComponent((await params).slug));
  if (!a || a.format !== "yougo") notFound();
  return <Yougo article={a} />;
}
