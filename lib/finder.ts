import type { CaseStudy } from "./types";
import { allCases } from "./cases";
import { INDUSTRIES, PRODUCT_CATEGORIES, industryLabel } from "./taxonomy";
import facetsRaw from "../data/case_facets.json";

/* 事例ファインダー（アキネーター型の絞り込み）のロジック。
   「業種 → 部門 → 効果 → 規模 → 手段」の順に1問ずつ聞き、答えるたびに候補を絞る。
   質問の選択肢には「選ぶと残る件数」を添え、0件になる選択肢は出さない（行き止まりを作らない）。
   事例ごとの軸（部門・効果・規模・業種細分）は data/case_facets.json に事例IDをキーで持つ。
   cases.json とは別ファイルなので、収集パイプラインの上書きと競合しない。 */

type Facet = {
  dept: string[];       // 導入部門（複数可）。"all"＝全社、"unknown"＝不明
  effects: string[];    // 得られた効果（複数可）
  size: string;         // s1〜s5 / small / large / unknown
  sizeBasis: string;    // stated / known / none
  industry?: string;    // 業種が「その他」の事例だけ持つ細分業種
};

const FACETS = facetsRaw as Record<string, Facet>;

/* ── 質問の定義 ───────────────────────────────────────────────── */

export type AxisKey = "ind" | "sub" | "dept" | "eff" | "size" | "prod";
export type Option = { value: string; label: string; desc?: string };
export type Axis = {
  key: AxisKey;
  question: string;   // 画面に出す問い
  short: string;      // 回答チップの見出し
  options: Option[];
  /** 事例がこの選択肢に該当するか */
  match: (c: CaseStudy, value: string) => boolean;
};

const DEPT: Option[] = [
  { value: "management", label: "経営・経営企画" },
  { value: "sales", label: "営業" },
  { value: "marketing", label: "マーケティング・広報" },
  { value: "cs", label: "カスタマーサポート" },
  { value: "production", label: "製造・生産" },
  { value: "field", label: "現場・店舗・施設" },
  { value: "logistics", label: "物流・倉庫" },
  { value: "rd", label: "研究開発・設計" },
  { value: "it", label: "情報システム" },
  { value: "ga", label: "総務・管理" },
  { value: "hr", label: "人事・労務" },
  { value: "finance", label: "経理・財務" },
];

const EFFECTS: Option[] = [
  { value: "time", label: "時間・工数を減らしたい" },
  { value: "cost", label: "コストを下げたい" },
  { value: "quality", label: "品質・ミスを改善したい" },
  { value: "staffing", label: "人手不足を補いたい" },
  { value: "standard", label: "属人化をなくしたい" },
  { value: "visibility", label: "状況を見える化したい" },
  { value: "sales", label: "売上・受注を増やしたい" },
  { value: "cx", label: "顧客満足を上げたい" },
  { value: "people", label: "採用・育成・定着を良くしたい" },
  { value: "risk", label: "リスク・セキュリティを下げたい" },
  { value: "environment", label: "環境負荷・エネルギーを減らしたい" },
];

/* 規模帯。facetsの s1〜s5 は従業員数、small/large は人数不明だが規模感だけ分かる事例 */
const SIZE_GROUPS: Record<string, string[]> = {
  xs: ["s1", "s2", "small"],
  s: ["s3"],
  m: ["s4"],
  l: ["s5", "large"],
};
const SIZE: Option[] = [
  { value: "xs", label: "〜99名", desc: "小規模・スタートアップを含む" },
  { value: "s", label: "100〜299名" },
  { value: "m", label: "300〜999名" },
  { value: "l", label: "1,000名以上", desc: "大企業・上場企業を含む" },
];

/* 「その他」業種の細分。主要13業種のslugが混ざっている分は taxonomy のラベルで表示 */
const SUB_LABEL: Record<string, string> = {
  hospitality: "宿泊・観光・レジャー",
  service: "サービス業",
  media: "メディア・広告・出版",
  trading: "商社・卸売",
  professional: "士業・専門サービス",
  association: "団体・協会・NPO",
  agri: "農林水産",
  infra: "インフラ・通信",
  "other-industry": "その他",
};
const subLabel = (slug: string) => SUB_LABEL[slug] ?? industryLabel(slug);

const facetOf = (c: CaseStudy): Facet | undefined => FACETS[c.id];

