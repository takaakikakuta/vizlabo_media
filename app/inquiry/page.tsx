import Link from "next/link";
import type { Metadata } from "next";
import { getArticle, articleServices } from "../../lib/articles";
import { productLabel } from "../../lib/taxonomy";
import { vendorLabel } from "../../components/Adoption";
import InquiryForm from "../../components/InquiryForm";
import { ListHead } from "../../components/CaseGrid";

export const metadata: Metadata = {
  title: "まとめて問い合わせ",
  description: "記事に登場したサービスの提供企業へ、事例ナビ編集部がまとめてお取り次ぎします。",
};

/* 記事に登場したサービスへの一括問い合わせ。?a=<記事slug> で対象記事を受け取り、
   サービス一覧（チェックボックス）を組み立てる。記事が無ければ通常の問い合わせへ案内する。 */
export default async function InquiryPage({ searchParams }: {
  searchParams: Promise<{ a?: string }>;
}) {
  const { a } = await searchParams;
  const article = a ? getArticle(a) : undefined;
  const services = article ? articleServices(article) : [];

  if (!article || services.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12">
        <ListHead eyebrow="お問い合わせ" title="まとめて問い合わせ"
          sub="このページは、事例セレクションの記事末尾からご利用いただけます。" />
        <p className="mt-6 text-[13.5px] leading-[2] text-body">
          対象の記事が見つかりませんでした。記事の末尾にある「この記事に登場したサービス」からお進みください。
        </p>
        <div className="mt-8 flex flex-wrap gap-6">
          <Link href="/articles"
            className="border border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            事例セレクションの記事一覧へ
          </Link>
          <Link href="/contact"
            className="self-center border-b border-ink pb-0.5 text-[13.5px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
            通常のお問い合わせはこちら →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <ListHead eyebrow="お問い合わせ" title="まとめて問い合わせ"
        sub={`「${article.title.join("")}」に登場したサービスの提供企業へ、編集部がまとめてお取り次ぎします。`} />
      <p className="mt-5 border border-line2 px-4 py-3 text-[11.5px] leading-[1.9] text-muted">
        出発点の記事：<Link href={`/articles/${article.slug}`}
          className="border-b border-line pb-0.5 text-ink no-underline hover:border-ink">
          {article.series} #{String(article.no).padStart(3, "0")}｜{article.title.join("")}
        </Link>
      </p>
      <div className="mt-8">
        <InquiryForm
          articleSlug={article.slug}
          services={services.map((s) => ({
            label: `${s.name}（${vendorLabel(s.vendor)}）`,
            category: productLabel(s.category),
          }))}
        />
      </div>
    </div>
  );
}
