import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleForPreview, isPublished } from "../../../../lib/articles";
import ArticleView from "../../../../components/articles/ArticleView";

/* 公開日前の記事のプレビュー。/preview/articles/<slug>?key=<PREVIEW_KEY> でだけ表示する。
   宣伝用ポストの準備（中身・リンクの確認）用。合言葉が違う・未設定なら 404。
   検索エンジンには出さない（noindex ＋ robots.ts で /preview を除外）。
   アクセスのたびに描画するが、使うのは編集側だけなので費用は無視できる。
   ※ 記事の JSON 自体は公開リポジトリにあるので、合言葉は「うっかり見られない」ための鍵 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "プレビュー",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ key?: string }> };

export default async function PreviewArticlePage({ params, searchParams }: Props) {
  const expected = process.env.PREVIEW_KEY;
  const { key } = await searchParams;
  if (!expected || key !== expected) notFound();
  const a = getArticleForPreview(decodeURIComponent((await params).slug));
  if (!a) notFound();

  const published = isPublished(a);
  return (
    <>
      <div style={{ background: published ? "#e6f2ea" : "#fff5d6", borderBottom: "1px solid #c9a227", padding: "10px 16px", fontSize: 13, textAlign: "center" }}>
        プレビュー：{a.draft ? "下書き" : published ? "公開中" : `${a.publishedAt} 公開予定`}　／　本番URL：
        <code style={{ marginLeft: 4 }}>https://vizlabo.com/articles/{a.slug}</code>
      </div>
      <ArticleView article={a} />
    </>
  );
}