export const AXES: Axis[] = [
  {
    key: "ind", question: "あなたの会社の業種は？", short: "業種",
    options: INDUSTRIES.map((t) => ({ value: t.slug, label: t.label })),
    match: (c, v) => c.customer.industry === v,
  },
  {
    key: "sub", question: "もう少し詳しく言うと、どんな業種ですか？", short: "業種",
    options: Object.keys(SUB_LABEL).map((v) => ({ value: v, label: subLabel(v) })),
    match: (c, v) => (facetOf(c)?.industry ?? "other-industry") === v,
  },
  {
    key: "dept", question: "どの部門の困りごとですか？", short: "部門",
    options: DEPT,
    // "all"（全社導入）はどの部門にも該当する扱い
    match: (c, v) => { const d = facetOf(c)?.dept ?? []; return d.includes(v) || d.includes("all"); },
  },
  {
    key: "eff", question: "いちばん手に入れたい成果は？", short: "成果",
    options: EFFECTS,
    match: (c, v) => (facetOf(c)?.effects ?? []).includes(v),
  },
  {
    key: "size", question: "会社の規模は？", short: "規模",
    options: SIZE,
    match: (c, v) => (SIZE_GROUPS[v] ?? []).includes(facetOf(c)?.size ?? "unknown"),
  },
  {
    key: "prod", question: "どんな手段で解決した事例を見たいですか？", short: "手段",
    options: PRODUCT_CATEGORIES.map((t) => ({ value: t.slug, label: t.label })),
    match: (c, v) => c.productCategory === v,
  },
];

const AXIS_MAP = Object.fromEntries(AXES.map((a) => [a.key, a])) as Record<AxisKey, Axis>;

/** 回答。値は選択肢のvalue、"-" は「問わない（スキップ）」 */
export type Answers = Partial<Record<AxisKey, string>>;
export const SKIP = "-";

/* 業種細分は「その他」を選んだときだけ聞く。それ以外では存在しない質問として扱う */
function applicable(key: AxisKey, answers: Answers): boolean {
  if (key === "sub") return answers.ind === "other-industry";
  return true;
}

/** 回答した軸のラベル（チップ表示用）。スキップした軸は「問わない」 */
export function answerLabel(key: AxisKey, value: string): string {
  if (value === SKIP) return "問わない";
  return AXIS_MAP[key].options.find((o) => o.value === value)?.label ?? value;
}

export function axisShort(key: AxisKey): string {
  return AXIS_MAP[key].short;
}

export type Step = {
  axis: Axis;
  /** 残る件数つきの選択肢（0件は除外）。件数の多い順 */
  options: (Option & { count: number })[];
};

export type FinderState = {
  /** 回答済み（適用順）。チップと「戻る」に使う */
  answered: { key: AxisKey; value: string }[];
  /** 現在の候補（回答で絞った後） */
  candidates: CaseStudy[];
  /** 次の質問。全部答え終わったら undefined */
  step?: Step;
  /** 何問目か（1始まり）と総問数の目安 */
  no: number;
  total: number;
};

/** URLの回答から、現在の候補と次の質問を組み立てる */
export function finderState(answers: Answers): FinderState {
  let candidates = allCases();
  const answered: FinderState["answered"] = [];
  let step: Step | undefined;
  let no = 0;

  for (const axis of AXES) {
    if (!applicable(axis.key, answers)) continue;
    const v = answers[axis.key];
    if (v != null) {
      answered.push({ key: axis.key, value: v });
      if (v !== SKIP) candidates = candidates.filter((c) => axis.match(c, v));
      no++;
      continue;
    }
    // 未回答の最初の軸が次の質問。選択肢ごとに残る件数を数え、0件は落とす
    const counts = new Map<string, number>();
    for (const c of candidates) {
      for (const o of axis.options) if (axis.match(c, o.value)) counts.set(o.value, (counts.get(o.value) ?? 0) + 1);
    }
    const options = axis.options
      .map((o) => ({ ...o, count: counts.get(o.value) ?? 0 }))
      .filter((o) => o.count > 0)
      .sort((a, b) => b.count - a.count);
    // 選択肢が1つ以下なら聞いても絞れないので、自動でスキップして次へ
    if (options.length <= 1) {
      answers = { ...answers, [axis.key]: SKIP };
      answered.push({ key: axis.key, value: SKIP });
      no++;
      continue;
    }
    step = { axis, options };
    no++;
    break;
  }

  const total = AXES.filter((a) => applicable(a.key, answers)).length;
  return { answered, candidates, step, no, total };
}

/** 回答をURLクエリに戻す（順序を固定して、同じ回答＝同じURLにする） */
export function finderHref(answers: Answers, extra?: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const a of AXES) { const v = answers[a.key]; if (v) p.set(a.key, v); }
  for (const [k, v] of Object.entries(extra ?? {})) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/finder?${s}` : "/finder";
}

/** searchParams から回答だけを取り出す（不正な値は無視） */
export function parseAnswers(sp: Record<string, string | string[] | undefined>): Answers {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const out: Answers = {};
  for (const a of AXES) {
    const v = one(sp[a.key]);
    if (!v) continue;
    if (v === SKIP || a.options.some((o) => o.value === v)) out[a.key] = v;
  }
  return out;
}
