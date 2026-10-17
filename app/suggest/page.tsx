import Link from "next/link";
import { siteStats } from "../../lib/cases";
import { industryLabel } from "../../lib/taxonomy";
import { matchCases } from "../../lib/suggest";
import { ListHead } from "../../components/CaseGrid";
import SuggestForm from "../../components/SuggestForm";
import { SUGGEST_ENABLED } from "../../lib/flags";
import type { CaseStudy } from "../../lib/types";

/* URLサジェストの専用LP。トップのバナーと記事内の枠から流入する。 */

export const metadata = {
  title: "AI事例サジェスト｜貴社に近い導入事例をメールでお届け",
  description: "会社サイトのURLを入れるだけ。AIが貴社の事業を読み取り、同じ業界・同じ困りごとの導入事例を選んでメールでお届けします（無料）。",
};

export default function SuggestPage() {
  const s = siteStats();
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <ListHead eyebrow="AI事例サジェスト" title="貴社に近い事例を、AIが探して届けます"
        sub={`会社サイトのURLを入れるだけ。AIが貴社の事業を読み取り、${s.total.toLocaleString()}件の掲載事例から「同じ業界の事例」と「同じ困りごとを解決した事例」を選んで、その場でメールにまとめてお送りします。無料・1通だけ。`} />

      {SUGGEST_ENABLED ? (
        <SuggestForm source="suggest-lp" />
      ) : (
        <div className="border-2 border-ink bg-soft px-6 py-8 text-center">
          <p className="font-display text-[17px] text-ink">現在、準備中です</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">近日公開予定です。公開のお知らせはメルマガでお送りします。</p>
        </div>
      )}

      {/* 届くメールのサンプル（架空の製造業プロフィールで、実データからマッチングした本物の事例を表示） */}
      <SampleMail />

      {/* 仕組みの説明（安心材料） */}
      <section className="mt-14">
        <p className="label mb-4 flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />どうやって選んでいるか</p>
        <ol className="space-y-3.5 border-t border-line pt-5 text-[13.5px] leading-[1.95] text-body">
          <li className="flex gap-3"><span className="num shrink-0 text-[15px] text-muted">01</span>
            AIが貴社サイトの公開ページを1度だけ読み、事業内容・業界・抱えていそうな業務課題を推定します</li>
          <li className="flex gap-3"><span className="num shrink-0 text-[15px] text-muted">02</span>
            当サイトの掲載事例{s.total.toLocaleString()}件（{s.vendors}社）から、業界の一致・困りごとの一致でスコアリングします</li>
          <li className="flex gap-3"><span className="num shrink-0 text-[15px] text-muted">03</span>
            数値成果のある事例を優先して最大8本を選び、成果の数字と一緒にメールでお届けします</li>
        </ol>
      </section>

      <section className="mt-12">
        <p className="label mb-4 flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />よくある質問</p>
        <dl className="space-y-5 border-t border-line pt-5 text-[13.5px] leading-[1.95]">
          <div>
            <dt className="font-bold text-ink">費用はかかりますか？</dt>
            <dd className="mt-1 text-body">かかりません。メールも入力いただいたアドレスに1回お送りするだけです。</dd>
          </div>
          <div>
            <dt className="font-bold text-ink">営業の電話やメールが来ませんか？</dt>
            <dd className="mt-1 text-body">来ません。届いたメールに返信いただいた場合のみ、こちらからご連絡します。</dd>
          </div>
          <div>
            <dt className="font-bold text-ink">入力した情報はどう扱われますか？</dt>
            <dd className="mt-1 text-body">サジェストの生成と、事例マニアからのご案内以外には使用しません。</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

/* 届くメールのサンプル。架空のプロフィール（金属加工の中小メーカー）で
   実際のマッチングロジックを走らせ、本物の掲載事例を使って組み立てる。 */
function SampleMail() {
  const sample = matchCases({
    summary: "金属部品の受託加工を手がける中小メーカー",
    industry: "manufacturing",
    tags: ["手作業の転記", "業務の属人化", "紙の書類処理"],
    keywords: ["金属加工", "製造", "工場"],
    challenges: ["efficiency", "standardize"],
  });
  const rows = (cs: CaseStudy[]) => cs.slice(0, 3).map((c) => {
    const r = c.results.find((x) => /\d/.test(x.value)) ?? c.results[0];
    return (
      <Link key={c.id} href={`/cases/${c.id}`}
        className="block border-b border-line2 py-2.5 no-underline">
        <span className="block truncate text-[12.5px] text-body hover:text-ink">■ {c.title}</span>
        <span className="mt-0.5 block text-[11px] text-muted">
          {c.customer.name || "導入企業非公開"}（{industryLabel(c.customer.industry)}）
          {r && <span className="num ml-2 text-accent">{r.metric}: {r.value}</span>}
        </span>
      </Link>
    );
  });

  return (
    <section className="mt-14">
      <p className="label mb-4 flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />届くメールのサンプル</p>
      <div className="border-2 border-ink">
        <div className="border-b border-line bg-soft px-5 py-3 text-[11.5px] text-muted">
          件名：<span className="font-bold text-ink">【事例マニア】貴社に近い導入事例をお送りします</span>
        </div>
        <div className="space-y-6 px-5 py-6">
          <p className="text-[12.5px] leading-[1.9] text-body">
            ご入力いただいたサイトをAIが拝見し、<span className="font-bold text-ink">「金属部品の受託加工を手がける中小メーカー」</span>と理解しました。
            掲載事例から、貴社に近いものをお送りします。
          </p>
          <div>
            <p className="label">▼ 同じ業界（{industryLabel("manufacturing")}）の会社が解決した事例</p>
            <div className="mt-2 border-t border-line2">{rows(sample.sameIndustry)}</div>
          </div>
          <div>
            <p className="label">▼ 業界は違っても、同じ困りごとを解決した事例</p>
            <div className="mt-2 border-t border-line2">{rows(sample.similar)}</div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        ※サンプルは「金属加工の中小メーカー」という架空のプロフィールで実際の選定ロジックを動かした結果です。事例はすべて実在の掲載事例で、リンクから読めます。
      </p>
    </section>
  );
}
