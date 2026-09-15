import type { CaseStudy } from "./types";
import raw from "../data/cases.json";

/* 事例データの読み込み・絞り込み。今はリポジトリ内 JSON を静的に読む（SEO重視・DB不要）。
   件数が増えたら DB/CMS に差し替えても、この関数群のIFを保てば上位は変えずに済む。 */

const ALL = raw as CaseStudy[];

/** 数字あり優先 → 収集日の新しい順 → ID順。
    同日が多数あるため、最後のID順まで決めておかないと
    JSONの物理順（過去のマージ手順の名残）が漏れ出て並びが不安定になる。 */
export function allCases(): CaseStudy[] {
  return [...ALL].sort((a, b) => {
    if (a.hasNumbers !== b.hasNumbers) return a.hasNumbers ? -1 : 1;
    const d = (b.collectedAt || "").localeCompare(a.collectedAt || "");
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });
}

export function getCase(id: string): CaseStudy | undefined {
  return ALL.find((c) => c.id === id);
}

export function casesByChallenge(slug: string): CaseStudy[] {
  return allCases().filter((c) => c.challenges.includes(slug));
}

export function casesByIndustry(slug: string): CaseStudy[] {
  return allCases().filter((c) => c.customer.industry === slug);
}

export function casesByProduct(slug: string): CaseStudy[] {
  return allCases().filter((c) => c.productCategory === slug);
}

/** 課題スラッグ→件数（TOPのグリッドで件数バッジに使う）。 */
export function challengeCounts(): Record<string, number> {
  const m: Record<string, number> = {};
  for (const c of ALL) for (const ch of c.challenges) m[ch] = (m[ch] || 0) + 1;
  return m;
}

export function industryCounts(): Record<string, number> {
  const m: Record<string, number> = {};
  for (const c of ALL) m[c.customer.industry] = (m[c.customer.industry] || 0) + 1;
  return m;
}

/** 関連事例（同じ課題を1つ以上共有、自分を除く）。詳細ページ下部用。 */
export function relatedCases(base: CaseStudy, limit = 3): CaseStudy[] {
  return allCases()
    .filter((c) => c.id !== base.id && c.challenges.some((ch) => base.challenges.includes(ch)))
    .slice(0, limit);
}

/** トップの見出し数字（掲載規模を一目で示す）。 */
export function siteStats() {
  const withNumbers = ALL.filter((c) => c.hasNumbers).length;
  return {
    total: ALL.length,
    vendors: new Set(ALL.map((c) => c.vendor)).size,
    withNumbers,
    industries: new Set(ALL.map((c) => c.customer.industry)).size,
  };
}

/** 新着＝収集日の新しい順。同じ日の中では数値成果がある事例を先に出す。 */
export function newestCases(limit?: number): CaseStudy[] {
  const sorted = [...ALL].sort((a, b) => {
    const d = (b.collectedAt || "").localeCompare(a.collectedAt || "");
    if (d !== 0) return d;
    if (a.hasNumbers !== b.hasNumbers) return a.hasNumbers ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
  return limit ? sorted.slice(0, limit) : sorted;
}

/* ── 困りごとタグ（12カテゴリより細かい索引） ───────────────────────── */

/** タグ→件数。多い順。 */
export function tagCounts(): [string, number][] {
  const m: Record<string, number> = {};
  for (const c of ALL) for (const t of c.tags ?? []) m[t] = (m[t] || 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function casesByTag(tag: string): CaseStudy[] {
  return allCases().filter((c) => (c.tags ?? []).includes(tag));
}

/** ページを作るタグ＝2件以上に付いたもの（1件だけのタグは索引にならない）。 */
export function navigableTags(): string[] {
  return tagCounts().filter(([, n]) => n >= 2).map(([t]) => t);
}

const NAV = new Set(navigableTags());

/** その事例のタグのうち、他の事例にも繋がるもの（リンクにできるタグ）。 */
export function linkableTags(c: CaseStudy): string[] {
  return (c.tags ?? []).filter((t) => NAV.has(t));
}
