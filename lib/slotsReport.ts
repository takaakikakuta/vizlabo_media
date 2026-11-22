import { loadSlots, emptyCounts, REF_CATEGORIES, REF_LABELS, type SlotCounts, type RefCategory } from "./slots";
import { loadViews, jstDay, ARTICLE_PREFIX, ARTICLE_VENDOR } from "./views";
import { getArticle, articleLabel, type Article } from "./articles";
import { getCountableCase } from "./cases";
import { isIntroSource } from "./introSources";

/* 枠の計測（lib/slots.ts）と記事PV（lib/views.ts）を、運営画面（/admin/slots）と CSV（/admin/slots/csv）用に集計する。
   用語の定義（画面と CSV で同じ）:
     PV       … 記事の閲覧（同じタブで開き直しても1回。lib/views.ts）
     表示     … 枠の3割以上が画面に入った回数（1閲覧につき枠ごとに1回）
     遷移     … 枠のリンク（事例ページ or 元記事）がクリックされた回数（1閲覧につき枠ごとに1回）
     事例ページへ / 元記事へ（直接） … リンクごとのクリック（1閲覧につきリンクごとに1回）
     経由     … 枠から事例ページへ移り、30分以内にそこで元記事が押された回数
     サイト訪問 … 元記事へ（直接）＋経由＝提供元サイトへ送った数
     遷移率   … 遷移 ÷ 表示（枠位置ごと）。記事全体は 遷移 ÷ PV も出す */

const SELECTION_FORMATS = new Set(["sen", "yougo"]);

export type Counts = SlotCounts;

export type ArticleAgg = Counts & {
  slug: string;
  label: string;
  title: string;
  format: string;
  publishedAt: string;
  pv: number;
  refs: Record<RefCategory, number>;
  refUnknown: number;  // PV のうち流入元が記録されていない分（計測開始前の閲覧など）
};
export type PositionAgg = Counts & { pos: number };
export type ArticlePositionAgg = Counts & { slug: string; label: string; pos: number; caseId: string; vendor: string };
export type VendorAgg = Counts & { vendor: string; intro: boolean; cases: number };
export type DailyPv = { day: string; slug: string; label: string; pv: number; refs: Record<RefCategory, number> };
export type DailySlot = Counts & { day: string; slug: string; label: string; pos: number; caseId: string; vendor: string; intro: boolean };

export type SlotsReport = {
  days: number;
  from: string;
  to: string;
  totals: Counts & { pv: number };
  articles: ArticleAgg[];
  positions: PositionAgg[];
  articlePositions: ArticlePositionAgg[];
  vendors: VendorAgg[];
  introVendors: VendorAgg[];
  refs: { ref: RefCategory; label: string; pv: number }[];
  dailyPv: DailyPv[];
  dailySlots: DailySlot[];
};

function emptyRefs(): Record<RefCategory, number> {
  return Object.fromEntries(REF_CATEGORIES.map((r) => [r, 0])) as Record<RefCategory, number>;
}

function addCounts(to: Counts, from: Counts) {
  to.imps += from.imps;
  to.trans += from.trans;
  to.toCase += from.toCase;
  to.toSrc += from.toSrc;
  to.via += from.via;
}

function selection(slug: string): Article | undefined {
  const a = getArticle(slug);
  return a && SELECTION_FORMATS.has(a.format) ? a : undefined;
}

