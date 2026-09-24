import Link from "next/link";
import { newestCases, siteStats } from "../../lib/cases";
import { industryLabel } from "../../lib/taxonomy";
import { hasDigit, parseStat } from "../../lib/stat";
import { allArticles } from "../../lib/articles";
import { ListHead } from "../../components/CaseGrid";
import SubscribeForm from "../../components/SubscribeForm";

/* メルマガのLP。何が届くかを「創刊号のプレビュー」として実データで見せ、購読につなげる。 */

export const metadata = {
  title: "メルマガ「週刊 事例ナビ」",
  description: "毎週金曜配信。今週の事例セレクション2本と、新着の解決事例をメールでお届けします。",
};

export default function NewsletterPage() {
  const s = siteStats();
  const picks = newestCases(3);
  const latest = allArticles().slice(0, 2);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <ListHead eyebrow="メルマガ" title="週刊 事例ナビ"
        sub={`毎週金曜配信・5分で読める。今週の事例セレクション2本と、${s.total}件のデータベースに加わった新着の解決事例を届けます。`} />

      {/* 内容を説明してから、末尾のフォームで登録してもらう（フォームは先に出さない） */}
      {/* 何が届くか＝創刊号のプレビュー（実データで組む） */}
      <section>
        <p className="label mb-4 flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />毎週金曜、この2つが届きます</p>

        {/* メールのモック */}
        <div className="border-2 border-ink">
          <div className="border-b border-line bg-soft px-5 py-3 text-[11.5px] text-muted">
            件名：<span className="font-bold text-ink">【週刊 事例ナビ】{latest[0]?.title.join("")}、ほか</span>
          </div>
          <div className="space-y-7 px-5 py-6">
            <div>
              <p className="label">① 今週の事例セレクション（2本）</p>
              <p className="mt-2 text-[13.5px] leading-[1.95] text-body">
                事例の集積からしか書けない編集部のオリジナル記事を、毎週2本。
              </p>
              <div className="mt-2.5 border-t border-line2">
                {latest.map((a) => (
                  <Link key={a.slug} href={`/articles/${a.slug}`}
                    className="flex items-baseline gap-3 border-b border-line2 py-2.5 text-[12.5px] no-underline">
                    <span className="num shrink-0 text-[11px] text-muted">#{String(a.no).padStart(3, "0")}</span>
                    <span className="min-w-0 flex-1 truncate text-body hover:text-ink">{a.title.join("")}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="label">② 新着の解決事例</p>
              <div className="mt-2 border-t border-line2">
                {picks.map((c) => {
                  const r = c.results.find((x) => hasDigit(x.value)) ?? c.results[0];
                  return (
                    <div key={c.id} className="flex items-baseline gap-3 border-b border-line2 py-2.5 text-[12.5px]">
                      <span className="w-20 shrink-0 text-[11px] text-muted">{industryLabel(c.customer.industry)}</span>
                      <span className="min-w-0 flex-1 truncate text-body">{c.title}</span>
                      {r && <span className="num max-w-[30%] shrink-0 truncate text-accent">{parseStat(r.value).head}{parseStat(r.value).verb}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
          ※プレビューの内容は現在の掲載データから自動生成しています。実際の配信では編集部が選定・執筆します。
        </p>
      </section>

      {/* こんな人へ */}
      <section className="mt-14">
        <p className="label mb-4 flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />こんな方に</p>
        <ul className="space-y-2.5 border-t border-line pt-5 text-[13.5px] leading-[1.95] text-body">
          <li>・自社の課題の「他社の解き方」を、探しに行かずに知っておきたい</li>
          <li>・稟議・提案の材料になる「成果の数字」を集めている</li>
          <li>・導入事例をマーケティングに使う側で、書き方・見せ方の参考にしたい</li>
        </ul>
      </section>

      <div className="mt-12">
        <SubscribeForm variant="hero" source="newsletter-lp-bottom" />
      </div>
    </div>
  );
}
