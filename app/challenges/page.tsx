import Link from "next/link";
import { CHALLENGES } from "../../lib/taxonomy";
import { challengeCounts } from "../../lib/cases";
import { challengeStyle } from "../../lib/visuals";
import { ListHead } from "../../components/CaseGrid";

export const metadata = { title: "課題から探す" };

export default function ChallengesPage() {
  const counts = challengeCounts();
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <ListHead eyebrow="課題から探す" title="課題から解決事例を探す"
        sub="業種をまたぐ困りごとの型から、他社の解決事例をたどれます。" />
      <div className="border-t border-line">
        {CHALLENGES.map((ch) => (
          <Link key={ch.slug} href={`/challenge/${ch.slug}`}
            className="row group flex items-baseline gap-4 border-b border-line2 px-2 py-5 no-underline sm:gap-6">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: challengeStyle(ch.slug).solid }} />
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[18px] text-ink group-hover:text-brand">{ch.label}</span>
              {ch.desc && <span className="mt-1.5 block text-[12.5px] leading-relaxed text-muted">{ch.desc}</span>}
            </span>
            <span className="shrink-0 text-right">
              <span className="num block text-[18px] leading-none text-ink2">{counts[ch.slug] ?? 0}</span>
              <span className="mt-1 block text-[10.5px] text-muted">件</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
