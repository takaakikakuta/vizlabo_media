import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { INDUSTRIES, INDUSTRY_MAP } from "../../../lib/taxonomy";
import { casesByIndustry } from "../../../lib/cases";
import CaseGrid, { ListHead } from "../../../components/CaseGrid";

export function generateStaticParams() {
  return INDUSTRIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = INDUSTRY_MAP[slug];
  if (!t) return {};
  return {
    title: `${t.label}の導入事例`,
    description: `${t.label}の課題解決・導入事例をまとめています。成果の数字つきで、近い業種の実例を探せます。`,
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = INDUSTRY_MAP[slug];
  if (!t) notFound();
  const cases = casesByIndustry(slug);
  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <ListHead eyebrow="業種から探す" title={`${t.label}の導入事例`}
        sub={`${t.label}での課題解決の実例。自社と近い業種の事例から、何でどう解決したかを探せます。`}
        count={cases.length} />
      <CaseGrid cases={cases} />
    </div>
  );
}
