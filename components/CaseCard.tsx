import Link from "next/link";
import type { CaseStudy } from "../lib/types";
import { challengeLabel, industryLabel, productLabel } from "../lib/taxonomy";
import { challengeStyle, primaryChallenge } from "../lib/visuals";
import { hasDigit } from "../lib/stat";
import { vendorLabel } from "./Adoption";
import CoverImg from "./CoverImg";
import VendorLogo from "./VendorLogo";
import { vendorLogo } from "../lib/vendors";
import Stat from "./Stat";
import Tags from "./Tags";

/* 新着などで使うカード。上に出典画像（無ければ課題色のタイル）を置いて高さを揃え、
   下に成果の数字を据える。掲載事例の4割は画像を持たないので、画像なしでも成立する組みにしてある。 */
export default function CaseCard({ c, showDate = false }: { c: CaseStudy; showDate?: boolean }) {
  const pc = primaryChallenge(c);
  const color = challengeStyle(pc).solid;
  const top = c.results.find((r) => hasDigit(r.value)) ?? c.results[0];
  const provider = c.product || vendorLabel(c.vendor);
  const customer = c.customer.name || "導入企業（非公開）";

  return (
    <Link href={`/cases/${c.id}`}
      className="card group flex min-w-0 flex-col border border-line bg-white no-underline">
      {/* カバー（16:9）。画像が無ければ課題色タイル＋提供元ロゴで埋める */}
      <div className="relative aspect-[16/9] w-full overflow-hidden" style={{ background: `${color}14` }}>
        <span className="absolute inset-x-0 top-0 z-10 h-[3px]" style={{ background: color }} />
        {c.image
          ? <CoverImg src={c.image} />
          : (vendorLogo(c.vendor) && <VendorLogo src={vendorLogo(c.vendor)!} size={52} />)}
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-4 pb-4 pt-3.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted">
          {showDate && c.collectedAt && (
            <>
              <span className="num text-ink2">{c.collectedAt.slice(0, 10).replace(/-/g, ".")}</span>
              <span className="text-line">|</span>
            </>
          )}
          <span className="font-bold text-ink2">{challengeLabel(pc)}</span>
          <span className="text-line">|</span>
          <span>{industryLabel(c.customer.industry)}</span>
        </div>

        <h3 className="font-display mt-2 line-clamp-3 text-[15.5px] leading-[1.55] text-ink group-hover:text-brand">
          {c.title}
        </h3>

        <div className="mt-2.5 flex min-w-0 items-center gap-1.5 text-[11.5px]">
          <span className="min-w-0 max-w-[48%] truncate font-bold text-ink2">{provider}</span>
          <span className="shrink-0 text-muted">▶</span>
          <span className="min-w-0 flex-1 truncate text-body">{customer}</span>
        </div>

        <div className="mt-auto pt-4">
          {top ? (
            <div className="border-t border-line2 pt-3">
              <Stat r={top} scale="md" />
            </div>
          ) : (
            <div className="border-t border-line2 pt-3 text-[11px] text-muted">
              {productLabel(c.productCategory)}
            </div>
          )}
          <div className="mt-3">
            <Tags c={c} max={2} linkable={false} />
          </div>
        </div>
      </div>
    </Link>
  );
}
