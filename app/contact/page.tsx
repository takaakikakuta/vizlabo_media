import Link from "next/link";
import { siteStats } from "../../lib/cases";
import { ListHead } from "../../components/CaseGrid";
import ContactForm from "../../components/ContactForm";

export const metadata = {
  title: "掲載のお問い合わせ",
  description:
    "自社の導入事例を事例ナビに掲載したい企業さま向けの窓口です。掲載のご依頼、事例制作のご相談、掲載内容の修正・削除のご依頼を受け付けています。",
};

export default async function ContactPage({ searchParams }:
  { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const s = siteStats();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <ListHead eyebrow="掲載のお問い合わせ" title="自社の事例を掲載する"
        sub={`「同じ課題を、他社は何で解決したのか」を探している買い手に、自社の解決事例を届けられます。現在 ${s.total} 件 / ${s.vendors} 社を掲載中です。`} />

      {/* 掲載までの流れ＝送信前に何が起きるか分かるようにする */}
      <section className="mb-12">
        <p className="label mb-4 flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />掲載までの流れ</p>
        <ol className="border-t border-line">
          {[
            ["お問い合わせ", "このフォームから、掲載したい事例のURLや概要をお送りください。"],
            ["内容の確認", "掲載基準（課題・打ち手・成果が読み取れること）を満たすか確認し、2〜3営業日でご返信します。"],
            ["要約の作成", "こちらで〈課題 → 打ち手 → 成果〉の要約を作成し、掲載前に内容をご確認いただきます。"],
            ["掲載", "出典として貴社ページへリンクします。掲載後の修正・削除もこの窓口で承ります。"],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-5 border-b border-line2 py-4">
              <span className="num shrink-0 pt-1 text-[12px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="font-display text-[15.5px] text-ink">{t}</div>
                <p className="mt-1.5 text-[13px] leading-[1.9] text-body">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-[12px] leading-relaxed text-muted">
          掲載は無料です。本文の転載はせず、要約と出典リンクの形で掲載します。
          取材・執筆から依頼したい場合は<Link href="/produce" className="border-b border-line no-underline hover:border-ink hover:text-ink">事例制作代行</Link>もご覧ください。
        </p>
      </section>

      <section>
        <p className="label mb-4 flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />お問い合わせフォーム</p>
        <ContactForm topic={topic} />
      </section>
    </div>
  );
}
