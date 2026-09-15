import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PRODUCT_CATEGORIES, PRODUCT_MAP } from "../../../lib/taxonomy";
import { casesByProduct } from "../../../lib/cases";
import CaseGrid, { ListHead } from "../../../components/CaseGrid";

/* ビルド出力の肥大化対策（Amplifyの220MB制限）:
   事前生成をやめ、初回アクセス時に生成してキャッシュするオンデマンドISRにする。
   revalidate 後は再生成されるので、データ更新はデプロイ or 24時間で反映される。 */
export const revalidate = 86400; // 24時間
export const dynamicParams = true;

export function generateStaticParams() {
  return []; // ビルド時は生成しない（オンデマンドで生成）
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = PRODUCT_MAP[slug];
  if (!t) return {};
  return { title: `${t.label}の導入事例`, description: `${t.label}を使った課題解決事例をまとめています。` };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = PRODUCT_MAP[slug];
  if (!t) notFound();
  const cases = casesByProduct(slug);
  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <ListHead eyebrow="製品カテゴリから探す" title={`${t.label}の導入事例`} count={cases.length} />
      <CaseGrid cases={cases} />
    </div>
  );
}
