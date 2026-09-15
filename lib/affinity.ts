import { allCases } from "./cases";

/* 課題どうしの“結びつき”を事例データから計算する（＝このサイトの核）。
   ・生の共起だと最大課題(業務効率など)が何にでも出て偏る。
   ・そこで lift＝「平均より何倍つながりやすいか」で“特別な隣の課題”を出す。
     lift = P(B|A) / P(B) 。1より大きいほど、その2課題は偶然以上に一緒に解決されている。
   事例が増えれば自動で賢くなる（ビルド時に再計算）。 */

export type RelatedChallenge = {
  slug: string;
  lift: number;    // 関連度（1.0=平均並み。大きいほど特別なつながり）
  coCount: number; // 同時に解決されている事例数
  pct: number;     // この課題の事例のうち、その課題も持つ割合(%)
};

function compute() {
  const cases = allCases();
  const N = cases.length || 1;
  const cnt: Record<string, number> = {};
  const co: Record<string, Record<string, number>> = {};
  for (const c of cases) {
    const chs = Array.from(new Set(c.challenges));
    for (const a of chs) {
      cnt[a] = (cnt[a] || 0) + 1;
      co[a] = co[a] || {};
      for (const b of chs) if (a !== b) co[a][b] = (co[a][b] || 0) + 1;
    }
  }
  return { N, cnt, co };
}

const { N, cnt, co } = compute();

/** この課題と“特別に結びつく”隣の課題を lift 順で返す。 */
export function relatedChallenges(slug: string, opts?: { min?: number; limit?: number }): RelatedChallenge[] {
  const min = opts?.min ?? 2;
  const limit = opts?.limit ?? 3;
  const base = cnt[slug] || 0;
  if (!base) return [];
  const out: RelatedChallenge[] = [];
  for (const [b, nab] of Object.entries(co[slug] || {})) {
    if (nab < min) continue;
    const lift = (nab / base) / ((cnt[b] || 1) / N);
    out.push({ slug: b, lift: +lift.toFixed(2), coCount: nab, pct: Math.round((100 * nab) / base) });
  }
  // lift優先、同点は共起件数で
  return out.sort((a, b) => b.lift - a.lift || b.coCount - a.coCount).slice(0, limit);
}

export function challengeTotal(slug: string): number {
  return cnt[slug] || 0;
}
