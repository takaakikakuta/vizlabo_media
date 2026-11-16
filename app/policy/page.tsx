import Link from "next/link";

/* 掲載ポリシー。掲載企業（ベンダー・導入企業）に「何を、どう載せているか」「修正・削除はどう頼むか」を示すページ。
   掲載通知の文面からもここへ案内する。文面を変えたら「制定・改定日」も更新すること。 */

export const metadata = {
  title: "掲載ポリシー",
  description:
    "事例マニアが導入事例を掲載するときの考え方です。掲載する内容、事例の選び方、修正・削除のご依頼方法、運営者情報をまとめています。",
};

const LINK = "underline hover:text-ink";

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "1. 事例マニアとは",
    body: (
      <>
        <p>事例マニア（vizlabo.com）は、各社が公開しているBtoBの導入事例を、課題別に探せるデータベースです。</p>
        <p className="mt-3">
          課題を抱える企業の担当者が、自社に近い事例を見つけ、出典である各社の事例ページにたどり着けるようにすることを目的としています。
        </p>
      </>
    ),
  },
  {
    heading: "2. 掲載している内容",
    body: (
      <>
        <p>掲載するのは、編集部が作成した要約と、出典ページへのリンクです。</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>対象は、各社が自社サイトなどで一般に公開している導入事例に限ります</li>
          <li>出典の本文は転載しません。詳しい内容は、出典ページでお読みいただく形にしています</li>
          <li>社名・数値・成果は出典の記載に従い、編集部で数字を加えたり書き換えたりしません</li>
          <li>すべての事例に、出典ページへのリンクを設置します</li>
        </ul>
      </>
    ),
  },
  {
    heading: "3. 事例の選び方",
    body: (
      <>
        <p>事例の選定は編集部が行い、データベースへの掲載に費用はいただいていません。</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>選定の基準は、課題・打ち手・成果が具体的に書かれていることです</li>
          <li>「事例セレクション」では、同じ課題に対して打ち手や条件が異なる事例を並べ、読者が選択肢を比べられるようにしています</li>
          <li>広告・スポンサー枠を設ける場合は、該当箇所に「PR」「スポンサー」と明記します</li>
        </ul>
      </>
    ),
  },
  {
    heading: "4. 修正・削除のご依頼",
    body: (
      <>
        <p>
          修正・削除のご依頼は、理由を問わずお受けします。
          <Link href="/contact?topic=correction" className={LINK}>お問い合わせフォーム</Link>
          からご連絡ください。
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>事例を公開している企業、事例に登場する企業のどちらからのご依頼も受け付けます</li>
          <li>削除のご依頼：要約と画像を削除し、出典ページへのリンクのみを残します</li>
          <li>今後の掲載を望まない場合：その旨をお知らせいただければ、以後の選定対象から外します</li>
          <li>内容の誤り：ご指摘の箇所を出典と照らし合わせて修正します</li>
          <li>対応の目安：原則3営業日以内に対応します</li>
        </ul>
      </>
    ),
  },
  {
    heading: "5. 掲載企業の皆さまへ",
    body: (
      <>
        <p>掲載ページは、貴社のサイトやSNSでご自由にご紹介ください。</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>「事例セレクション」に選出した際は、お問い合わせフォームなどから掲載のご報告をお送りすることがあります</li>
          <li>
            ほかの事例の追加掲載や、掲載内容の差し替えのご希望も
            <Link href="/contact" className={LINK}>お問い合わせフォーム</Link>
            で受け付けています
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "6. 運営者情報",
    body: (
      <dl className="grid grid-cols-[7em_1fr] gap-x-4 gap-y-2">
        <dt className="text-muted">サイト名</dt>
        <dd>事例マニア（運営：Vizlabo）</dd>
        <dt className="text-muted">運営責任者</dt>
        <dd>角田崇明</dd>
        <dt className="text-muted">所在地</dt>
        <dd>東京都渋谷区</dd>
        <dt className="text-muted">連絡先</dt>
        <dd>
          <Link href="/contact" className={LINK}>お問い合わせフォーム</Link>
        </dd>
      </dl>
    ),
  },
];

export default function PolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />Listing Policy</p>
      <h1 className="font-display mt-4 text-[26px] leading-[1.5] text-ink">掲載ポリシー</h1>
      <p className="mt-4 text-[13.5px] leading-[1.95] text-body">
        事例マニア（以下「当サイト」）が、導入事例をどのように掲載しているかをまとめたページです。
      </p>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="border-b border-line pb-2.5 text-[15px] font-bold text-ink">{s.heading}</h2>
            <div className="mt-4 text-[13.5px] leading-[1.95] text-body">{s.body}</div>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-line pt-5 text-[11.5px] text-muted">
        サイト公開: 2026年9月 ／ 制定: 2026年11月16日
      </p>
    </div>
  );
}
