import { notFound } from "next/navigation";
import type { Article } from "../../lib/articles";
import Wakaremichi from "./Wakaremichi";
import Genba from "./Genba";
import Dounyumae from "./Dounyumae";
import Chizu from "./Chizu";
import Ekkyou from "./Ekkyou";
import Butaiura from "./Butaiura";
import Sen from "./Sen";

/* 記事の format に応じてテンプレートを出し分ける。本番ルートとプレビューで共用 */
export default function ArticleView({ article: a }: { article: Article }) {
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
