import type { CaseStudy } from "../lib/types";
import { vendorLogo } from "../lib/vendors";
import { withUtm } from "../lib/source";
import VendorLogo from "./VendorLogo";

/* リンクのみ（linkOnly）の事例のカード。掲載元から取り下げ依頼を受けた事例は、
   企業名・数字・掲載元の画像を出さず、提供元ロゴと元記事への直リンクだけにする。
   campaign/content は元記事URLに付ける UTM（どの記事・どの日から来たかが掲載元の解析で分かる） */
export default function LinkOnlyCard({ c, campaign, content }: { c: CaseStudy; campaign: string; content: string }) {
  const logo = vendorLogo(c.vendor);
  return (
    <a href={withUtm(c.sourceUrl, campaign, content)} target="_blank" rel="noopener"
      className="row group flex items-center gap-4 border border-line2 p-2.5 no-underline sm:p-3">
      <span className="relative block h-20 w-32 shrink-0 overflow-hidden rounded-[3px] border border-line2 bg-soft">
        {logo && <VendorLogo src={logo} size={34} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] text-muted">掲載元：{c.product || c.vendor}（{c.vendor}）</span>
        <span className="mt-1.5 block text-[13px] font-bold text-ink group-hover:text-brand">
          この事例を掲載元で読む ↗
        </span>
      </span>
    </a>
  );
}
