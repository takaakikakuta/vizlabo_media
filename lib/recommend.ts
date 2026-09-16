import type { CaseStudy } from "./types";
import { allCases } from "./cases";
import { challengeLabel, industryLabel, productLabel } from "./taxonomy";

/* 事例→事例のレコメンド。「この事例に興味があるなら、これも」を“なぜ”付きで返す。
   複数の facet（課題/業種/規模/解き方/成果指標/タグ）の一致を重み付けスコアにし、
   一致した観点から人が読める理由文を組み立てる。 */

export type Recommendation = {
  c: CaseStudy;
  score: number;
  reason: string;   // なぜおすすめか（1〜3節）
  badges: string[]; // 共有している課題ラベル（チップ表示用）
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
      const sameSize = !!c.customer.size && c.customer.size === base.customer.size;
      const sameProduct = c.productCategory === base.productCategory;
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
    const sharedPain = x.sharedTags.length > 0 || x.sharedCh.length > 0;

    // 悩みの一致は、カテゴリより具体的な困りごとタグを優先して言う
    if (x.sharedTags.length) {
      clauses.push(`同じ「${x.sharedTags.slice(0, 2).join("」「")}」に悩んだ事例`);
      x.sharedTags.forEach((t) => badges.push(t));
    } else if (x.sharedCh.length) {
      clauses.push(`あなたが見た事例と同じ〈${x.sharedCh.map(challengeLabel).join("・")}〉の悩み`);
      x.sharedCh.forEach((ch) => badges.push(challengeLabel(ch)));
    }
    if (x.sameIndustry) clauses.push(`同じ${industryLabel(base.customer.industry)}`);

    // 解き方が同じか違うか（違う＝“別の手”という学び）。カテゴリだけでなく実際の製品名まで言う
    const prodName = (x.c.product || "").split(/[（(]/)[0].trim();
    if (sharedPain && !x.sameProduct) {
      clauses.push(`ただし別の手（${productLabel(x.c.productCategory)}${prodName ? `・${prodName}` : ""}）で解決している`);
    } else if (x.sameProduct) {
      clauses.push(`同じ解き方（${productLabel(x.c.productCategory)}${prodName ? `・${prodName}` : ""}）`);
    }

    // 同じ指標で成果を出している＝数字を並べて比べられる
    if (x.sharedMetricName) {
      const m = x.sharedMetricName.length > 20 ? `${x.sharedMetricName.slice(0, 20)}…` : x.sharedMetricName;
      clauses.push(`同じ指標「${m}」の成果あり`);
    }
    if (x.sameSize && x.c.customer.size) clauses.push(`規模も近い（${x.c.customer.size}）`);

    const reason = clauses.slice(0, 3).join("。") + "。";
    return { c: x.c, score: x.score, reason, badges: badges.slice(0, 3) };
  });
}
