import { allCases, challengeCounts, industryCounts, tagCounts } from "../../lib/cases";
import { CHALLENGES, INDUSTRIES } from "../../lib/taxonomy";
import { challengeStyle } from "../../lib/visuals";
import CaseGrid, { ListHead } from "../../components/CaseGrid";
import CaseSearch from "../../components/CaseSearch";

export const metadata = { title: "すべての解決事例" };

export default function CasesPage() {
  const cases = allCases();
  const chCounts = challengeCounts();
  const indCounts = industryCounts();
  const facetChallenges = CHALLENGES.map((ch) => ({
    slug: ch.slug, label: ch.label, count: chCounts[ch.slug] ?? 0, color: challengeStyle(ch.slug).solid,
  }));
  const facetIndustries = INDUSTRIES.map((ind) => ({
    slug: ind.slug, label: ind.label, count: indCounts[ind.slug] ?? 0,
  }));
  const facetTags = tagCounts().filter(([, n]) => n >= 3).slice(0, 30)
    .map(([tag, count]) => ({ tag, count }));

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <ListHead eyebrow="事例一覧" title="すべての解決事例"
        sub="成果の数字がある事例を先に並べています。右端の数字で、行を跨いで成果を比較できます。"
        count={cases.length} />

      <CaseSearch total={cases.length} challenges={facetChallenges} industries={facetIndustries} tags={facetTags}>
        <CaseGrid cases={cases} />
      </CaseSearch>
    </div>
  );
}
