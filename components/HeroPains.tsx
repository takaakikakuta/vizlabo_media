import Link from "next/link";
import type { CaseStudy } from "../lib/types";
import { challengeStyle, primaryChallenge } from "../lib/visuals";
import { industryLabel } from "../lib/taxonomy";
import CoverImg from "./CoverImg";
import VendorLogo from "./VendorLogo";
import { vendorLogo } from "../lib/vendors";

/* ヒーロー右側：各事例の「導入前の悩み」が下から上へ流れる。クリックでその事例へ。
   文言は汎用フレーズではなく、その事例の課題文（当サイト要約）の冒頭を実文で切り出す
   ——リンク先の中身と必ず一致させるため。 */

/** 課題文の1文目から、悩みの冒頭を短く切り出す（長ければ読点で切る）。 */
function painFromCase(c: CaseStudy): string {
  const first = (c.challengeDetail || c.summary || c.title).split("。")[0];
  if (first.length <= 36) return first;
  const cut = first.slice(0, 36);
  const comma = cut.lastIndexOf("、");
  return comma >= 14 ? cut.slice(0, comma) : `${cut.slice(0, 33)}…`;
}

type Item = { text: string; href: string; slug: string; industry: string; image?: string; vendor?: string };

export default function HeroPains({ cases }: { cases: CaseStudy[] }) {
  // 課題ごとに束ねて、課題を跨いでラウンドロビン＝色も悩みもバラけて出す。
  const byCh: Record<string, CaseStudy[]> = {};
  for (const c of cases) (byCh[primaryChallenge(c)] ||= []).push(c);
  for (const k of Object.keys(byCh)) byCh[k].sort((a, b) => Number(!!b.image) - Number(!!a.image));
  const keys = Object.keys(byCh);
  const items: Item[] = [];
  let guard = 0;
  while (items.length < 22 && guard < 500) {
    const k = keys[guard % keys.length];
    guard++;
    const c = byCh[k]?.shift();
    if (!c) continue;
    items.push({ text: painFromCase(c), href: `/cases/${c.id}`, slug: k, industry: c.customer.industry, image: c.image, vendor: c.vendor });
  }

  if (!items.length) return null;

  return (
    <div className="marquee-mask relative mx-auto h-[440px] max-w-md overflow-hidden border-y border-line">
      <div className="marquee-track flex flex-col" style={{ ["--dur" as string]: "80s" }}>
        {[...items, ...items].map((it, idx) => (
          <Quote key={idx} it={it} />
        ))}
      </div>
    </div>
  );
}

/* 悩みは“引用”として組む。罫だけで仕切り、誌面の静けさを保つ。 */
function Quote({ it }: { it: Item }) {
  const color = challengeStyle(it.slug).solid;
  const logo = !it.image ? vendorLogo(it.vendor) : undefined;
  return (
    <Link href={it.href}
      className="row group flex items-center gap-3 border-b border-line2 px-4 py-3 no-underline">
      <span className="h-2.5 w-[3px] shrink-0 self-start mt-[7px]" style={{ background: color }} />
      <span className="min-w-0 flex-1">
        <span className="font-display block text-[13.5px] leading-[1.7] text-ink">「{it.text}」</span>
        <span className="mt-1 block text-[10.5px] text-muted group-hover:text-brand">
          {industryLabel(it.industry)}の解決事例へ →
        </span>
      </span>
      {/* 右：その事例の顔（og:image。無ければ提供元ロゴ、それも無ければ課題色タイル） */}
      <span className="relative block h-12 w-16 shrink-0 overflow-hidden rounded-[3px] border border-line2"
        style={{ background: `${color}12` }}>
        {it.image ? <CoverImg src={it.image} /> : (logo && <VendorLogo src={logo} size={26} />)}
      </span>
    </Link>
  );
}
