import { ExternalLink } from "lucide-react";
import type { CaseStudy } from "../lib/types";
import { vendorLogo } from "../lib/vendors";
import { withUtm } from "../lib/source";
import VendorLogo from "./VendorLogo";
import { PlayMark } from "./VideoBadge";
import { hasVideo } from "../lib/video";
import { introSourceName } from "../lib/introSources";
import { slotLink } from "../lib/slotAttrs";

/* リンクのみ（linkOnly）の事例のカード。掲載元から取り下げ依頼を受けた事例は、
   企業名・数字・掲載元の画像を出さず、提供元ロゴと元記事への直リンクだけにする（元記事に動画があれば再生マークだけ重ねる）。
   通常の事例カード（サイト内の要約ページへ飛ぶ）と取り違えないよう、外部サイトへの直リンクであることを
   「外部サイト」の印・リンク先のドメイン・外部リンクのアイコンつきボタンで見せる。
   campaign/content は元記事URLに付ける UTM（どの記事・どの日から来たかが掲載元の解析で分かる）。
   c.linkUrl がある（提供元から個別ページへのリンクも断られ、一覧ページへのリンクを依頼された）ときは、
   リンク先をそのURLにし、「提供元のご依頼により導入事例一覧にリンクしている」と書く（個別の事例を案内しているように見せない）。
   slot は事例セレクション・用語記事の枠位置（渡すと枠の計測用の data 属性を付ける。lib/slotAttrs.ts） */
export default function LinkOnlyCard({ c, campaign, content, slot }: { c: CaseStudy; campaign: string; content: string; slot?: number }) {
  const logo = vendorLogo(c.vendor);
  const url = c.linkUrl ?? c.sourceUrl;
  let host = c.vendor;
  try { host = new URL(url).host; } catch {}
  const source = c.linkUrl ? "掲載元のご依頼により、導入事例の一覧ページにリンクしています"
    : introSourceName(c.vendor) ? `${introSourceName(c.vendor)}の事例紹介ページに移動します` : "掲載元の事例ページに移動します";
  return (
    <a href={withUtm(url, campaign, content)} target="_blank" rel="noopener" data-case-src={c.id} {...(slot ? slotLink(slot, c, "src") : {})}
      className="group flex items-center gap-3.5 rounded-[4px] border border-brand/30 bg-brand-soft p-3 no-underline transition-colors hover:border-brand sm:gap-4 sm:p-3.5">
      <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-[3px] border border-line bg-white sm:h-[72px] sm:w-[72px]">
        {logo && <VendorLogo src={logo} size={40} />}
        {hasVideo(c) && <PlayMark className="bottom-1 left-1" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="shrink-0 rounded-[2px] bg-brand px-1.5 py-[1px] text-[10px] font-bold tracking-[.08em] text-white">外部サイト</span>
          <span className="truncate text-[12px] text-muted">{host}</span>
        </span>
        <span className={`mt-1.5 block text-[12.5px] text-body ${c.linkUrl ? "leading-[1.6]" : "truncate"}`}>{source}</span>
        <span className="mt-1 flex items-center gap-1 text-[13.5px] font-bold text-brand group-hover:underline">
          {c.linkUrl ? "掲載元の導入事例一覧を見る" : "掲載元でこの事例を読む"}
          <ExternalLink size={14} strokeWidth={2.25} aria-hidden className="shrink-0" />
        </span>
      </span>
    </a>
  );
}
