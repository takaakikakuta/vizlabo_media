import type { CaseStudy } from "./types";
import { allCases } from "./cases";
import { challengeLabel, industryLabel, productLabel } from "./taxonomy";

/* 事例→事例のレコメンド。「この事例に興味があるなら、これも」を“なぜ”付きで返す。
   複数の facet（課題/業種/規模/解き方/成果指標/タグ）の一致を重み付けスコアにし、
   一致した観点から人が読める理由文を組み立てる。 */

export type RecChip = {
  label: string;
  kind: "tag" | "industry" | "solution" | "metric" | "size";  // 種類ごとに見た目を変える
};

export type Recommendation = {
  c: CaseStudy;
  score: number;
  reason: string;   // なぜおすすめか（文章。予備として残す）
  chips: RecChip[]; // 共通点をチップで見せる（表示の主役）
  badges: string[]; // 共有している課題ラベル（旧UI互換）
};

const W = {
  challenge: 3,     // 同じ課題＝一番効く「同じ悩み」
  industry: 2,      // 同じ業種
  product: 1.5,     // 同じ解き方
  size: 1,          // 近い規模
  metric: 1,        // 同じ成果指標
  tag: 0.5,         // 共有タグ
};

export function recommendCases(base: CaseStudy, limit = 5): Recommendation[] {
  const baseCh = new Set(base.challenges);
  const baseMetrics = new Set(base.results.map((r) => r.metric));
  const baseTags = new Set(base.tags ?? []);

  const scored = allCases()
    .filter((c) => c.id !== base.id)
    .map((c) => {
      const sharedCh = c.challenges.filter((x) => baseCh.has(x));
      const sameIndustry = c.customer.industry === base.customer.industry;
      // 規模は文字列の完全一致ではなく、従業員数などの数値が3倍以内なら「近い」とみなす
      const sameSize = sizeClose(base.customer.size, c.customer.size);
      // other-product は雑多の受け皿なので「同じ解き方」とは呼ばない
      const sameProduct = c.productCategory === base.productCategory && c.productCategory !== "other-product";
      const sharedMetric = c.results.some((r) => baseMetrics.has(r.metric));
      const sharedTags = (c.tags ?? []).filter((x) => baseTags.has(x));

      const score =
        sharedCh.length * W.challenge +
        (sameIndustry ? W.industry : 0) +
        (sameProduct ? W.product : 0) +
        (sameSize ? W.size : 0) +
        (sharedMetric ? W.metric : 0) +
        sharedTags.length * W.tag;

      const sharedMetricName = c.results.find((r) => baseMetrics.has(r.metric))?.metric;
      return { c, score, sharedCh, sameIndustry, sameSize, sameProduct, sharedMetric, sharedTags, sharedMetricName };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((x) => {
    const clauses: string[] = [];
    const badges: string[] = [];
    const chips: RecChip[] = [];
    const sharedPain = x.sharedTags.length > 0 || x.sharedCh.length > 0;

    // 悩みの一致は、カテゴリより具体的な困りごとタグを優先して言う
    if (x.sharedTags.length) {
      clauses.push(`同じ「${x.sharedTags.slice(0, 2).join("」「")}」に悩んだ事例`);
      x.sharedTags.forEach((t) => badges.push(t));
      x.sharedTags.slice(0, 3).forEach((t) => chips.push({ label: `#${t}`, kind: "tag" }));
    } else if (x.sharedCh.length) {
      clauses.push(`あなたが見た事例と同じ〈${x.sharedCh.map(challengeLabel).join("・")}〉の悩み`);
      x.sharedCh.forEach((ch) => badges.push(challengeLabel(ch)));
      x.sharedCh.slice(0, 2).forEach((ch) => chips.push({ label: `同じ悩み：${challengeLabel(ch)}`, kind: "tag" }));
    }
    if (x.sameIndustry) {
      clauses.push(`同じ${industryLabel(base.customer.industry)}`);
      chips.push({ label: `同じ${industryLabel(base.customer.industry)}`, kind: "industry" });
    }

    // 解き方が同じか違うか（違う＝“別の手”という学び）。カテゴリだけでなく実際の製品名まで言う。
    // other-product のカテゴリ名（「その他」）は情報がないので出さず、製品名だけで語る
    const prodName = trunc((x.c.product || "").split(/[（(]/)[0].trim(), 22);
    const catLabel = x.c.productCategory !== "other-product" ? productLabel(x.c.productCategory) : "";
    const solvedWith = [catLabel, prodName].filter(Boolean).join("・");
    if (sharedPain && !x.sameProduct && solvedWith) {
      clauses.push(`こちらは別の手（${solvedWith}）で解決している`);
      chips.push({ label: `別の手：${solvedWith}`, kind: "solution" });
    } else if (x.sameProduct) {
      const samePname = prodName && prodName === trunc((base.product || "").split(/[（(]/)[0].trim(), 22);
      clauses.push(samePname
        ? `同じ${prodName}を使った別の現場`
        : `同じ解き方（${solvedWith}）`);
      chips.push({ label: samePname ? `同じ${prodName}` : `同じ解き方：${solvedWith}`, kind: "solution" });
    }

    // 同じ指標で成果を出している＝数字を並べて比べられる
    if (x.sharedMetricName) {
      const m = x.sharedMetricName.length > 20 ? `${x.sharedMetricName.slice(0, 20)}…` : x.sharedMetricName;
      clauses.push(`同じ指標「${m}」の成果あり`);
    }
    if (x.sameSize && x.c.customer.size) {
      clauses.push(`規模も近い（${trunc(x.c.customer.size, 14)}）`);
      chips.push({ label: `規模が近い（${trunc(x.c.customer.size, 12)}）`, kind: "size" });
    }
    if (x.sharedMetricName) {
      chips.push({ label: `同じ指標：${trunc(x.sharedMetricName, 14)}`, kind: "metric" });
    }

    const reason = clauses.slice(0, 3).join("。") + "。";
    return { c: x.c, score: x.score, reason, chips: chips.slice(0, 5), badges: badges.slice(0, 3) };
  });
}

function trunc(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/** 「従業員45名」「51〜300人」等から先頭の数値を取り、両者が3倍以内なら規模が近いとみなす。 */
function sizeClose(a?: string, b?: string): boolean {
  const na = sizeNum(a), nb = sizeNum(b);
  if (na === null || nb === null) return false;
  const [lo, hi] = na < nb ? [na, nb] : [nb, na];
  return lo > 0 && hi / lo <= 3;
}

function sizeNum(s?: string): number | null {
  const m = s?.replace(/[,，]/g, "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}
