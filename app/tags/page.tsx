import Link from "next/link";
import { tagCounts } from "../../lib/cases";
import { ListHead } from "../../components/CaseGrid";

export const metadata = {
  title: "困りごとから探す",
  description: "「紙の書類処理」「業務の属人化」など、具体的な困りごとから解決事例を探せます。",
};

export default function TagsPage() {
  const all = tagCounts();
  const nav = all.filter(([, n]) => n >= 2);
  const rare = all.filter(([, n]) => n === 1);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <ListHead eyebrow="困りごとから探す" title="困りごとの索引"
        sub="12個の課題カテゴリより細かい粒度で、具体的な困りごとから事例をたどれます。事例本文から抽出したタグです。"
        count={nav.length} />

      {/* 件数の多い順＝“よくある困りごと”から並べる */}
      <div className="grid gap-x-12 border-t border-line md:grid-cols-2">
        {nav.map(([t, n]) => (
          <Link key={t} href={`/tag/${encodeURIComponent(t)}`}
            className="row group flex items-baseline justify-between gap-4 border-b border-line2 px-2 py-3.5 no-underline">
            <span className="text-[14.5px] text-ink group-hover:text-brand">#{t}</span>
            <span className="num text-[14px] text-ink2">{n}</span>
          </Link>
        ))}
      </div>

      {rare.length > 0 && (
        <div className="mt-12 border-t border-line pt-6">
          <p className="label mb-4">1件だけの困りごと（{rare.length}件・ページは作っていません）</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-muted">
            {rare.map(([t]) => <span key={t}>#{t}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
