import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allArticles, getArticle } from "../../../lib/articles";
import Wakaremichi from "../../../components/articles/Wakaremichi";
import Genba from "../../../components/articles/Genba";
import Dounyumae from "../../../components/articles/Dounyumae";
import Chizu from "../../../components/articles/Chizu";
import Ekkyou from "../../../components/articles/Ekkyou";
import Butaiura from "../../../components/articles/Butaiura";

/* オリジナル記事の本番ルート。format に応じてテンプレートを出し分ける。
   記事を1本増やす＝ content/articles/ にJSONを1つ置く、だけ。 */

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

  switch (a.format) {
    case "wakaremichi":
      return <Wakaremichi article={a} />;
    case "genba":
      return <Genba article={a} />;
    case "dounyumae":
      return <Dounyumae article={a} />;
    case "chizu":
      return <Chizu article={a} />;
    case "ekkyou":
      return <Ekkyou article={a} />;
    case "butaiura":
      return <Butaiura article={a} />;
    default:
      notFound();
  }
}
