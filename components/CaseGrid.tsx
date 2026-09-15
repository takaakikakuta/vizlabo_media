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

/* 一覧は“比較して読む”ための行リスト。カード網ではなく罫で仕切った誌面にして、
   400件を上から下へスキャンできるようにする。右端に成果の数字を揃えるのが要点。 */
export default function CaseGrid({ cases, showDate = false }:
  { cases: CaseStudy[]; showDate?: boolean }) {
  if (!cases.length) {
    return (
      <div className="border-y border-line py-14 text-center">
        <p className="text-[14px] text-body">この条件の事例はまだ掲載されていません。</p>
        <Link href="/produce"
          className="mt-5 inline-block border-b border-ink pb-0.5 text-[13px] font-bold text-ink no-underline hover:text-brand hover:border-brand">
          自社の事例を制作・掲載する →
        </Link>
      </div>
    );
  }
  return (
    <div className="border-t border-line">
      {cases.map((c) => (
        <div key={c.id} data-search={searchKey(c)} data-facet={facetKey(c)}>
          <CaseRow c={c} showDate={showDate} />
        </div>
      ))}
    </div>
  );
}

/* チップ絞り込み（CaseSearch）が完全一致で照合するトークン列 */
function facetKey(c: CaseStudy): string {
  return [
    ...c.challenges.map((ch) => `c:${ch}`),
    `i:${c.customer.industry}`,
    ...(c.tags ?? []).map((t) => `t:${t}`),
  ].join(" ");
}

/* 検索窓（CaseSearch）が照合する索引文字列。行に埋め込んでクライアントで絞る */
function searchKey(c: CaseStudy): string {
  return [
    c.title, c.summary, c.product, c.customer.name, c.vendor,
    industryLabel(c.customer.industry), productLabel(c.productCategory),
    ...c.challenges.map(challengeLabel), ...(c.tags ?? []),
  ].filter(Boolean).join(" ").toLowerCase();
}

/* 一覧の1行。左＝出典画像（無ければ課題色のタイル）／中＝見出し／右＝成果の数字。 */
export function CaseRow({ c, showDate = false }: { c: CaseStudy; showDate?: boolean }) {
  const pc = primaryChallenge(c);
  const color = challengeStyle(pc).solid;
  const top = c.results.find((r) => hasDigit(r.value)) ?? c.results[0];
  const provider = c.product || vendorLabel(c.vendor);
  const customer = c.customer.name || "導入企業（非公開）";

  return (
    <Link href={`/cases/${c.id}`}
      className="row group flex gap-4 border-b border-line2 px-2 py-5 no-underline sm:gap-5 sm:px-3">
      {/* 出典画像（無い事例も“穴”に見えないよう、課題色のタイルで埋める） */}
      <div className="relative hidden h-[72px] w-[96px] shrink-0 overflow-hidden rounded-[3px] sm:block"
        style={{ background: `${color}14` }}>
        <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} />
        {c.image
          ? <CoverImg src={c.image} />
          : (vendorLogo(c.vendor) && <VendorLogo src={vendorLogo(c.vendor)!} size={36} />)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted">
          {showDate && c.collectedAt && (
            <>
              <span className="num text-ink2">{c.collectedAt.slice(0, 10).replace(/-/g, ".")}</span>
              <span className="text-line">|</span>
            </>
          )}
          <span className="inline-flex items-center gap-1.5 font-bold text-ink2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {challengeLabel(pc)}
          </span>
          <span className="text-line">|</span>
          <span>{industryLabel(c.customer.industry)}</span>
          {c.customer.size && <><span className="text-line">|</span><span>{c.customer.size}</span></>}
          <span className="text-line">|</span>
          <span>{productLabel(c.productCategory)}</span>
        </div>

        <h3 className="font-display mt-1.5 text-[16.5px] leading-[1.5] text-ink group-hover:text-brand sm:text-[17.5px]">
          {c.title}
        </h3>

        <div className="mt-2 flex items-center gap-2 text-[12px]">
          <span className="max-w-[44%] truncate font-bold text-ink2">{provider}</span>
          <span className="shrink-0 text-muted">▶</span>
          <span className="max-w-[52%] truncate text-body">{customer}</span>
        </div>

        <p className="mt-2 line-clamp-1 text-[12.5px] leading-relaxed text-muted">{c.summary}</p>

        {/* 困りごとタグ＝「うちと同じだ」を見つけるための手がかり */}
        <div className="mt-2.5">
          <Tags c={c} max={4} linkable={false} />
        </div>
      </div>

      {/* 右端に数字を揃える＝行を跨いで成果を比較できる。
          成果の数字が無い事例は、導入規模を控えめな灰色で出す（緑＝成果と区別する）。 */}
      <div className="hidden w-[132px] shrink-0 self-center md:block">
        {top ? <Stat r={top} scale="lg" align="right" /> : <NoStat c={c} />}
      </div>
    </Link>
  );
}

/* 成果の数字を持たない事例の右端。導入規模があればそれを、無ければ定性成果と示す。
   ここで緑（成果の色）は使わない＝数字の意味を取り違えさせないため。 */
function NoStat({ c }: { c: CaseStudy }) {
  const sc = c.scale?.[0];
  if (!sc) return <div className="text-right text-[12px] text-muted">定性成果</div>;
  return (
    <div className="text-right">
      <div className="label line-clamp-2 leading-snug">{sc.metric}</div>
      <div className="num mt-1.5 line-clamp-2 text-[15px] leading-snug text-muted">{sc.value}</div>
      <div className="mt-1 text-[10px] text-muted">導入規模</div>
    </div>
  );
}

/* ページ見出し（一覧ページ共通）。誌面のマストヘッド。 */
export function ListHead({ eyebrow, title, sub, count }:
  { eyebrow?: string; title: string; sub?: string; count?: number }) {
  return (
    <div className="mb-9 border-b border-ink pb-6">
      {eyebrow && (
        <p className="label mb-3 flex items-center gap-2.5">
          <span className="h-px w-6 bg-ink" />{eyebrow}
        </p>
      )}
      <h1 className="font-display text-[28px] leading-[1.3] text-ink sm:text-[38px]">{title}</h1>
      {sub && <p className="mt-3 max-w-2xl text-[14px] leading-[1.9] text-body">{sub}</p>}
      {count != null && (
        <p className="mt-4 text-[12px] text-muted">
          <span className="num text-[15px] text-ink">{count}</span> 件を掲載
        </p>
      )}
    </div>
  );
}
