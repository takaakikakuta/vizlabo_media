import Link from "next/link";
import type { Article } from "../../lib/articles";
import { articleServices } from "../../lib/articles";
import { productLabel } from "../../lib/taxonomy";
import { vendorLabel } from "../Adoption";

/* 記事末尾の「この記事に登場したサービス」。
   紹介は掲載データの範囲（サービス名・提供元・カテゴリ・記事内の事例リンク）にとどめ、
   宣伝文・推薦文は書かない。まとめて問い合わせ（/inquiry）への入口を兼ねる。 */
export default function FeaturedServices({ article }: { article: Article }) {
  const services = articleServices(article);
  if (services.length === 0) return null;

  return (
    <section className="mt-14 border-t border-line pt-6">
      <p className="label mb-1.5">この記事に登場したサービス</p>
      <p className="text-[11.5px] leading-relaxed text-muted">
        記事で取り上げた事例で導入されていたサービスの一覧です（掲載データに基づく表記で、優劣や推奨を示すものではありません）。
      </p>
      <div className="mt-4 border-t border-line">
        {services.map((s) => (
          <div key={`${s.vendor}-${s.name}`}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line2 px-2 py-3">
            <span className="font-display text-[14.5px] text-ink">{s.name}</span>
            <span className="text-[11.5px] text-muted">{vendorLabel(s.vendor)} ・ {productLabel(s.category)}</span>
            <Link href={`/cases/${s.caseId}`}
              className="ml-auto shrink-0 text-[11.5px] text-body no-underline hover:text-ink">
              <span className="border-b border-line pb-0.5">記事内の事例 →</span>
            </Link>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-5">
        <Link href={`/inquiry?a=${encodeURIComponent(article.slug)}`}
          className="border border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
          気になるサービスにまとめて問い合わせる
        </Link>
        <p className="text-[11px] leading-relaxed text-muted">
          チェックを付けたサービスの提供企業へ、編集部がまとめてお取り次ぎします。
        </p>
      </div>
    </section>
  );
}