export async function buildSlotsReport(days: number): Promise<SlotsReport> {
  const [{ slots, refs }, views] = await Promise.all([loadSlots(days), loadViews(days, ARTICLE_VENDOR)]);

  const articles = new Map<string, ArticleAgg>();
  const art = (slug: string): ArticleAgg | undefined => {
    const a = selection(slug);
    if (!a) return undefined;
    let cur = articles.get(slug);
    if (!cur) {
      cur = {
        slug, label: articleLabel(a), title: a.title.join(""), format: a.format, publishedAt: a.publishedAt,
        pv: 0, refs: emptyRefs(), refUnknown: 0, ...emptyCounts(),
      };
      articles.set(slug, cur);
    }
    return cur;
  };

  // PV（記事 × 日）
  const dailyPv = new Map<string, DailyPv>();
  for (const v of views) {
    const slug = v.caseId.slice(ARTICLE_PREFIX.length);
    const a = art(slug);
    if (!a || !v.views) continue;
    a.pv += v.views;
    const k = `${v.day}|${slug}`;
    const d = dailyPv.get(k) ?? { day: v.day, slug, label: a.label, pv: 0, refs: emptyRefs() };
    d.pv += v.views;
    dailyPv.set(k, d);
  }
  // 流入元（記事 × 流入元 × 日）
  const refTotals = emptyRefs();
  for (const r of refs) {
    const a = art(r.slug);
    if (!a) continue;
    a.refs[r.ref] += r.pv;
    refTotals[r.ref] += r.pv;
    const k = `${r.day}|${r.slug}`;
    const d = dailyPv.get(k) ?? { day: r.day, slug: r.slug, label: a.label, pv: 0, refs: emptyRefs() };
    d.refs[r.ref] += r.pv;
    dailyPv.set(k, d);
  }
  for (const a of articles.values()) {
    const known = REF_CATEGORIES.reduce((s, r) => s + a.refs[r], 0);
    a.refUnknown = Math.max(0, a.pv - known);
  }

  // 枠（記事 × 枠位置 × 事例 × 日）
  const positions = new Map<number, PositionAgg>();
  const articlePositions = new Map<string, ArticlePositionAgg>();
  const vendors = new Map<string, VendorAgg & { caseIds: Set<string> }>();
  const dailySlots: DailySlot[] = [];
  for (const r of slots) {
    const a = art(r.slug);
    if (!a) continue;
    const vendor = getCountableCase(r.caseId)?.vendor || r.vendor || "（不明）";
    const intro = isIntroSource(vendor);
    addCounts(a, r);
    const p = positions.get(r.pos) ?? { pos: r.pos, ...emptyCounts() };
    addCounts(p, r);
    positions.set(r.pos, p);
    const apk = `${r.slug}|${r.pos}|${r.caseId}`;
    const ap = articlePositions.get(apk) ?? { slug: r.slug, label: a.label, pos: r.pos, caseId: r.caseId, vendor, ...emptyCounts() };
    addCounts(ap, r);
    articlePositions.set(apk, ap);
    const v = vendors.get(vendor) ?? { vendor, intro, cases: 0, caseIds: new Set<string>(), ...emptyCounts() };
    addCounts(v, r);
    v.caseIds.add(r.caseId);
    vendors.set(vendor, v);
    dailySlots.push({
      day: r.day, slug: r.slug, label: a.label, pos: r.pos, caseId: r.caseId, vendor, intro,
      imps: r.imps, trans: r.trans, toCase: r.toCase, toSrc: r.toSrc, via: r.via,
    });
  }

  const vendorList = [...vendors.values()].map(({ caseIds, ...v }) => ({ ...v, cases: caseIds.size }))
    .sort((x, y) => y.trans - x.trans || x.vendor.localeCompare(y.vendor));
  const articleList = [...articles.values()].sort((x, y) => y.pv - x.pv || x.label.localeCompare(y.label));
  const totals = { pv: 0, ...emptyCounts() };
  for (const a of articleList) {
    totals.pv += a.pv;
    addCounts(totals, a);
  }

  return {
    days,
    from: jstDay(days - 1),
    to: jstDay(0),
    totals,
    articles: articleList,
    positions: [...positions.values()].sort((x, y) => x.pos - y.pos),
    articlePositions: [...articlePositions.values()].sort((x, y) => x.label.localeCompare(y.label) || x.pos - y.pos),
    vendors: vendorList.filter((v) => !v.intro),
    introVendors: vendorList.filter((v) => v.intro),
    refs: REF_CATEGORIES.map((ref) => ({ ref, label: REF_LABELS[ref], pv: refTotals[ref] })),
    dailyPv: [...dailyPv.values()].sort((x, y) => x.day.localeCompare(y.day) || x.label.localeCompare(y.label)),
    dailySlots: dailySlots.sort((x, y) => x.day.localeCompare(y.day) || x.label.localeCompare(y.label) || x.pos - y.pos),
  };
}

