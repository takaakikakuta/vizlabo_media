import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PRODUCT_CATEGORIES, PRODUCT_MAP } from "../../../lib/taxonomy";
import { casesByProduct } from "../../../lib/cases";
import CaseGrid, { ListHead } from "../../../components/CaseGrid";

export function generateStaticParams() {
  return PRODUCT_CATEGORIES.map((c) => ({ slug: c.slug }));
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
