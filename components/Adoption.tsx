import type { CaseStudy } from "../lib/types";

/* 「どの製品(提供元) → どの会社(導入先)」を一目で。カード＝1行、詳細＝ラベル付きの対置。 */

const TLD = /\.(co\.jp|or\.jp|ne\.jp|go\.jp|jp|com|co|io|inc|net|biz|cloud|ai|tech)$/i;
export function vendorLabel(v?: string): string {
  if (!v) return "";
  const m = v.replace(TLD, "");
  return m.split(".").slice(-1)[0] || v;
}

export default function Adoption({ c, size = "card" }: { c: CaseStudy; size?: "card" | "detail" }) {
  const provider = c.product || vendorLabel(c.vendor);
  const customer = c.customer.name || "導入企業（非公開）";

  if (size === "detail") {
    return (
      <div className="grid grid-cols-1 items-stretch border-y border-line sm:grid-cols-[1fr_auto_1fr]">
        <div className="py-5 sm:pr-6">
          <div className="label">提供（製品）</div>
          <div className="font-display mt-2 text-[19px] leading-snug text-ink">{provider}</div>
          {c.vendor && <div className="mt-1 text-[12px] text-muted">{vendorLabel(c.vendor)}</div>}
        </div>
        <div className="flex items-center justify-center border-y border-line py-2 text-muted sm:border-x sm:border-y-0 sm:px-6 sm:py-0">
          <span className="rotate-90 text-[15px] sm:rotate-0">▶</span>
        </div>
        <div className="py-5 sm:pl-6">
          <div className="label">導入（顧客）</div>
          <div className="font-display mt-2 text-[19px] leading-snug text-ink">{customer}</div>
          {c.customer.size && <div className="mt-1 text-[12px] text-muted">{c.customer.size}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="max-w-[45%] truncate font-bold text-ink2">{provider}</span>
      <span className="shrink-0 text-muted">▶</span>
      <span className="max-w-[52%] truncate text-body">{customer}</span>
    </div>
  );
}