/** 割合（%）。分母が0なら空 */
export function rate(n: number, d: number): string {
  return d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "";
}

/** サイト訪問＝元記事へ（直接）＋経由 */
export function siteVisits(c: Counts): number {
  return c.toSrc + c.via;
}

/* ── CSV ── */

export const CSV_TYPES = {
  articles: "セレクション別（PV・流入元・遷移）",
  positions: "枠位置別の遷移率（全記事合計）",
  "article-positions": "記事×枠位置",
  vendors: "ベンダー別",
  "daily-pv": "日別PV（記事×日×流入元）",
  "daily-slots": "日別の枠（記事×枠位置×事例×ベンダー×日）",
} as const;
export type CsvType = keyof typeof CSV_TYPES;

const COUNT_HEAD = ["表示", "遷移", "遷移率(遷移/表示)", "事例ページへ", "元記事へ(直接)", "経由", "サイト訪問(直接+経由)"];
function countCells(c: Counts): (string | number)[] {
  return [c.imps, c.trans, rate(c.trans, c.imps), c.toCase, c.toSrc, c.via, siteVisits(c)];
}

export function slotsCsv(r: SlotsReport, type: CsvType): string {
  let rows: (string | number)[][] = [];
  const refHead = REF_CATEGORIES.map((x) => `流入:${REF_LABELS[x]}`);
  switch (type) {
    case "articles":
      rows = [
        ["記事", "slug", "形式", "公開日", "タイトル", "PV", ...refHead, "流入:記録なし", ...COUNT_HEAD, "遷移/PV"],
        ...r.articles.map((a) => [
          a.label, a.slug, a.format, a.publishedAt, a.title, a.pv, ...REF_CATEGORIES.map((x) => a.refs[x]), a.refUnknown,
          ...countCells(a), rate(a.trans, a.pv),
        ]),
      ];
      break;
    case "positions":
      rows = [["枠位置", ...COUNT_HEAD], ...r.positions.map((p) => [p.pos, ...countCells(p)])];
      break;
    case "article-positions":
      rows = [
        ["記事", "slug", "枠位置", "事例ID", "ベンダー", ...COUNT_HEAD],
        ...r.articlePositions.map((p) => [p.label, p.slug, p.pos, p.caseId, p.vendor, ...countCells(p)]),
      ];
      break;
    case "vendors":
      rows = [
        ["ベンダー", "紹介元", "事例数", ...COUNT_HEAD],
        ...[...r.vendors, ...r.introVendors].map((v) => [v.vendor, v.intro ? "はい" : "", v.cases, ...countCells(v)]),
      ];
      break;
    case "daily-pv":
      rows = [
        ["日付", "記事", "slug", "PV", ...refHead],
        ...r.dailyPv.map((d) => [d.day, d.label, d.slug, d.pv, ...REF_CATEGORIES.map((x) => d.refs[x])]),
      ];
      break;
    case "daily-slots":
      rows = [
        ["日付", "記事", "slug", "枠位置", "事例ID", "ベンダー", "紹介元", ...COUNT_HEAD],
        ...r.dailySlots.map((d) => [d.day, d.label, d.slug, d.pos, d.caseId, d.vendor, d.intro ? "はい" : "", ...countCells(d)]),
      ];
      break;
  }
  // Excel で文字化けしないよう BOM を付ける
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

function cell(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
