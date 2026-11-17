import { notFound, permanentRedirect } from "next/navigation";
import ViewBeacon from "../../../components/ViewBeacon";
import type { Metadata } from "next";
import { publishedArticles, getArticle, articleSocial, type Article } from "../../../lib/articles";
import Wakaremichi from "../../../components/articles/Wakaremichi";
import Genba from "../../../components/articles/Genba";
import Dounyumae from "../../../components/articles/Dounyumae";
import Chizu from "../../../components/articles/Chizu";
import Ekkyou from "../../../components/articles/Ekkyou";
import Butaiura from "../../../components/articles/Butaiura";
import Sen from "../../../components/articles/Sen";

/* オリジナル記事の本番ルート。format に応じてテンプレートを出し分ける。
   記事を1本増やす＝ content/articles/ にJSONを1つ置く、だけ。 */

export function generateStaticParams() {
  return publishedArticles().filter((a) => a.format !== "yougo").map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getArticle(decodeURIComponent((await params).slug));
  if (!a) return {};
  const title = `${a.series} #${String(a.no).padStart(3, "0")}｜${a.title.join("")}`;
  const description = a.lead.slice(0, 120);
  return { title, description, ...articleSocial(a, title, description, `/articles/${a.slug}`) };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArticle(decodeURIComponent((await params).slug));
  if (!a) notFound();
  if (a.format === "yougo") permanentRedirect(`/terms/${a.slug}`);  // 用語記事は別の連載（/terms）

  return <>
    {/* 記事の閲覧数の計測（/admin/views とベンダーのダッシュボードで見る） */}
    <ViewBeacon id={a.slug} kind="article" />
    {body(a)}
  </>;
}

function body(a: Article) {
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
    case "sen":
      return <Sen article={a} />;
    default:
      notFound();
  }
}
