import Link from "next/link";
import { INDUSTRIES } from "../../lib/taxonomy";
import { industryCounts } from "../../lib/cases";
import { ListHead } from "../../components/CaseGrid";

export const metadata = { title: "業種から探す" };

export default function IndustriesPage() {
  const counts = industryCounts();
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <ListHead eyebrow="業種から探す" title="業種から導入事例を探す"
        sub="自社と近い業種の実例に絞って探せます。" />
      <div className="grid gap-x-14 border-t border-line md:grid-cols-2">
        {INDUSTRIES.map((ind) => (
          <Link key={ind.slug} href={`/industry/${ind.slug}`}
            className="row group flex items-baseline justify-between gap-4 border-b border-line2 px-2 py-4 no-underline">
            <span className="font-display text-[16px] text-ink group-hover:text-brand">{ind.label}</span>
            <span className="num text-[15px] text-ink2">{counts[ind.slug] ?? 0}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
